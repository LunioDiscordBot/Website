'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { apiJson, type AuthUser } from '@/lib/api';
import { buildDashboardPath } from '@/lib/dashboard-routes';

type DashboardWorkspaceShellProps = {
	activeKey: 'overview' | 'servers' | 'guild-settings' | 'account-settings' | 'playlists';
	title: string;
	subtitle?: string;
	botId?: string | null;
	guildId?: string | null;
	canManageGuild?: boolean;
	headerActions?: ReactNode;
	children: ReactNode;
};

type SidebarLink = {
	key: DashboardWorkspaceShellProps['activeKey'] | 'commands' | 'status' | 'support';
	label: string;
	caption: string;
	icon: 'overview' | 'servers' | 'settings' | 'playlists' | 'commands' | 'status' | 'account' | 'support' | 'collapse' | 'chevron';
	href?: string;
	active?: boolean;
	disabled?: boolean;
	comingSoon?: boolean;
	external?: boolean;
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'lunio:web:dashboardSidebarCollapsed';
const SIDEBAR_NOTICE_STORAGE_KEY = 'lunio:web:dashboardSidebarNoticeDismissed:workspace';
const DASHBOARD_BOT_ID_STORAGE_KEY = 'lunio:web:botId';
const DASHBOARD_GUILD_ID_STORAGE_KEY = 'lunio:web:guildId';
const SUPPORT_SERVER_URL = 'https://discord.gg/rrqEFukVUZ';
const DEFAULT_PUBLIC_SITE_URL = 'https://luniobot.com';

function DashboardSidebarIcon({ name, className = 'h-5 w-5' }: { name: SidebarLink['icon']; className?: string }) {
	const sharedProps = {
		className,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 1.9,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		'aria-hidden': true,
	};

	switch (name) {
		case 'overview':
			return (
				<svg {...sharedProps}>
					<path d="M4.75 10.5 12 4l7.25 6.5" />
					<path d="M6.5 9.5v9h11v-9" />
				</svg>
			);
		case 'servers':
			return (
				<svg {...sharedProps}>
					<rect x="4.5" y="5" width="15" height="4.5" rx="1.5" />
					<rect x="4.5" y="14.5" width="15" height="4.5" rx="1.5" />
					<path d="M8 7.25h.01" />
					<path d="M8 16.75h.01" />
				</svg>
			);
		case 'settings':
			return (
				<svg {...sharedProps}>
					<path d="M5 7h8" />
					<path d="M15 7h4" />
					<path d="M11 17h8" />
					<path d="M5 17h2" />
					<circle cx="11" cy="7" r="2" />
					<circle cx="9" cy="17" r="2" />
				</svg>
			);
		case 'playlists':
			return (
				<svg {...sharedProps}>
					<path d="M8 6h10" />
					<path d="M8 10h10" />
					<path d="M8 14h6" />
					<path d="M7 18a2 2 0 1 1-2-2 2 2 0 0 1 2 2Z" />
					<path d="M17 17a2 2 0 1 1-2-2 2 2 0 0 1 2 2Z" />
				</svg>
			);
		case 'commands':
			return (
				<svg {...sharedProps}>
					<rect x="4.5" y="5" width="15" height="14" rx="2" />
					<path d="m8 10 2.75 2L8 14.75" />
					<path d="M13.5 14.75H16" />
				</svg>
			);
		case 'status':
			return (
				<svg {...sharedProps}>
					<path d="M5 14h2.5l2-5 3 8 2-5H19" />
				</svg>
			);
		case 'account':
			return (
				<svg {...sharedProps}>
					<circle cx="12" cy="8" r="3.25" />
					<path d="M5.5 18.5c1.8-3 4.15-4.5 6.5-4.5s4.7 1.5 6.5 4.5" />
				</svg>
			);
		case 'support':
			return (
				<svg {...sharedProps}>
					<path d="M5 13.5v-1a7 7 0 1 1 14 0v1" />
					<path d="M5.5 13.5h-.25A1.75 1.75 0 0 0 3.5 15.25v.5A1.75 1.75 0 0 0 5.25 17.5H7v-4Z" />
					<path d="M19 13.5h.25A1.75 1.75 0 0 1 21 15.25v.5A1.75 1.75 0 0 1 19.25 17.5H17v-4Z" />
					<path d="M9.5 20h5" />
				</svg>
			);
		case 'collapse':
			return (
				<svg {...sharedProps}>
					<rect x="4.5" y="5" width="15" height="14" rx="2.5" />
					<path d="M9 5v14" />
				</svg>
			);
		case 'chevron':
			return (
				<svg {...sharedProps}>
					<path d="m9 6 6 6-6 6" />
				</svg>
			);
	}
}

export function DashboardWorkspaceShell({ activeKey, title, subtitle, botId, guildId, canManageGuild, headerActions, children }: DashboardWorkspaceShellProps) {
	const [authUser, setAuthUser] = useState<AuthUser | null>(null);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const [showSidebarNotice, setShowSidebarNotice] = useState(true);
	const [hasLoadedSidebarPrefs, setHasLoadedSidebarPrefs] = useState(false);
	const [rememberedBotId, setRememberedBotId] = useState('');
	const [rememberedGuildId, setRememberedGuildId] = useState('');

	useEffect(() => {
		const storedSidebarState = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
		setIsSidebarCollapsed(storedSidebarState === 'true');
		setShowSidebarNotice(window.localStorage.getItem(SIDEBAR_NOTICE_STORAGE_KEY) !== 'true');
		setRememberedBotId(window.localStorage.getItem(DASHBOARD_BOT_ID_STORAGE_KEY) || '');
		setRememberedGuildId(window.localStorage.getItem(DASHBOARD_GUILD_ID_STORAGE_KEY) || '');
		setHasLoadedSidebarPrefs(true);
	}, []);

	useEffect(() => {
		if (!hasLoadedSidebarPrefs) return;
		window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
	}, [hasLoadedSidebarPrefs, isSidebarCollapsed]);

	useEffect(() => {
		if (!hasLoadedSidebarPrefs) return;
		window.localStorage.setItem(SIDEBAR_NOTICE_STORAGE_KEY, String(!showSidebarNotice));
	}, [hasLoadedSidebarPrefs, showSidebarNotice]);

	useEffect(() => {
		let active = true;

		void apiJson<AuthUser>('/api/auth/me')
			.then((user) => {
				if (!active) return;
				setAuthUser(user);
			})
			.catch(() => {
				if (!active) return;
				setAuthUser(null);
			});

		return () => {
			active = false;
		};
	}, []);

	const publicSiteUrl = (process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || DEFAULT_PUBLIC_SITE_URL).replace(/\/$/, '');
	const effectiveBotId = botId || rememberedBotId || '';
	const effectiveGuildId = guildId || rememberedGuildId || '';
	const accountDisplayName = authUser ? authUser.globalName || authUser.username : 'Dashboard guest';
	const accountHandle = authUser?.username ? `@${authUser.username}` : 'Profile & preferences';
	const canOpenOverview = Boolean(effectiveBotId && effectiveGuildId);
	const canOpenGuildSettings = Boolean(effectiveBotId && effectiveGuildId) && (canManageGuild !== false || activeKey === 'guild-settings');
	const sidebarPrimaryLinks: SidebarLink[] = [
		{
			key: 'overview',
			label: 'Overview',
			caption: 'Player control',
			icon: 'overview',
			href: canOpenOverview ? buildDashboardPath(effectiveBotId, effectiveGuildId) : undefined,
			active: activeKey === 'overview',
			disabled: !canOpenOverview,
		},
		{
			key: 'servers',
			label: 'Servers',
			caption: 'Switch guild',
			icon: 'servers',
			href: '/servers',
			active: activeKey === 'servers',
		},
		{
			key: 'guild-settings',
			label: 'Guild settings',
			caption: canOpenGuildSettings ? 'Tune this server' : 'Pick a server first',
			icon: 'settings',
			href: canOpenGuildSettings ? buildDashboardPath(effectiveBotId, effectiveGuildId, 'settings') : undefined,
			active: activeKey === 'guild-settings',
			disabled: !canOpenGuildSettings,
		},
		{
			key: 'playlists',
			label: 'Playlists',
			caption: 'Coming soon',
			icon: 'playlists',
			active: activeKey === 'playlists',
			disabled: true,
			comingSoon: true,
		},
	];
	const sidebarExploreLinks: SidebarLink[] = [
		{
			key: 'commands',
			label: 'Commands',
			caption: 'Public docs',
			icon: 'commands',
			href: `${publicSiteUrl}/commands`,
			external: true,
		},
		{
			key: 'status',
			label: 'Status',
			caption: 'System health',
			icon: 'status',
			href: `${publicSiteUrl}/status`,
			external: true,
		},
	];
	const sidebarFooterLinks: SidebarLink[] = [
		{
			key: 'account-settings',
			label: 'Settings',
			caption: 'Account',
			icon: 'account',
			href: '/settings',
			active: activeKey === 'account-settings',
		},
		{
			key: 'support',
			label: 'Help Center',
			caption: 'Support server',
			icon: 'support',
			href: SUPPORT_SERVER_URL,
			external: true,
		},
	];

	const renderSidebarLink = (item: SidebarLink) => {
		const className = `group flex w-full items-center gap-3 rounded-[1.15rem] border px-3 py-3 text-left transition ${
			item.active
				? 'border-primary/25 bg-primary/12 text-white shadow-[0_14px_40px_rgba(0,255,255,0.12)]'
				: item.disabled
					? 'border-white/6 bg-transparent text-white/32'
					: 'border-transparent bg-transparent text-white/72 hover:border-white/10 hover:bg-white/[0.035] hover:text-white'
		}`;

		const content = (
			<>
				<div
					className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border ${
						item.active
							? 'border-primary/18 bg-primary/12 text-primary'
							: item.disabled
								? 'border-white/6 bg-white/[0.02] text-white/24'
								: 'border-white/10 bg-white/[0.03] text-white/78 group-hover:border-primary/20 group-hover:text-primary'
					}`}
				>
					<DashboardSidebarIcon name={item.icon} />
				</div>
				{isSidebarCollapsed ? null : (
					<div className="min-w-0 flex-1">
						<div className="truncate text-sm font-bold">{item.label}</div>
						<div className="mt-1 truncate text-xs text-white/42">{item.caption}</div>
					</div>
				)}
				{!isSidebarCollapsed && item.comingSoon ? (
					<span className="rounded-full border border-secondary/25 bg-secondary/12 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-secondary">
						Soon
					</span>
				) : null}
			</>
		);

		if (!item.href || item.disabled) {
			return (
				<div className={className} key={item.key}>
					{content}
				</div>
			);
		}

		if (item.external) {
			return (
				<a className={className} href={item.href} key={item.key} rel="noreferrer" target="_blank">
					{content}
				</a>
			);
		}

		return (
			<Link className={className} href={item.href} key={item.key}>
				{content}
			</Link>
		);
	};

	return (
		<div className="relative min-h-screen overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
			<div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1820px] overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(9,10,12,0.88)] shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl">
				<aside
					className={`flex min-h-0 shrink-0 flex-col overflow-y-auto border-r border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-4 py-5 transition-[width] duration-300 [scrollbar-gutter:stable] ${
						isSidebarCollapsed ? 'w-[104px]' : 'w-[292px]'
					}`}
				>
					<div className="flex items-center justify-between gap-3">
						<button
							className={`flex min-w-0 flex-1 items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.035] px-3 py-3 text-left transition hover:border-primary/20 hover:bg-white/[0.05] ${
								isSidebarCollapsed ? 'justify-center px-0' : ''
							}`}
							type="button"
						>
							{isSidebarCollapsed ? (
								<div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
									<DashboardSidebarIcon className="h-5 w-5" name="account" />
								</div>
							) : authUser?.avatarUrl ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									alt={authUser?.username ?? 'Signed in user'}
									className="h-11 w-11 rounded-full border border-primary/20 object-cover"
									src={authUser?.avatarUrl ?? undefined}
								/>
							) : (
								<div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-black text-primary">
									{accountDisplayName.slice(0, 1).toUpperCase()}
								</div>
							)}
							{isSidebarCollapsed ? null : (
								<>
									<div className="min-w-0 flex-1">
										<div className="truncate text-sm font-bold text-white">{accountDisplayName}</div>
										<div className="mt-1 truncate text-xs text-white/42">{accountHandle}</div>
									</div>
									<DashboardSidebarIcon className="h-4 w-4 text-white/38" name="chevron" />
								</>
							)}
						</button>
						<button
							aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
							className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.035] text-white/72 transition hover:border-primary/20 hover:text-primary"
							onClick={() => setIsSidebarCollapsed((current) => !current)}
							type="button"
						>
							<DashboardSidebarIcon className={`h-5 w-5 ${isSidebarCollapsed ? 'rotate-180' : ''}`} name="collapse" />
						</button>
					</div>

					<div className="mt-8">
						<div className={`px-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/28 ${isSidebarCollapsed ? 'sr-only' : ''}`}>Workspace</div>
						<nav className="mt-3 grid gap-2">{sidebarPrimaryLinks.map(renderSidebarLink)}</nav>
					</div>

					<div className="mt-4 border-t border-white/7 pt-4">
						<div className={`px-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/28 ${isSidebarCollapsed ? 'sr-only' : ''}`}>Explore</div>
						<nav className="mt-3 grid gap-2">{sidebarExploreLinks.map(renderSidebarLink)}</nav>
					</div>

					<div className="mt-4 flex-1">
						{showSidebarNotice && !isSidebarCollapsed ? (
							<div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.28)]">
								<div className="flex items-start justify-between gap-3">
									<span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">
										New
									</span>
									<button
										aria-label="Dismiss notice"
										className="rounded-full p-1 text-white/35 transition hover:bg-white/5 hover:text-white"
										onClick={() => setShowSidebarNotice(false)}
										type="button"
									>
										<svg
											aria-hidden="true"
											className="h-4 w-4"
											fill="none"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											viewBox="0 0 24 24"
										>
											<path d="M6 6 18 18" />
											<path d="M18 6 6 18" />
										</svg>
									</button>
								</div>
								<div className="mt-4 text-base font-bold text-white">Dashboard workspace</div>
								<p className="mt-2 text-sm leading-6 text-white/55">
									Servers, guild settings, and account preferences now live inside the same Lunio control room.
								</p>
							</div>
						) : null}
					</div>

					<div className="mt-4 border-t border-white/7 pt-4">
						<nav className="grid gap-2">{sidebarFooterLinks.map(renderSidebarLink)}</nav>
					</div>
				</aside>

				<main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.08),transparent_28%),radial-gradient(circle_at_75%_10%,rgba(112,0,255,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,255,255,0))]">
					<header className="sticky top-0 z-10 border-b border-white/7 bg-[rgba(9,10,12,0.72)] px-5 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
						<div className="mx-auto flex w-full max-w-[1520px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
							<div className="min-w-0">
								<div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-primary">Dashboard</div>
								<h1 className="mt-2 truncate font-headline text-3xl font-bold tracking-[-0.05em] text-white">{title}</h1>
								{subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-white/52">{subtitle}</p> : null}
								<div className="mt-3 flex flex-wrap gap-2">
									{effectiveBotId ? (
										<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/58">
											Bot: {effectiveBotId}
										</span>
									) : null}
									{effectiveGuildId ? (
										<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/58">
											Server: {effectiveGuildId}
										</span>
									) : null}
								</div>
							</div>
							{headerActions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{headerActions}</div> : null}
						</div>
					</header>

					<div className="px-5 py-5 sm:px-6 lg:px-8 lg:py-6">
						<div className="mx-auto w-full max-w-[1520px]">{children}</div>
					</div>
				</main>
			</div>
		</div>
	);
}
