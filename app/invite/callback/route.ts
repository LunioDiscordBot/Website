import { NextResponse } from 'next/server';

import { buildDashboardPath } from '@/lib/dashboard-routes';

function decodeState(rawState: string | null) {
	if (!rawState) return null;

	try {
		const parsed = JSON.parse(rawState) as {
			botId?: string;
			guildId?: string;
		};

		if (!parsed?.botId || !parsed?.guildId) {
			return null;
		}

		return {
			botId: parsed.botId,
			guildId: parsed.guildId,
		};
	} catch {
		return null;
	}
}

export async function GET(request: Request) {
	const url = new URL(request.url);

	// Resolve the public-facing origin the same way the invite route does.
	// request.url is the internal Next.js URL (localhost) when behind a reverse
	// proxy, so we must use x-forwarded-* headers to get the real origin.
	const forwardedHost = request.headers.get('x-forwarded-host');
	const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
	const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
	const appBaseUrl = forwardedOrigin || process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_DASHBOARD_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || url.origin;

	const state = decodeState(url.searchParams.get('state'));
	const error = url.searchParams.get('error');

	if (!state || error) {
		return NextResponse.redirect(new URL('/servers', appBaseUrl));
	}

	return NextResponse.redirect(new URL(buildDashboardPath(state.botId, state.guildId), appBaseUrl));
}
