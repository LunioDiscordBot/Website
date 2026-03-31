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

export function middleware(request: NextRequest) {
	const requestHost = request.headers.get('host');
	if (!requestHost) {
		return NextResponse.next();
	}

	const dashboardBaseUrl = getDashboardBaseUrl();
	const publicBaseUrl = getPublicBaseUrl();

	let dashboardHost = '';
	let publicHost = '';

	try {
		dashboardHost = new URL(dashboardBaseUrl).host;
		publicHost = new URL(publicBaseUrl).host;
	} catch {
		return NextResponse.next();
	}

	if (dashboardHost === publicHost) {
		return NextResponse.next();
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

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
