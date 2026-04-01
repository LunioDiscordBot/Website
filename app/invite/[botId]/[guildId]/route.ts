import { NextResponse } from 'next/server';

import { getBotInviteUrl } from '@/lib/bot-invite';

type RouteContext = {
	params: Promise<{
		botId: string;
		guildId: string;
	}>;
};

export async function GET(_request: Request, context: RouteContext) {
	const { botId, guildId } = await context.params;
	const forwardedHost = _request.headers.get('x-forwarded-host');
	const forwardedProto = _request.headers.get('x-forwarded-proto') || 'https';
	const requestUrl = new URL(_request.url);
	const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
	const requestOrigin = forwardedOrigin || requestUrl.origin;
	const appBaseUrl =
		requestOrigin || process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_DASHBOARD_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL;
	const callbackUrl = new URL('/invite/callback', appBaseUrl);
	const state = JSON.stringify({ botId, guildId });
	const inviteUrl = getBotInviteUrl(botId, {
		guildId,
		redirectUri: callbackUrl.toString(),
		state,
	});

	if (!inviteUrl) {
		return NextResponse.redirect(new URL('/servers', _request.url));
	}

	return NextResponse.redirect(inviteUrl);
}
