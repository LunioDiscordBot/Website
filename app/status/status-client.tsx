'use client';

import { useEffect, useMemo, useState } from 'react';
import { ThinkingOrb } from '@/components/thinking-orb';
import { ListSkeleton } from '@/components/loading-skeleton';
import {
	apiJson,
	formatCompactNumber,
	formatUptime,
	withBotQuery,
	type BotInstance,
	type FrontendEvent,
	type StatsResponse,
	type StatusResponse,
	type StatusInstance,
} from '@/lib/api';

type StatusState = {
	stats: StatsResponse | null;
	instances: StatusInstance[];
	status: StatusResponse | null;
	error: string | null;
};

type FeedItem = {
	id: string;
	label: string;
	title: string;
	body: string;
};

const BOT_STORAGE_KEY = 'lunio:web:botId';

const WARNING_SHARD_STATUSES = new Set(['connecting', 'identifying', 'resuming', 'waiting_for_guilds', 'reconnecting', 'nearly']);

const TONE_DOT = {
	ok: 'bg-success',
	warn: 'bg-amber-400',
	down: 'bg-danger',
	idle: 'bg-muted',
} as const;

type Tone = keyof typeof TONE_DOT;

const getShardTone = (status: BotInstance['shards'][number]['status']): Tone => {
	if (status === 'ready') return 'ok';
	if (WARNING_SHARD_STATUSES.has(status)) return 'warn';
	return 'down';
};

const getInstanceHealth = (instance: StatusInstance) => instance.health;

const getHealthTone = (label: string): Tone => {
	if (label === 'Operational') return 'ok';
	if (label === 'Recovering') return 'warn';
	if (label === 'Degraded' || label === 'Offline') return 'down';
	if (label === 'Unknown') return 'warn';
	return 'idle';
};

const HEALTH_HEADLINE: Record<string, string> = {
	Operational: 'All systems operational',
	Recovering: 'Some shards are reconnecting',
	Degraded: 'Degraded performance',
	Offline: 'All monitored bots are offline',
	Unknown: 'Status unavailable',
};

function StatusBadge({ label }: { label: string }) {
	return (
		<span className="dash-badge">
			<span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[getHealthTone(label)]}`} />
			{label}
		</span>
	);
}

const formatLatency = (value: number | null | undefined) => {
	if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
	return `${Math.round(value)}ms`;
};

const formatExactNumber = (value: number | null | undefined) => {
	if (typeof value !== 'number' || Number.isNaN(value)) return '--';
	return new Intl.NumberFormat('en').format(value);
};

export function StatusClient() {
	const [state, setState] = useState<StatusState>({
		stats: null,
		instances: [],
		status: null,
		error: null,
	});
	const [isInitialLoading, setIsInitialLoading] = useState(true);
	const botOptions = state.status?.bots ?? [];
	const [selectedBotId, setSelectedBotId] = useState('');
	const [selectedInstanceId, setSelectedInstanceId] = useState('');
	const [realtimeFeed, setRealtimeFeed] = useState<FeedItem[]>([]);

	// Keep the bot filter in the URL (?bot=) so filtered views can be shared and survive reloads.
	const selectBot = (botId: string) => {
		try {
			if (botId) window.localStorage.setItem(BOT_STORAGE_KEY, botId);
			else window.localStorage.removeItem(BOT_STORAGE_KEY);
		} catch {}
		const url = new URL(window.location.href);
		if (botId) url.searchParams.set('bot', botId);
		else url.searchParams.delete('bot');
		window.history.replaceState(null, '', url);
		setSelectedBotId(botId);
	};

	useEffect(() => {
		const botIdFromUrl = new URLSearchParams(window.location.search).get('bot');
		// Public status starts with the whole fleet unless the URL explicitly filters it.
		setSelectedBotId(botIdFromUrl ?? '');
	}, []);

	useEffect(() => {
		let active = true;

		let loading = false;
		setIsInitialLoading(true);
		setState((current) => ({ ...current, stats: null, instances: [], error: null }));
		const load = async () => {
			if (loading) return;
			loading = true;
			try {
				const status = await apiJson<StatusResponse>(withBotQuery('/api/status', selectedBotId || null), { signal: AbortSignal.timeout(15000) });
				if (!active) return;
				setState({ stats: status.stats, instances: status.instances, status, error: null });
			} catch (error) {
				if (!active) return;
				setState((current) => ({ ...current, stats: null, instances: [], error: error instanceof Error ? error.message : 'Unable to load status' }));
			} finally {
				loading = false;
				if (active) setIsInitialLoading(false);
			}
		};

		void load();
		const interval = window.setInterval(() => {
			if (document.visibilityState === 'visible') void load();
		}, 10000);

		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') void load();
		};
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			active = false;
			window.clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}, [selectedBotId]);

	useEffect(() => {
		setRealtimeFeed([]);
		const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
		const socket = new WebSocket(apiBaseUrl.replace(/^http/i, 'ws'));

		socket.addEventListener('message', (event) => {
			try {
				const payload = JSON.parse(event.data) as FrontendEvent;
				if ('botId' in payload && selectedBotId && payload.botId !== selectedBotId) return;

				if (payload.type === 'SHARD_STATE_UPDATE') {
					const eventLabel =
						payload.event === 'disconnect' || payload.event === 'death' ? 'Alert' : payload.event === 'resume' || payload.event === 'ready' ? 'Recovery' : 'Shard';
					const eventTitle = `Shard ${payload.shard.shardId} ${payload.event}`;
					const eventBody = `${payload.instanceId} is now ${payload.shard.status} at ${formatLatency(payload.shard.latency)} latency.`;
					setRealtimeFeed((current) =>
						[
							{
								id: `${payload.botId}:${payload.instanceId}:${payload.shard.shardId}:${payload.timestamp}`,
								label: eventLabel,
								title: eventTitle,
								body: eventBody,
							},
							...current,
						].slice(0, 5)
					);
				}
			} catch {}
		});

		return () => socket.close();
	}, [selectedBotId]);

	useEffect(() => {
		if (!state.instances.length) {
			setSelectedInstanceId('');
			return;
		}

		const stillExists = state.instances.some((instance) => `${instance.botId}:${instance.instanceId}` === selectedInstanceId);
		if (!stillExists) {
			setSelectedInstanceId(`${state.instances[0].botId}:${state.instances[0].instanceId}`);
		}
	}, [state.instances, selectedInstanceId]);

	const selectedInstance = useMemo(
		() => state.instances.find((instance) => `${instance.botId}:${instance.instanceId}` === selectedInstanceId) ?? state.instances[0] ?? null,
		[state.instances, selectedInstanceId]
	);

	const averageLatency = useMemo(() => {
		const instances = state.instances.filter((instance) => instance.health !== 'Offline' && Number.isFinite(instance.latency) && instance.latency >= 0);
		if (!instances.length) return null;
		return Math.round(instances.reduce((sum, instance) => sum + instance.latency, 0) / instances.length);
	}, [state.instances]);

	const globalHealth = state.error || isInitialLoading ? 'Unknown' : (state.status?.health ?? 'Unknown');
	const visibleBots = botOptions.filter((bot) => !selectedBotId || bot.botId === selectedBotId);
	const headline =
		selectedBotId && visibleBots.length === 1 && !state.error
			? `${visibleBots[0].label}: ${globalHealth.toLowerCase()}`
			: globalHealth === 'Degraded' && visibleBots.some((bot) => bot.health === 'Offline')
				? 'Some bots are offline'
				: (HEALTH_HEADLINE[globalHealth] ?? globalHealth);

	const liveFeedItems = useMemo(() => {
		// Current outages remain visible even if an older recovery event was received.
		if (!state.instances.length) return [];
		return [
			...[...state.instances]
				.sort((left, right) => Number(left.health === 'Operational') - Number(right.health === 'Operational'))
				.flatMap((instance) => {
					const health = getInstanceHealth(instance);
					const reconnecting = instance.shards.filter(
						(shard) => shard.status === 'reconnecting' || shard.status === 'identifying' || shard.status === 'resuming' || shard.status === 'waiting_for_guilds'
					);
					const disconnected = instance.shards.filter((shard) => shard.status === 'disconnected' || shard.status === 'idle');

					return [
						{
							id: `${instance.botId}:${instance.instanceId}:health`,
							label: health,
							title: `${instance.instanceId} ${health.toLowerCase()}`,
							body: instance.reason,
						},
						...(reconnecting.length && health !== 'Offline'
							? [
									{
										id: `${instance.botId}:${instance.instanceId}:recovering`,
										label: 'Recovery',
										title: `${reconnecting.length} shard${reconnecting.length === 1 ? '' : 's'} recovering`,
										body: `${instance.instanceId} is actively resuming shard sessions.`,
									},
								]
							: []),
						...(disconnected.length && health !== 'Offline'
							? [
									{
										id: `${instance.botId}:${instance.instanceId}:degraded`,
										label: 'Alert',
										title: `${disconnected.length} shard${disconnected.length === 1 ? '' : 's'} offline`,
										body: `${instance.instanceId} has shard loss and should be watched closely.`,
									},
								]
							: []),
					];
				}),
			...realtimeFeed,
		];
	}, [realtimeFeed, state.instances]);

	const globalTone = getHealthTone(globalHealth);
	const summaryStats = [
		{ label: 'Servers', value: formatExactNumber(state.stats?.totalGuilds) },
		{ label: 'Users', value: formatCompactNumber(state.stats?.totalUsers) },
		{ label: 'Active players', value: formatCompactNumber(state.stats?.totalPlayers) },
		{ label: 'Average latency', value: formatLatency(averageLatency) },
		{ label: 'Shards', value: formatExactNumber(state.stats?.totalShards) },
	];

	return (
		<div className="grid gap-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl">System Status</h1>
					<p className="mt-3 max-w-2xl text-base leading-7 text-muted">Live health for every Lunio instance: shards, latency, and player load.</p>
				</div>
				{botOptions.length > 1 ? (
					<div aria-label="Filter by bot" className="flex flex-wrap gap-1.5" role="group">
						<button aria-pressed={!selectedBotId} className="dash-btn h-8 px-3" onClick={() => selectBot('')} type="button">
							All Bots
						</button>
						{botOptions.map((bot) => (
							<button aria-pressed={selectedBotId === bot.botId} className="dash-btn h-8 px-3" key={bot.botId} onClick={() => selectBot(bot.botId)} type="button">
								{bot.label}
							</button>
						))}
					</div>
				) : null}
			</div>

			<section aria-live="polite" className="dash-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
				<div className="flex items-center gap-3">
					{isInitialLoading ? (
						<ThinkingOrb />
					) : (
						<span className={`relative flex h-3 w-3 shrink-0 rounded-full ${TONE_DOT[globalTone]}`}>
							{globalTone === 'ok' ? <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-success/60" /> : null}
						</span>
					)}
					<div>
						<h2 className="text-lg font-semibold">{isInitialLoading ? 'Checking status…' : headline}</h2>
						{state.error ? <p className="mt-0.5 text-sm text-danger">{state.error}</p> : null}
					</div>
				</div>
				<p className="text-sm text-muted">Checks every 10&nbsp;s · heartbeat timeout 90&nbsp;s</p>
			</section>

			{visibleBots.length ? (
				<section aria-label="Bot health" className="grid gap-4 sm:grid-cols-2">
					{visibleBots.map((bot) => (
						<div className="dash-card p-5" key={bot.botId}>
							<div className="flex items-center justify-between gap-3">
								<h2 className="font-semibold" translate="no">
									{bot.label}
								</h2>
								<StatusBadge label={isInitialLoading || state.error ? 'Unknown' : bot.health} />
							</div>
							<p className="mt-2 text-sm text-muted">{isInitialLoading ? 'Checking bot health…' : state.error ? 'Unable to verify current health.' : bot.reason}</p>
						</div>
					))}
				</section>
			) : null}

			<dl className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
				{summaryStats.map((stat) => (
					<div className="dash-card p-5" key={stat.label}>
						<dt className="text-sm text-muted">{stat.label}</dt>
						<dd className="mt-2 font-headline text-2xl font-bold tabular-nums">
							{isInitialLoading ? (
								<>
									<span className="sr-only">Loading...</span>
									<span aria-hidden="true" className="skeleton block h-8 w-20" />
								</>
							) : (
								stat.value
							)}
						</dd>
					</div>
				))}
			</dl>

			<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
				<section aria-labelledby="instances-heading" className="grid gap-3">
					<div className="flex items-baseline justify-between gap-3">
						<h2 className="text-base font-semibold" id="instances-heading">
							Instances
						</h2>
						<span className="text-sm text-muted">Select one to see its shards</span>
					</div>

					{!state.error && state.instances.length === 0 ? (
						isInitialLoading ? (
							<ListSkeleton action artwork={false} label="Loading instances..." rows={3} />
						) : (
							<div className="dash-card px-5 py-8 text-sm text-muted">No instances are reporting right now.</div>
						)
					) : null}

					{state.instances.map((instance) => {
						const instanceKey = `${instance.botId}:${instance.instanceId}`;
						const health = getInstanceHealth(instance);
						const selected = selectedInstance ? `${selectedInstance.botId}:${selectedInstance.instanceId}` === instanceKey : false;
						const warningCount = instance.health === 'Offline' ? 0 : instance.shards.filter((shard) => WARNING_SHARD_STATUSES.has(shard.status)).length;
						const dangerCount =
							instance.health === 'Offline'
								? Math.max(1, instance.shards.length)
								: instance.shards.filter((shard) => shard.status === 'disconnected' || shard.status === 'idle').length;

						return (
							<button
								aria-pressed={selected}
								className={`dash-card w-full p-5 text-left transition-colors duration-150 hover:border-[var(--dash-border-strong)] ${selected ? 'border-primary/50 ring-1 ring-primary/30' : ''}`}
								key={instanceKey}
								onClick={() => setSelectedInstanceId(instanceKey)}
								type="button"
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="truncate text-base font-semibold" translate="no">
											{instance.instanceId}
										</div>
										<div className="mt-0.5 truncate text-sm text-muted">
											<span translate="no">{instance.botId}</span> · {instance.region}
										</div>
									</div>
									<div className="flex flex-wrap gap-1.5">
										<StatusBadge label={health} />
										<span className="dash-badge tabular-nums">{instance.health === 'Offline' ? '--' : formatLatency(instance.latency)}</span>
									</div>
								</div>
								<p className="mt-3 text-sm text-muted">{instance.reason}</p>
								<dl className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3 text-sm sm:grid-cols-6">
									{[
										['Servers', formatCompactNumber(instance.guildCount)],
										['Users', formatCompactNumber(instance.userCount)],
										['Players', formatCompactNumber(instance.playerCount)],
										['Memory', `${formatCompactNumber(instance.memoryMB)} MB`],
										['Shards', String(instance.shards.length)],
										['Issues', String(warningCount + dangerCount)],
									].map(([label, value]) => (
										<div key={label}>
											<dt className="text-xs text-muted">{label}</dt>
											<dd className="mt-0.5 font-medium tabular-nums">
												{instance.health === 'Offline' && label !== 'Issues' && label !== 'Shards' ? '--' : value}
											</dd>
										</div>
									))}
								</dl>
							</button>
						);
					})}
				</section>

				<aside aria-labelledby="events-heading" className="dash-card">
					<h2 className="px-5 py-4 text-base font-semibold" id="events-heading">
						Recent Events
					</h2>
					{liveFeedItems.length ? (
						<ol aria-live="polite" className="dash-divider border-t">
							{liveFeedItems.slice(0, 5).map((item) => (
								<li className="dash-divider border-b px-5 py-3.5 last:border-b-0" key={item.id}>
									<div className="flex items-center gap-2 text-xs font-medium text-muted">
										<span
											aria-hidden="true"
											className={`h-1.5 w-1.5 rounded-full ${
												item.label === 'Alert' || item.label === 'Degraded' || item.label === 'Offline'
													? TONE_DOT.down
													: item.label === 'Recovery' || item.label === 'Recovering' || item.label === 'Unknown'
														? TONE_DOT.warn
														: TONE_DOT.ok
											}`}
										/>
										{item.label}
									</div>
									<div className="mt-1 text-sm font-medium">{item.title}</div>
									<p className="mt-0.5 break-words text-sm text-muted">{item.body}</p>
								</li>
							))}
						</ol>
					) : (
						<p className="dash-divider border-t px-5 py-8 text-sm text-muted">Waiting for instances to connect to the broker.</p>
					)}
				</aside>
			</div>

			<section aria-labelledby="shards-heading" className="grid gap-3">
				<div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
					<h2 className="text-base font-semibold" id="shards-heading">
						{selectedInstance ? (
							<>
								Shards · <span translate="no">{selectedInstance.instanceId}</span>
							</>
						) : (
							'Shards'
						)}
					</h2>
					{selectedInstance && selectedInstance.health !== 'Offline' ? (
						<span className="text-sm text-muted">
							{formatExactNumber(selectedInstance.guildCount)} servers · {formatCompactNumber(selectedInstance.userCount)} users · up{' '}
							{formatUptime(selectedInstance.uptimeMs)}
						</span>
					) : null}
				</div>

				{!selectedInstance ? (
					<div className="dash-card px-5 py-8 text-sm text-muted">Select an instance above to see its shards.</div>
				) : (
					<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{selectedInstance.shards.map((shard) => (
							<li className="dash-card p-4" key={shard.shardId}>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2">
										<span
											aria-hidden="true"
											className={`h-2 w-2 rounded-full ${TONE_DOT[selectedInstance.health === 'Offline' ? 'down' : getShardTone(shard.status)]}`}
										/>
										<span className="text-sm font-semibold">Shard {shard.shardId}</span>
									</div>
									<span className="text-xs tabular-nums text-muted">{selectedInstance.health === 'Offline' ? '--' : formatLatency(shard.latency)}</span>
								</div>
								<div className="mt-1 text-xs capitalize text-muted">{selectedInstance.health === 'Offline' ? 'Offline' : shard.status.replace(/_/g, ' ')}</div>
								<dl className="dash-divider mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-sm">
									{[
										['Servers', formatExactNumber(shard.guildCount)],
										['Users', formatCompactNumber(shard.userCount)],
										['Players', formatCompactNumber(shard.playerCount)],
										['Uptime', formatUptime(shard.uptimeMs)],
									].map(([label, value]) => (
										<div key={label}>
											<dt className="text-xs text-muted">{label}</dt>
											<dd className="font-medium tabular-nums">{selectedInstance.health === 'Offline' ? '--' : value}</dd>
										</div>
									))}
								</dl>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
