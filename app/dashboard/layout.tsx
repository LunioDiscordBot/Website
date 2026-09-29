'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiJson, type AuthUser } from '@/lib/api';
import { DashboardPlayerProvider } from './dashboard-player-provider';

const STORAGE_KEYS = {
	botId: 'lunio:web:botId',
	guildId: 'lunio:web:guildId',
	userId: 'lunio:web:userId',
};

function parseDashboardRoute(pathname: string | null) {
	if (!pathname) return { botId: '', guildId: '' };
	const match = pathname.match(/^\/dashboard\/([^/]+)\/([^/]+)/);
	if (!match) return { botId: '', guildId: '' };
	const [, botId, guildId] = match;
	if (botId === 'settings') return { botId: '', guildId: '' };
	return { botId, guildId };
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const [storedBotId, setStoredBotId] = useState('');
	const [storedGuildId, setStoredGuildId] = useState('');
	const [storedUserId, setStoredUserId] = useState('');
	const [authUser, setAuthUser] = useState<AuthUser | null>(null);

	useEffect(() => {
		setStoredBotId(window.localStorage.getItem(STORAGE_KEYS.botId) || '');
		setStoredGuildId(window.localStorage.getItem(STORAGE_KEYS.guildId) || '');
		setStoredUserId(window.localStorage.getItem(STORAGE_KEYS.userId) || '');

		const onStorage = (event: StorageEvent) => {
			if (event.key === STORAGE_KEYS.botId) setStoredBotId(event.newValue || '');
			if (event.key === STORAGE_KEYS.guildId) setStoredGuildId(event.newValue || '');
			if (event.key === STORAGE_KEYS.userId) setStoredUserId(event.newValue || '');
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	}, []);

	useEffect(() => {
		let active = true;
		void apiJson<AuthUser>('/api/auth/me')
			.then((user) => {
				if (!active) return;
				setAuthUser(user);
				if (user?.userId) {
					window.localStorage.setItem(STORAGE_KEYS.userId, user.userId);
					setStoredUserId(user.userId);
				}
			})
			.catch(() => {
				if (active) setAuthUser(null);
			});
		return () => {
			active = false;
		};
	}, []);

	// Re-sync from localStorage on every pathname change — captures writes the
	// child pages made via persist() in dashboard-client without needing the
	// storage event (which doesn't fire same-tab).
	useEffect(() => {
		setStoredBotId(window.localStorage.getItem(STORAGE_KEYS.botId) || '');
		setStoredGuildId(window.localStorage.getItem(STORAGE_KEYS.guildId) || '');
		setStoredUserId(window.localStorage.getItem(STORAGE_KEYS.userId) || '');
	}, [pathname]);

	const { botId, guildId } = useMemo(() => {
		const fromRoute = parseDashboardRoute(pathname);
		return {
			botId: fromRoute.botId || storedBotId,
			guildId: fromRoute.guildId || storedGuildId,
		};
	}, [pathname, storedBotId, storedGuildId]);

	const userId = authUser?.userId || storedUserId;

	return (
		<DashboardPlayerProvider botId={botId} guildId={guildId} userId={userId}>
			{children}
		</DashboardPlayerProvider>
	);
}
