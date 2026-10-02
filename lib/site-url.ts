// The app serves two hosts: the public site (luniobot.com) and the dashboard (dashboard.luniobot.com).

export function getDashboardBaseUrl() {
	return process.env.APP_BASE_URL ?? 'https://dashboard.luniobot.com';
}

export function getPublicBaseUrl() {
	const configured = process.env.PUBLIC_SITE_URL;
	if (configured) {
		return configured.replace(/\/$/, '');
	}

	try {
		const dashboardUrl = new URL(getDashboardBaseUrl());
		const publicHost = dashboardUrl.hostname.replace(/^dashboard\./, '');
		return `${dashboardUrl.protocol}//${publicHost}`;
	} catch {
		return 'https://luniobot.com';
	}
}

/** Pages served on the public host. Everything else lives on the dashboard host. */
export const PUBLIC_PAGE_PATHS = ['/', '/commands', '/status', '/tos', '/privacy', '/withdrawal'] as const;

/** Signed-in pages; kept out of search engines. */
export const DASHBOARD_PATH_PREFIXES = ['/dashboard', '/servers', '/login', '/settings', '/invite'] as const;
