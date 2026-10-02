const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function load(filename, env = {}) {
	const exports = {};
	const source = ts.transpileModule(readFileSync(path.join(__dirname, '..', filename), 'utf8'), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
	}).outputText;
	vm.runInNewContext(source, { exports, require, Buffer, Headers, URL, crypto: webcrypto, process: { env } });
	return exports;
}

function getMiddleware(env = {}) {
	return load('middleware.ts', {
		NODE_ENV: 'production',
		APP_BASE_URL: 'https://dashboard.luniobot.com',
		PUBLIC_SITE_URL: 'https://luniobot.com',
		NEXT_PUBLIC_API_BASE_URL: 'https://api.luniobot.com',
		...env,
	}).middleware;
}

test('production uses fresh nonces and forwards the same policy to rendering', () => {
	const middleware = getMiddleware();
	const request = new NextRequest('https://luniobot.com/', { headers: { host: 'luniobot.com', 'x-nonce': 'untrusted' } });
	const first = middleware(request);
	const second = middleware(request);
	const csp = first.headers.get('content-security-policy');
	const nonce = first.headers.get('x-middleware-request-x-nonce');
	assert.notEqual(nonce, 'untrusted');
	assert.notEqual(nonce, second.headers.get('x-middleware-request-x-nonce'));
	assert.ok(csp.includes(`'nonce-${nonce}'`));
	assert.equal(csp, first.headers.get('x-middleware-request-content-security-policy'));
	const scripts = csp.split('; ').find((directive) => directive.startsWith('script-src '));
	assert.ok(scripts.includes("'strict-dynamic'"));
	assert.ok(!scripts.includes('unsafe-inline'));
	assert.ok(!scripts.includes('unsafe-eval'));
	for (const directive of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"]) {
		assert.ok(csp.includes(directive));
	}
});

test('API and WebSocket allowlist follows the configured origin, not URL paths', () => {
	const middleware = getMiddleware({ NEXT_PUBLIC_API_BASE_URL: 'https://backend.example:8443/v1/' });
	const csp = middleware(new NextRequest('https://luniobot.com/')).headers.get('content-security-policy');
	assert.ok(csp.includes("connect-src 'self' https://backend.example:8443 wss://backend.example:8443"));
	assert.ok(!csp.includes('/v1/'));
	assert.ok(!csp.includes('localhost'));
});

test('local API and development hot reload remain permitted', () => {
	const middleware = getMiddleware({ NODE_ENV: 'development', NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3000' });
	const csp = middleware(new NextRequest('http://localhost:3002/')).headers.get('content-security-policy');
	assert.ok(csp.includes("'unsafe-eval'"));
	assert.ok(csp.includes('http://localhost:3000 ws://localhost:3000'));
	assert.ok(csp.includes('ws://localhost:*'));
	assert.ok(!csp.includes('upgrade-insecure-requests'));
});

test('public/dashboard redirects retain their destination, query, and CSP', () => {
	const middleware = getMiddleware();
	const publicResponse = middleware(new NextRequest('https://luniobot.com/login?next=%2Fredeem', { headers: { host: 'luniobot.com' } }));
	assert.equal(publicResponse.status, 307);
	assert.equal(publicResponse.headers.get('location'), 'https://dashboard.luniobot.com/login?next=%2Fredeem');
	assert.ok(publicResponse.headers.get('content-security-policy'));
	const dashboardResponse = middleware(new NextRequest('https://dashboard.luniobot.com/commands', { headers: { host: 'dashboard.luniobot.com' } }));
	assert.equal(dashboardResponse.headers.get('location'), 'https://luniobot.com/commands');
});

test('one-origin deployments and unrecognized hosts still forward the nonce', () => {
	const middleware = getMiddleware({ APP_BASE_URL: 'http://localhost:3002', PUBLIC_SITE_URL: 'http://localhost:3002' });
	const response = middleware(new NextRequest('http://localhost:3002/login', { headers: { host: 'localhost:3002' } }));
	assert.equal(response.status, 200);
	assert.ok(response.headers.get('x-middleware-request-x-nonce'));
});

test('baseline headers protect all paths without changing HSTS', async () => {
	const config = load('next.config.ts').default;
	assert.equal(config.poweredByHeader, false);
	const rules = await config.headers();
	assert.equal(rules[0].source, '/:path*');
	const headers = Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]));
	assert.equal(headers['X-Content-Type-Options'], 'nosniff');
	assert.equal(headers['X-Frame-Options'], 'DENY');
	assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
	assert.ok(!headers['Strict-Transport-Security']);
});
