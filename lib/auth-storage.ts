const SESSION_STORAGE_KEYS = ['lunio:web:servers-cache'];
const LOCAL_STORAGE_KEYS = ['lunio:web:botId', 'lunio:web:guildId', 'lunio:web:userId'];

export function clearAuthClientState() {
	if (typeof window === 'undefined') return;

	for (const key of SESSION_STORAGE_KEYS) {
		window.sessionStorage.removeItem(key);
	}

	for (const key of LOCAL_STORAGE_KEYS) {
		window.localStorage.removeItem(key);
	}
}
