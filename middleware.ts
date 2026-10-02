import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function getDashboardBaseUrl() {
	return process.env.APP_BASE_URL ?? 'https://dashboard.luniobot.com';
}

function getPublicBaseUrl() {
	const configured = process.env.PUBLIC_SITE_URL;
	if (configured) {
		return configured;
	}

	try {
		const dashboardUrl = new URL(getDashboardBaseUrl());
		const publicHost = dashboardUrl.hostname.replace(/^dashboard\./, '');
		return `${dashboardUrl.protocol}//${publicHost}`;
	} catch {
		return 'https://luniobot.com';
	}
}

function buildRedirectUrl(baseUrl: string, pathname: string, search: string) {
	const url = new URL(pathname, baseUrl);
	if (search) {
		url.search = search;
	}
	return url;
}

const dashboardOnlyPrefixes = ['/dashboard', '/servers', '/login', '/settings', '/invite'];
const publicOnlyPaths = new Set(['/', '/commands', '/status', '/tos', '/privacy', '/withdrawal']);

function routeRequest(request: NextRequest, requestHeaders: Headers) {
	const next = () => NextResponse.next({ request: { headers: requestHeaders } });
	const requestHost = request.headers.get('host');
	if (!requestHost) {
		return next();
	}

	const dashboardBaseUrl = getDashboardBaseUrl();
	const publicBaseUrl = getPublicBaseUrl();

	let dashboardHost = '';
	let publicHost = '';

	try {
		dashboardHost = new URL(dashboardBaseUrl).host;
		publicHost = new URL(publicBaseUrl).host;
	} catch {
		return next();
	}

	if (dashboardHost === publicHost) {
		return next();
	}

	const { pathname, search } = request.nextUrl;
	const isDashboardHost = requestHost === dashboardHost;
	const isPublicHost = requestHost === publicHost;
	const isDashboardPath = dashboardOnlyPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

	if (isDashboardHost) {
		if (pathname === '/') {
			return NextResponse.redirect(buildRedirectUrl(dashboardBaseUrl, '/servers', search));
		}

		if (publicOnlyPaths.has(pathname)) {
			return NextResponse.redirect(buildRedirectUrl(publicBaseUrl, pathname, search));
		}
	}

	if (isPublicHost && isDashboardPath) {
		return NextResponse.redirect(buildRedirectUrl(dashboardBaseUrl, pathname, search));
	}

	return next();
}

export function middleware(request: NextRequest) {
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
	const isDevelopment = process.env.NODE_ENV === 'development';
	const apiUrl = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000');
	const socketUrl = new URL(apiUrl.origin);
	socketUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
	const connectSources = ["'self'", apiUrl.origin, socketUrl.origin];
	if (isDevelopment) {
		connectSources.push('ws://localhost:*', 'ws://127.0.0.1:*');
	}
	const csp = [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
		// The player, skeletons, and theme use dynamic inline styles, not inline scripts.
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' https: data: blob:",
		"font-src 'self'",
		`connect-src ${connectSources.join(' ')}`,
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	].join('; ');
	const requestHeaders = new Headers(request.headers);
	// Next.js reads the request CSP to nonce its own scripts during server rendering.
	requestHeaders.set('x-nonce', nonce);
	requestHeaders.set('Content-Security-Policy', csp);
	const response = routeRequest(request, requestHeaders);
	response.headers.set('Content-Security-Policy', csp);
	return response;
}

export const config = {
	matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
