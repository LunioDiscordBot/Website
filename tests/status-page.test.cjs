const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');
const api = { formatCompactNumber: String, formatUptime: String, withBotQuery: (path) => path };

function render(status, { error = null, selectedBotId = '', selectedInstanceId = '', loading = false } = {}) {
	let hook = 0;
	const states = [{ stats: error ? null : status.stats, instances: error ? [] : status.instances, status, error }, loading, selectedBotId, selectedInstanceId, []];
	const exports = {};
	const source = ts.transpileModule(readFileSync(path.join(__dirname, '../app/status/status-client.tsx'), 'utf8'), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
	}).outputText;
	const mocks = {
		react: { useState: () => [states[hook++], () => {}], useMemo: (fn) => fn(), useEffect: () => {} },
		'@/lib/api': api,
		'@/components/thinking-orb': { ThinkingOrb: () => null },
		'@/components/loading-skeleton': { ListSkeleton: () => null },
	};
	vm.runInNewContext(source, { exports, require: (name) => mocks[name] ?? require(name) });
	return renderToStaticMarkup(exports.StatusClient());
}

const report = (botId, health) => ({
	botId,
	instanceId: 'cluster-0',
	health,
	reason: health === 'Offline' ? 'Disconnected from the broker.' : 'All Discord shards are ready.',
	latency: 10,
	guildCount: 1,
	userCount: 10,
	playerCount: 1,
	memoryMB: 100,
	uptimeMs: 1000,
	shards: [{ shardId: 0, status: 'ready', latency: 10, guildCount: 1, userCount: 10, playerCount: 1, uptimeMs: 1000 }],
});
const snapshot = (health = 'Degraded') => ({
	health,
	bots: [
		{ botId: 'lunio', label: 'Lunio', health: 'Operational', reason: 'All instances are operational.' },
		{ botId: 'lunio2', label: 'Lunio 2', health: 'Offline', reason: 'Disconnected from the broker.' },
	],
	instances: [report('lunio', 'Operational'), report('lunio2', 'Offline')],
	stats: { totalGuilds: 1, totalUsers: 10, totalPlayers: 1, totalShards: 1 },
});

test('offline bots remain visible and the page does not claim all systems are operational', () => {
	const html = render(snapshot());
	assert.ok(html.includes('Some bots are offline'));
	assert.ok(html.includes('Lunio 2'));
	assert.ok(html.includes('Disconnected from the broker.'));
	assert.ok(!html.includes('All systems operational'));
	// Selecting an offline instance must not display its last-known ready shard as healthy.
	const offlineHtml = render(snapshot(), { selectedInstanceId: 'lunio2:cluster-0' });
	assert.ok(!offlineHtml.includes('>ready</div>'));
	assert.ok(offlineHtml.includes('>Offline</div>'));
});

test('a never-connected bot is still shown even with no instance card', () => {
	const status = snapshot();
	status.instances = [status.instances[0]];
	status.bots[1].reason = 'No instance is reporting for this bot.';
	const html = render(status);
	assert.ok(html.includes('Some bots are offline'));
	assert.ok(html.includes('No instance is reporting for this bot.'));
});

test('API failure overrides a previous green snapshot and its bot badges', () => {
	const html = render(snapshot('Operational'), { error: 'Unable to load status' });
	assert.ok(html.includes('Status unavailable'));
	assert.ok(html.includes('Unable to verify current health.'));
	assert.ok(!html.includes('All systems operational'));
	assert.ok(!html.includes('bg-success'));
});

test('a healthy filtered bot names its scope while the other bot remains offline', () => {
	const status = snapshot('Operational');
	status.instances = [status.instances[0]];
	const html = render(status, { selectedBotId: 'lunio' });
	assert.ok(html.includes('Lunio: operational'));
	assert.ok(!html.includes('All systems operational'));
});

test('the all-operational headline requires an operational fleet snapshot', () => {
	const status = snapshot('Operational');
	status.bots[1].health = 'Operational';
	status.instances[1] = report('lunio2', 'Operational');
	assert.ok(render(status).includes('All systems operational'));
	assert.ok(!render(status, { loading: true }).includes('All systems operational'));
});
