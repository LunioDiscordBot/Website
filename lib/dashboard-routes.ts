export function buildDashboardPath(botId?: string | null, guildId?: string | null, section?: string | null) {
	if (!botId || !guildId) {
		return '/dashboard';
	}

	const basePath = `/dashboard/${encodeURIComponent(botId)}/${encodeURIComponent(guildId)}`;
	return section ? `${basePath}/${section}` : basePath;
}

export function buildInvitePath(botId?: string | null, guildId?: string | null) {
	if (!botId || !guildId) {
		return '/servers';
	}

	return `/invite/${encodeURIComponent(botId)}/${encodeURIComponent(guildId)}`;
}
