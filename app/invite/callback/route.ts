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
	const state = decodeState(url.searchParams.get('state'));
	const error = url.searchParams.get('error');

	if (!state || error) {
		return NextResponse.redirect(new URL('/servers', request.url));
	}

	return NextResponse.redirect(new URL(buildDashboardPath(state.botId, state.guildId), request.url));
}
