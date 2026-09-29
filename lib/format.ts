/** Locale-aware wall-clock time, e.g. "14:03:22" (de) or "2:03:22 PM" (en). */
export function formatTimeOfDay(timestamp: number | null | undefined, locale?: string) {
	if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return '—';
	return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(timestamp);
}

/** Locale-aware date and time, e.g. "29 Sep 2026, 14:03". */
export function formatDateTime(timestamp: number | null | undefined, locale?: string) {
	if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return '—';
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}
