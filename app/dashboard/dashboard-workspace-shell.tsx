'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { apiJson, type AuthGuild, type AuthGuildsResponse, type AuthUser } from '@/lib/api';
import { buildDashboardPath } from '@/lib/dashboard-routes';
import { DashboardMiniPlayerBar } from './dashboard-mini-player-bar';
import { useDashboardPlayerOptional } from './dashboard-player-provider';

type ActiveKey = 'overview' | 'servers' | 'guild-settings' | 'account-settings' | 'playlists' | 'premium';

type DashboardWorkspaceShellProps = {
	activeKey: ActiveKey;
	title: string;
	subtitle?: string;
	botId?: string | null;
	guildId?: string | null;
	canManageGuild?: boolean;
	headerActions?: ReactNode;
	children: ReactNode;
	/** Pass true on pages that render their own full player UI (e.g. Overview). */
	hideMiniPlayerBar?: boolean;
};

type ShellIconName =
	| 'home'
	| 'overview'
	| 'servers'
	| 'settings'
	| 'playlists'
	| 'premium'
	| 'commands'
	| 'status'
	| 'account'
	| 'support'
	| 'collapse'
	| 'menu'
	| 'close'
	| 'selector'
	| 'external';

type NavLink = {
	key: string;
	label: string;
	icon: ShellIconName;
	href?: string;
	active?: boolean;
	disabledReason?: string;
	external?: boolean;
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'lunio:web:dashboardSidebarCollapsed';
const DASHBOARD_BOT_ID_STORAGE_KEY = 'lunio:web:botId';
const DASHBOARD_GUILD_ID_STORAGE_KEY = 'lunio:web:guildId';
const SUPPORT_SERVER_URL = 'https://discord.gg/rrqEFukVUZ';

export function ShellIcon({ name, className = 'h-[18px] w-[18px]' }: { name: ShellIconName; className?: string }) {
	const sharedProps = {
		className,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 1.8,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		'aria-hidden': true,
	};

	switch (name) {
		case 'home':
			return (
				<svg {...sharedProps}>
					<path d="M4.75 10.5 12 4l7.25 6.5" />
					<path d="M6.5 9.5v9h11v-9" />
					<path d="M10 18.5v-4h4v4" />
				</svg>
			);
		case 'overview':
			return (
				<svg {...sharedProps}>
					<circle cx="12" cy="12" r="8.25" />
					<path d="m10.25 8.75 4.75 3.25-4.75 3.25v-6.5Z" />
				</svg>
			);
		case 'servers':
			return (
				<svg {...sharedProps}>
					<rect x="4.5" y="5" width="15" height="5" rx="1.5" />
					<rect x="4.5" y="14" width="15" height="5" rx="1.5" />
					<path d="M8 7.5h.01" />
					<path d="M8 16.5h.01" />
				</svg>
			);
		case 'settings':
			return (
				<svg {...sharedProps}>
					<path d="M5 7h8" />
					<path d="M16 7h3" />
					<path d="M11 17h8" />
					<path d="M5 17h3" />
					<circle cx="14.5" cy="7" r="1.75" />
					<circle cx="9.5" cy="17" r="1.75" />
				</svg>
			);
		case 'playlists':
			return (
				<svg {...sharedProps}>
					<path d="M4.5 6.5h11" />
					<path d="M4.5 11h11" />
					<path d="M4.5 15.5h6" />
					<path d="M18 9.5v7.25" />
					<circle cx="16.25" cy="16.75" r="1.75" />
				</svg>
			);
		case 'premium':
			return (
				<svg {...sharedProps}>
					<path d="M5 9.5 8.5 5h7L19 9.5 12 19 5 9.5Z" />
					<path d="M5 9.5h14" />
				</svg>
			);
		case 'commands':
			return (
				<svg {...sharedProps}>
					<rect x="4" y="5" width="16" height="14" rx="2" />
					<path d="m8 10 2.5 2L8 14" />
					<path d="M13 14h3" />
				</svg>
			);
		case 'status':
			return (
				<svg {...sharedProps}>
					<path d="M4 12h3.5l2-5 4 10 2-5H20" />
				</svg>
			);
		case 'account':
			return (
				<svg {...sharedProps}>
					<circle cx="12" cy="8.5" r="3.25" />
					<path d="M5.5 19c1.6-2.9 3.9-4.25 6.5-4.25S16.9 16.1 18.5 19" />
				</svg>
			);
		case 'support':
			return (
				<svg {...sharedProps}>
					<circle cx="12" cy="12" r="8.25" />
					<path d="M9.75 9.5a2.35 2.35 0 0 1 4.5.9c0 1.6-2.25 2-2.25 3.35" />
					<path d="M12 16.75h.01" />
				</svg>
			);
		case 'collapse':
			return (
				<svg {...sharedProps}>
					<rect x="4" y="5" width="16" height="14" rx="2" />
					<path d="M9.5 5v14" />
				</svg>
			);
		case 'menu':
			return (
				<svg {...sharedProps}>
					<path d="M4.5 7h15" />
					<path d="M4.5 12h15" />
					<path d="M4.5 17h15" />
				</svg>
			);
		case 'close':
			return (
				<svg {...sharedProps}>
					<path d="M6 6l12 12" />
					<path d="M18 6 6 18" />
				</svg>
			);
		case 'selector':
			return (
				<svg {...sharedProps}>
					<path d="m8.5 9.5 3.5-3.5 3.5 3.5" />
					<path d="m8.5 14.5 3.5 3.5 3.5-3.5" />
				</svg>
			);
		case 'external':
			return (
				<svg {...sharedProps}>
					<path d="M14 5h5v5" />
					<path d="M19 5 11 13" />
					<path d="M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />
				</svg>
			);
	}
}

function Avatar({ src, label, className }: { src?: string | null; label: string; className: string }) {
	if (src) {
		// eslint-disable-next-line @next/next/no-img-element
		return <img alt="" className={`${className} shrink-0 object-cover`} height={32} src={src} width={32} />;
	}

	return (
		<span aria-hidden="true" className={`${className} flex shrink-0 items-center justify-center bg-primary/15 text-xs font-bold text-primary`}>
			{label.slice(0, 1).toUpperCase()}
		</span>
	);
}

export function DashboardWorkspaceShell({ activeKey, title, subtitle, botId, guildId, canManageGuild, headerActions, children, hideMiniPlayerBar }: DashboardWorkspaceShellProps) {
	const pathname = usePathname();
	const dashboardPlayer = useDashboardPlayerOptional();
	const [authUser, setAuthUser] = useState<AuthUser | null>(null);
	const [guilds, setGuilds] = useState<AuthGuild[]>([]);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
	const [hasLoadedSidebarPrefs, setHasLoadedSidebarPrefs] = useState(false);
	const [rememberedBotId, setRememberedBotId] = useState('');
	const [rememberedGuildId, setRememberedGuildId] = useState('');

	useEffect(() => {
		try {
			setIsSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true');
			setRememberedBotId(window.localStorage.getItem(DASHBOARD_BOT_ID_STORAGE_KEY) || '');
			setRememberedGuildId(window.localStorage.getItem(DASHBOARD_GUILD_ID_STORAGE_KEY) || '');
		} catch {}
		setHasLoadedSidebarPrefs(true);
	}, []);

	useEffect(() => {
		if (!hasLoadedSidebarPrefs) return;
		try {
			window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
		} catch {}
	}, [hasLoadedSidebarPrefs, isSidebarCollapsed]);

	useEffect(() => {
		let active = true;
		void apiJson<AuthUser>('/api/auth/me')
			.then((user) => {
				if (active) setAuthUser(user);
			})
			.catch(() => {
				if (active) setAuthUser(null);
			});
		return () => {
			active = false;
		};
	}, []);

	const effectiveBotId = botId || rememberedBotId || '';
	const effectiveGuildId = guildId || rememberedGuildId || '';

	useEffect(() => {
		if (!effectiveGuildId || !authUser) return;
		let active = true;
		void apiJson<AuthGuildsResponse>('/api/auth/guilds')
			.then((response) => {
				if (active) setGuilds(response.guilds ?? []);
			})
			.catch(() => {
				if (active) setGuilds([]);
			});
		return () => {
			active = false;
		};
	}, [effectiveGuildId, authUser]);

	useEffect(() => {
		setIsMobileNavOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!isMobileNavOpen) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setIsMobileNavOpen(false);
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [isMobileNavOpen]);

	const selectedGuild = guilds.find((guild) => guild.guildId === effectiveGuildId) ?? null;
	const accountDisplayName = authUser ? authUser.globalName || authUser.username : 'Guest';
	const accountHandle = authUser?.username ? `@${authUser.username}` : 'Not signed in';
	const hasServer = Boolean(effectiveBotId && effectiveGuildId);
	const guildCanManage = canManageGuild ?? selectedGuild?.canManage;
	const canOpenGuildSettings = hasServer && (guildCanManage !== false || activeKey === 'guild-settings');
	const hasMiniPlayerBar = !hideMiniPlayerBar && Boolean(dashboardPlayer?.hasIdentity && dashboardPlayer.player?.currentTrack);
	const collapsed = isSidebarCollapsed;

	const workspaceLinks: NavLink[] = [
		{
			key: 'overview',
			label: 'Overview',
			icon: 'overview',
			href: hasServer ? buildDashboardPath(effectiveBotId, effectiveGuildId) : undefined,
			active: activeKey === 'overview',
			disabledReason: hasServer ? undefined : 'Select a server first',
		},
		{
			key: 'playlists',
			label: 'Playlists',
			icon: 'playlists',
			href: hasServer ? buildDashboardPath(effectiveBotId, effectiveGuildId, 'playlists') : undefined,
			active: activeKey === 'playlists',
			disabledReason: hasServer ? undefined : 'Select a server first',
		},
		{
			key: 'guild-settings',
			label: 'Server Settings',
			icon: 'settings',
			href: canOpenGuildSettings ? buildDashboardPath(effectiveBotId, effectiveGuildId, 'settings') : undefined,
			active: activeKey === 'guild-settings',
			disabledReason: canOpenGuildSettings ? undefined : hasServer ? 'Requires Manage Server permission' : 'Select a server first',
		},
		{
			key: 'premium',
			label: 'Premium',
			icon: 'premium',
			href: canOpenGuildSettings ? buildDashboardPath(effectiveBotId, effectiveGuildId, 'premium') : undefined,
			active: activeKey === 'premium',
			disabledReason: canOpenGuildSettings ? undefined : hasServer ? 'Requires Manage Server permission' : 'Select a server first',
		},
	];
	const resourceLinks: NavLink[] = [
		{ key: 'home', label: 'Website', icon: 'home', href: process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || '/' },
		{ key: 'commands', label: 'Commands', icon: 'commands', href: '/commands' },
		{ key: 'status', label: 'Status', icon: 'status', href: '/status' },
		{ key: 'support', label: 'Support Server', icon: 'support', href: SUPPORT_SERVER_URL, external: true },
	];

	const renderNavLink = (item: NavLink) => {
		const content = (
			<>
				<ShellIcon name={item.icon} />
				<span className={`min-w-0 flex-1 truncate ${collapsed ? 'lg:sr-only' : ''}`}>{item.label}</span>
				{item.external && !collapsed ? <ShellIcon className="h-3.5 w-3.5 shrink-0 opacity-60" name="external" /> : null}
			</>
		);
		const className = `dash-nav-item ${collapsed ? 'lg:justify-center lg:px-0' : ''}`;
		const tooltip = item.disabledReason ?? (collapsed ? item.label : undefined);

		if (!item.href) {
			return (
				<li key={item.key}>
					<span aria-disabled="true" className={className} title={tooltip}>
						{content}
					</span>
				</li>
			);
		}

		if (item.external) {
			return (
				<li key={item.key}>
					<a className={className} href={item.href} rel="noreferrer" target="_blank" title={tooltip}>
						{content}
						<span className="sr-only"> (opens in a new tab)</span>
					</a>
				</li>
			);
		}

		return (
			<li key={item.key}>
				<Link aria-current={item.active ? 'page' : undefined} className={className} href={item.href} prefetch={false} title={tooltip}>
					{content}
				</Link>
			</li>
		);
	};

	return (
		<div className="dash-app flex h-dvh overflow-hidden font-body">
			{isMobileNavOpen ? (
				<button
					aria-label="Close navigation"
					className="fixed inset-0 z-40 cursor-default bg-black/50 lg:hidden"
					onClick={() => setIsMobileNavOpen(false)}
					tabIndex={-1}
					type="button"
				/>
			) : null}

			<aside
				aria-label="Dashboard"
				className={`dash-sidebar fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col transition-transform duration-200 lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:transition-[width] ${
					isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
				} ${collapsed ? 'lg:w-[4.25rem]' : 'lg:w-64'}`}
				id="dashboard-sidebar"
			>
				<div className={`flex h-16 shrink-0 items-center gap-2 px-4 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
					<Link className={`flex min-w-0 items-center gap-2.5 rounded-lg ${collapsed ? 'lg:hidden' : ''}`} href="/" prefetch={false}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img alt="" className="h-7 w-7 rounded-full object-cover" height={28} src="/lunio-logo.png" width={28} />
						<span className="font-headline text-lg font-bold tracking-tight" translate="no">
							Lunio
						</span>
					</Link>
					<button
						aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
						className={`dash-btn dash-btn-icon hidden border-transparent bg-transparent text-muted hover:text-text lg:inline-flex ${collapsed ? '' : 'ml-auto'}`}
						onClick={() => setIsSidebarCollapsed((current) => !current)}
						title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
						type="button"
					>
						<ShellIcon name="collapse" />
					</button>
					<button
						aria-label="Close navigation"
						className="dash-btn dash-btn-icon ml-auto border-transparent bg-transparent text-muted lg:hidden"
						onClick={() => setIsMobileNavOpen(false)}
						type="button"
					>
						<ShellIcon name="close" />
					</button>
				</div>

				<div className={`px-3 ${collapsed ? 'lg:px-2' : ''}`}>
					<Link
						aria-current={activeKey === 'servers' ? 'page' : undefined}
						className={`dash-inset flex w-full items-center gap-3 px-2.5 py-2 text-left transition-colors duration-150 hover:border-[var(--dash-border-strong)] ${
							collapsed ? 'lg:justify-center lg:px-0' : ''
						}`}
						href="/servers"
						prefetch={false}
						title={collapsed ? (selectedGuild?.name ?? 'Select a server') : 'Switch server'}
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
					</Link>
				</div>

				<nav aria-label="Dashboard navigation" className={`mt-5 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4 ${collapsed ? 'lg:px-2' : ''}`}>
					<div>
						<div className={`dash-label mb-1.5 px-2.5 ${collapsed ? 'lg:sr-only' : ''}`}>Workspace</div>
						<ul className="grid gap-0.5">{workspaceLinks.map(renderNavLink)}</ul>
					</div>
					<div>
						<div className={`dash-label mb-1.5 px-2.5 ${collapsed ? 'lg:sr-only' : ''}`}>Resources</div>
						<ul className="grid gap-0.5">{resourceLinks.map(renderNavLink)}</ul>
					</div>
				</nav>

				<div className={`dash-divider border-t p-3 ${collapsed ? 'lg:px-2' : ''}`}>
					<Link
						aria-current={activeKey === 'account-settings' ? 'page' : undefined}
						className={`dash-nav-item h-auto py-2 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
						href="/settings"
						prefetch={false}
						title={collapsed ? `${accountDisplayName} — Account settings` : 'Account settings'}
					>
						<Avatar className="h-8 w-8 rounded-full" label={accountDisplayName} src={authUser?.avatarUrl} />
						<span className={`min-w-0 flex-1 ${collapsed ? 'lg:sr-only' : ''}`}>
							<span className="block truncate text-sm font-semibold text-text">{accountDisplayName}</span>
							<span className="block truncate text-xs">{accountHandle}</span>
						</span>
						<ShellIcon className={`h-4 w-4 shrink-0 ${collapsed ? 'lg:hidden' : ''}`} name="account" />
					</Link>
				</div>
			</aside>

			<div className="relative flex min-w-0 flex-1 flex-col">
				<header className="dash-topbar flex min-h-16 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
					<button
						aria-controls="dashboard-sidebar"
						aria-expanded={isMobileNavOpen}
						aria-label="Open navigation"
						className="dash-btn dash-btn-icon lg:hidden"
						onClick={() => setIsMobileNavOpen(true)}
						type="button"
					>
						<ShellIcon name="menu" />
					</button>
					<div className="min-w-0 flex-1">
						<h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
						{subtitle ? <p className="hidden truncate text-sm text-muted sm:block">{subtitle}</p> : null}
					</div>
					{headerActions ? <div className="flex flex-wrap items-center gap-2">{headerActions}</div> : null}
				</header>

				<main
					className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
					id="main-content"
					style={{ scrollPaddingBottom: hasMiniPlayerBar ? '7rem' : undefined }}
					tabIndex={-1}
				>
					<div
						className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
						style={{ paddingBottom: hasMiniPlayerBar ? 'calc(7rem + env(safe-area-inset-bottom))' : undefined }}
					>
						{children}
					</div>
				</main>
				{hideMiniPlayerBar ? null : <DashboardMiniPlayerBar />}
			</div>
		</div>
	);
}
