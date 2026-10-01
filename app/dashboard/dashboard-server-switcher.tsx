'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { AuthGuild } from '@/lib/api';
import { buildDashboardPath } from '@/lib/dashboard-routes';
import { Avatar, ShellIcon } from './dashboard-workspace-shell';
import { ListSkeleton } from '@/components/loading-skeleton';

type ActiveKey = 'overview' | 'servers' | 'guild-settings' | 'account-settings' | 'playlists' | 'premium';

const SEARCH_THRESHOLD = 7;
const DASHBOARD_BOT_ID_STORAGE_KEY = 'lunio:web:botId';
const DASHBOARD_GUILD_ID_STORAGE_KEY = 'lunio:web:guildId';

/** Keep the user on the equivalent page when switching servers, if they are allowed to open it there. */
function buildSwitchHref(guild: AuthGuild, botId: string, activeKey: ActiveKey) {
	if (activeKey === 'playlists') return buildDashboardPath(botId, guild.guildId, 'playlists');
	if (activeKey === 'guild-settings' && guild.canManage) return buildDashboardPath(botId, guild.guildId, 'settings');
	if (activeKey === 'premium' && guild.canManage) return buildDashboardPath(botId, guild.guildId, 'premium');
	return buildDashboardPath(botId, guild.guildId);
}

export function DashboardServerSwitcher({
	activeKey,
	collapsed,
	currentBotId,
	currentGuildId,
	guilds,
	guildsState,
	isSignedIn,
}: {
	activeKey: ActiveKey;
	collapsed: boolean;
	currentBotId: string;
	currentGuildId: string;
	guilds: AuthGuild[];
	guildsState: 'idle' | 'loading' | 'ready' | 'error';
	isSignedIn: boolean;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState('');
	const rootRef = useRef<HTMLDivElement | null>(null);
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const searchRef = useRef<HTMLInputElement | null>(null);
	const listRef = useRef<HTMLUListElement | null>(null);
	const panelId = useId();

	const selectedGuild = guilds.find((guild) => guild.guildId === currentGuildId) ?? null;
	const connectedGuilds = useMemo(
		() =>
			guilds
				.filter((guild) => guild.connectedBots.length > 0)
				.sort((left, right) => (left.guildId === currentGuildId ? -1 : right.guildId === currentGuildId ? 1 : left.name.localeCompare(right.name))),
		[guilds, currentGuildId]
	);
	const showSearch = connectedGuilds.length >= SEARCH_THRESHOLD;
	const normalizedQuery = query.trim().toLowerCase();
	const visibleGuilds = normalizedQuery
		? connectedGuilds.filter((guild) => guild.name.toLowerCase().includes(normalizedQuery) || guild.guildId.includes(normalizedQuery))
		: connectedGuilds;

	const close = (restoreFocus: boolean) => {
		setIsOpen(false);
		setQuery('');
		if (restoreFocus) triggerRef.current?.focus();
	};

	useEffect(() => {
		if (!isOpen) return;
		if (showSearch) searchRef.current?.focus();
		else listRef.current?.querySelector<HTMLElement>('a')?.focus();

		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) close(false);
		};
		window.addEventListener('pointerdown', onPointerDown);
		return () => window.removeEventListener('pointerdown', onPointerDown);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	const focusItem = (direction: 1 | -1 | 'first' | 'last') => {
		const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-switcher-item]') ?? []);
		if (!items.length) return;
		const currentIndex = items.indexOf(document.activeElement as HTMLElement);
		const nextIndex =
			direction === 'first'
				? 0
				: direction === 'last'
					? items.length - 1
					: currentIndex === -1
						? direction === 1
							? 0
							: items.length - 1
						: (currentIndex + direction + items.length) % items.length;
		items[nextIndex]?.focus();
	};

	const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			close(true);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			focusItem(1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			focusItem(-1);
		} else if (event.key === 'Home' && event.target !== searchRef.current) {
			event.preventDefault();
			focusItem('first');
		} else if (event.key === 'End' && event.target !== searchRef.current) {
			event.preventDefault();
			focusItem('last');
		}
	};

	const rememberSelection = (guild: AuthGuild, botId: string) => {
		try {
			window.localStorage.setItem(DASHBOARD_BOT_ID_STORAGE_KEY, botId);
			window.localStorage.setItem(DASHBOARD_GUILD_ID_STORAGE_KEY, guild.guildId);
		} catch {}
		close(false);
	};

	const hasServer = Boolean(currentBotId && currentGuildId);

	return (
		<div
			className="relative"
			onBlur={(event) => {
				// Close once keyboard focus leaves the switcher entirely (e.g. Tab past the last item).
				if (isOpen && event.relatedTarget && !rootRef.current?.contains(event.relatedTarget as Node)) close(false);
			}}
			ref={rootRef}
		>
			<button
				aria-controls={panelId}
				aria-expanded={isOpen}
				aria-label={collapsed ? `Switch server (current: ${selectedGuild?.name ?? 'none selected'})` : undefined}
				className={`dash-inset flex w-full items-center gap-3 px-2.5 py-2 text-left transition-colors duration-150 hover:border-[var(--dash-border-strong)] ${
					isOpen ? 'border-[var(--dash-border-strong)]' : ''
				} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
				onClick={() => (isOpen ? close(false) : setIsOpen(true))}
				onKeyDown={(event) => {
					if (event.key === 'ArrowDown' && !isOpen) {
						event.preventDefault();
						setIsOpen(true);
					}
				}}
				ref={triggerRef}
				title={collapsed ? (selectedGuild?.name ?? 'Select a server') : undefined}
				type="button"
			>
				{selectedGuild ? (
					<Avatar className="h-8 w-8 rounded-md" label={selectedGuild.name} src={selectedGuild.iconUrl} />
				) : (
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--dash-active)] text-muted">
						<ShellIcon className="h-4 w-4" name="servers" />
					</span>
				)}
				<span className={`min-w-0 flex-1 ${collapsed ? 'lg:sr-only' : ''}`}>
					<span className="block truncate text-sm font-semibold">{selectedGuild?.name ?? (hasServer ? 'Current server' : 'Select a server')}</span>
					<span className="block truncate text-xs text-muted">{hasServer ? 'Switch server' : 'Choose where Lunio plays'}</span>
				</span>
				<ShellIcon className={`h-4 w-4 shrink-0 text-muted ${collapsed ? 'lg:hidden' : ''}`} name="selector" />
			</button>

			{isOpen ? (
				<div
					aria-label="Switch server"
					className={`account-menu absolute z-50 w-full min-w-[15rem] overflow-hidden p-1.5 ${collapsed ? 'top-full mt-1.5 lg:left-full lg:top-0 lg:ml-2 lg:mt-0 lg:w-72' : 'left-0 top-full mt-1.5'}`}
					id={panelId}
					onKeyDown={onPanelKeyDown}
					role="region"
				>
					{showSearch ? (
						<div className="p-1 pb-1.5">
							<label className="sr-only" htmlFor={`${panelId}-search`}>
								Find a server
							</label>
							<input
								autoComplete="off"
								className="dash-input h-8"
								id={`${panelId}-search`}
								name="serverSearch"
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Find a server…"
								ref={searchRef}
								spellCheck={false}
								type="search"
								value={query}
							/>
						</div>
					) : null}

					{!isSignedIn ? (
						<p className="px-2.5 py-3 text-sm text-muted">Sign in to see your servers.</p>
					) : guildsState === 'loading' || guildsState === 'idle' ? (
						<ListSkeleton className="px-1 py-2" label="Loading servers..." rows={3} />
					) : guildsState === 'error' ? (
						<p className="px-2.5 py-3 text-sm text-muted">Couldn’t load your servers. Open the server list to try again.</p>
					) : visibleGuilds.length ? (
						<ul aria-label="Servers with Lunio" className="max-h-[min(20rem,50vh)] overflow-y-auto overscroll-contain" ref={listRef}>
							{visibleGuilds.map((guild) => {
								const botId = currentBotId && guild.connectedBots.includes(currentBotId) ? currentBotId : guild.connectedBots[0];
								const isCurrent = guild.guildId === currentGuildId;
								return (
									<li key={guild.guildId}>
										<Link
											aria-current={isCurrent ? 'true' : undefined}
											className="account-menu-action h-auto gap-2.5 py-1.5"
											data-switcher-item=""
											href={buildSwitchHref(guild, botId, activeKey)}
											onClick={() => rememberSelection(guild, botId)}
											prefetch={false}
										>
											<Avatar className="h-7 w-7 rounded-md" label={guild.name} src={guild.iconUrl} />
											<span className="min-w-0 flex-1 truncate">{guild.name}</span>
											{isCurrent ? (
												<svg
													aria-hidden="true"
													className="h-4 w-4 shrink-0 text-primary"
													fill="none"
													stroke="currentColor"
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2.2}
													viewBox="0 0 24 24"
												>
													<path d="m5 12.5 4.5 4.5L19 7.5" />
												</svg>
											) : null}
										</Link>
									</li>
								);
							})}
						</ul>
					) : (
						<p className="px-2.5 py-3 text-sm text-muted">{normalizedQuery ? `No servers match “${query.trim()}”.` : 'Lunio isn’t in any of your servers yet.'}</p>
					)}

					<div className="dash-divider my-1.5 border-t" />
					<Link
						aria-current={activeKey === 'servers' ? 'page' : undefined}
						className="account-menu-action gap-2.5 text-muted hover:text-text"
						data-switcher-item=""
						href="/servers"
						onClick={() => close(false)}
						prefetch={false}
					>
						<ShellIcon className="h-4 w-4" name="servers" />
						All Servers
					</Link>
				</div>
			) : null}
		</div>
	);
}
