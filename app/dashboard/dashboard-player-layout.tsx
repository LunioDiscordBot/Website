import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useState, type RefObject } from 'react';
import { useTheme } from '@/components/theme-provider';
import { buildDashboardPath } from '@/lib/dashboard-routes';
import { formatDuration, type AuthGuild, type AuthUser, type CommandFeedback, type GuildPlayerState, type Track } from '@/lib/api';
import { formatCommandFeedbackPhase, formatCommandTypeLabel, formatShortCommandId, getCommandFeedbackToneClasses } from '@/lib/command-feedback';

type SelectedBot = {
	botId: string;
	label: string;
	avatarUrl?: string | null;
};

type SelectMenuPosition = {
	left: number;
	top: number;
	width: number;
};

type PlayerAction = 'join' | 'leave' | 'previous' | 'skip' | 'shuffle' | 'repeat' | 'pause' | 'resume' | 'stop';
type PremiumAction = 'autoplay' | 'bassboost' | 'speed' | 'filter' | 'filter/reset';
type PlayerIconName = 'previous' | 'pause' | 'play' | 'skip' | 'shuffle' | 'repeat' | 'stop' | 'leave' | 'close';
type DashboardSidebarIconName = 'home' | 'overview' | 'servers' | 'settings' | 'playlists' | 'commands' | 'status' | 'account' | 'support' | 'chevron' | 'collapse';
type SidebarLink = {
	label: string;
	caption: string;
	icon: Exclude<DashboardSidebarIconName, 'chevron' | 'collapse'>;
	href?: string;
	active?: boolean;
	disabled?: boolean;
	comingSoon?: boolean;
	external?: boolean;
};
export type SidebarNotice = {
	badge: string;
	title: string;
	body: string;
	tone: 'promo' | 'warning' | 'error';
	actionLabel?: string;
	dismissible?: boolean;
};

const SUPPORT_SERVER_URL = 'https://discord.gg/rrqEFukVUZ';
const DEFAULT_PUBLIC_SITE_URL = 'https://luniobot.com';

function formatClock(ms: number | null | undefined) {
	if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) return '--:--';
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatToggleState(value: boolean | null | undefined) {
	return value ? 'On' : 'Off';
}

function PlayerControlIcon({ name, className = 'h-5 w-5' }: { name: PlayerIconName; className?: string }) {
	const sharedProps = {
		className,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 2,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		'aria-hidden': true,
	};

	switch (name) {
		case 'pause':
			return (
				<svg {...sharedProps}>
					<rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" stroke="none" />
					<rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" stroke="none" />
				</svg>
			);
		case 'play':
			return (
				<svg {...sharedProps}>
					<path d="M8 6.5v11l8.5-5.5L8 6.5Z" fill="currentColor" stroke="none" />
				</svg>
			);
		case 'previous':
			return (
				<svg {...sharedProps}>
					<path d="M19 7.5v9L12.5 12 19 7.5Z" fill="currentColor" stroke="none" />
					<path d="M12.5 7.5v9L6 12l6.5-4.5Z" fill="currentColor" stroke="none" />
					<path d="M5 7v10" />
				</svg>
			);
		case 'skip':
			return (
				<svg {...sharedProps}>
					<path d="M5 7.5v9l6.5-4.5L5 7.5Z" fill="currentColor" stroke="none" />
					<path d="M11.5 7.5v9l6.5-4.5-6.5-4.5Z" fill="currentColor" stroke="none" />
					<path d="M19 7v10" />
				</svg>
			);
		case 'shuffle':
			return (
				<svg {...sharedProps}>
					<path d="M4 7h4l8 10h4" />
					<path d="M18 17h2l-2 2" />
					<path d="M4 17h4l2.5-3.2" />
					<path d="M14 9l2-2h4" />
					<path d="M18 5h2l-2 2" />
				</svg>
			);
		case 'repeat':
			return (
				<svg {...sharedProps}>
					<path d="M17 2l3 3-3 3" />
					<path d="M4 11V9a4 4 0 0 1 4-4h12" />
					<path d="M7 22l-3-3 3-3" />
					<path d="M20 13v2a4 4 0 0 1-4 4H4" />
				</svg>
			);
		case 'stop':
			return (
				<svg {...sharedProps}>
					<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none" />
				</svg>
			);
		case 'leave':
			return (
				<svg {...sharedProps}>
					<path d="M10 5H7.5A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19H10" />
					<path d="M13 8l4 4-4 4" />
					<path d="M9 12h8" />
				</svg>
			);
		case 'close':
			return (
				<svg {...sharedProps}>
					<path d="M6 6l12 12" />
					<path d="M18 6L6 18" />
				</svg>
			);
	}
}

function DashboardSidebarIcon({ name, className = 'h-5 w-5' }: { name: DashboardSidebarIconName; className?: string }) {
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
		case 'home':
			return (
				<svg {...sharedProps}>
					<path d="M4.75 10.5 12 4l7.25 6.5" />
					<path d="M6.5 9.5v9h11v-9" />
					<path d="M10 18v-4h4v4" />
				</svg>
			);
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

export type DashboardPlayerLayoutProps = {
	activePremiumFilters: string[];
	activityState: string;
	authUser: AuthUser | null;
	autoplayModeEnabled: boolean;
	bassboostDraft: number;
	botMenuPosition: SelectMenuPosition | null;
	botMenuTriggerRef: RefObject<HTMLButtonElement | null>;
	botOptions: SelectedBot[];
	canUseAutoplayControl: boolean;
	canUseDjControls: boolean;
	canUseJoinControl: boolean;
	canUseLeaveControl: boolean;
	canUsePlayerDjControls: boolean;
	canUsePremiumControls: boolean;
	canUsePremiumDjControls: boolean;
	commandFeedback: CommandFeedback;
	currentTrack: Track | null;
	currentTrackFromAutoplay: boolean;
	currentTrackRequester: string | null;
	formBotId: string;
	formGuildId: string;
	hasVoiceChannelContext: boolean;
	isBotMenuOpen: boolean;
	isBusy: boolean;
	isSidebarCollapsed: boolean;
	player: GuildPlayerState | null;
	playerError: string | null;
	playerFilters: GuildPlayerState['filters'];
	playerSurfaceKey: string;
	progressPercent: number;
	queueCount: number;
	queueDuration: number;
	queueTracks: Track[];
	sidebarNotice: SidebarNotice | null;
	selectedBot: SelectedBot | null;
	selectedGuild: AuthGuild | null;
	showSidebarNotice: boolean;
	speedDraft: number;
	syncedDisplayPosition: number;
	trackDuration: number;
	volumeDraft: number;
	onBassboostDraftChange: (value: number) => void;
	onDismissNotice: () => void;
	onRefreshState: () => void;
	onRemoveQueuedTrack: (index: number) => void;
	onScrubChange: (value: number) => void;
	onScrubStart: () => void;
	onSendCommand: (action: PlayerAction) => void;
	onSendPremiumControl: (action: PremiumAction, body: Record<string, unknown>) => void;
	onSidebarToggle: () => void;
	onSpeedDraftChange: (value: number) => void;
	onSubmitSeek: () => void;
	onSubmitVolume: () => void;
	onSwitchBot: (botId: string) => void;
	onToggleBotMenu: () => void;
	onVolumeDraftChange: (value: number) => void;
};

export function DashboardPlayerLayout(props: DashboardPlayerLayoutProps) {
	const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
	const {
		activePremiumFilters,
		activityState,
		authUser,
		autoplayModeEnabled,
		bassboostDraft,
		botMenuPosition,
		botMenuTriggerRef,
		botOptions,
		canUseAutoplayControl,
		canUseDjControls,
		canUseJoinControl,
		canUseLeaveControl,
		canUsePlayerDjControls,
		canUsePremiumControls,
		canUsePremiumDjControls,
		commandFeedback,
		currentTrack,
		currentTrackFromAutoplay,
		currentTrackRequester,
		formBotId,
		formGuildId,
		hasVoiceChannelContext,
		isBotMenuOpen,
		isBusy,
		isSidebarCollapsed,
		player,
		playerError,
		playerFilters,
		playerSurfaceKey,
		progressPercent,
		queueCount,
		queueDuration,
		queueTracks,
		sidebarNotice,
		selectedBot,
		selectedGuild,
		showSidebarNotice,
		speedDraft,
		syncedDisplayPosition,
		trackDuration,
		volumeDraft,
		onBassboostDraftChange,
		onDismissNotice,
		onRefreshState,
		onRemoveQueuedTrack,
		onScrubChange,
		onScrubStart,
		onSendCommand,
		onSendPremiumControl,
		onSidebarToggle,
		onSpeedDraftChange,
		onSubmitSeek,
		onSubmitVolume,
		onSwitchBot,
		onToggleBotMenu,
		onVolumeDraftChange,
	} = props;
	const { resolvedTheme } = useTheme();
	const isLight = resolvedTheme === 'light';

	const publicSiteUrl = (process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || DEFAULT_PUBLIC_SITE_URL).replace(/\/$/, '');
	const overviewHref = buildDashboardPath(formBotId, formGuildId);
	const guildSettingsHref = buildDashboardPath(formBotId, formGuildId, 'settings');
	const accountDisplayName = authUser ? authUser.globalName || authUser.username : 'Dashboard guest';
	const accountHandle = authUser?.username ? `@${authUser.username}` : 'Profile & preferences';
	const queuePreview = queueTracks.slice(0, 6);
	const botMenuStyle = botMenuPosition
		? {
				left: `${botMenuPosition.left}px`,
				top: `${botMenuPosition.top}px`,
				width: `${botMenuPosition.width}px`,
			}
		: undefined;
	const commandFinishedTime = typeof commandFeedback.resultTimestamp === 'number' ? new Date(commandFeedback.resultTimestamp).toLocaleTimeString() : '--';
	const isPlayerConnected = player?.state === 'CONNECTED';
	const frameClass = isLight
		? 'border-slate-200/80 bg-[rgba(248,250,252,0.96)] shadow-[0_28px_90px_rgba(32,51,74,0.14)]'
		: 'border-white/10 bg-[rgba(9,10,12,0.88)] shadow-[0_28px_90px_rgba(0,0,0,0.42)]';
	const sidebarClass = isLight
		? 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(245,248,252,0.96))]'
		: 'border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]';
	const workspaceClass = isLight
		? 'bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.08),transparent_28%),radial-gradient(circle_at_75%_10%,rgba(112,0,255,0.08),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.38),rgba(255,255,255,0))]'
		: 'bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.08),transparent_28%),radial-gradient(circle_at_75%_10%,rgba(112,0,255,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,255,255,0))]';
	const panelClass = isLight
		? 'border-slate-200/80 bg-[rgba(255,255,255,0.9)] shadow-[0_18px_50px_rgba(32,51,74,0.12)]'
		: 'border-white/10 bg-[rgba(18,19,22,0.82)] shadow-[0_22px_65px_rgba(0,0,0,0.34)]';
	const softSurfaceClass = isLight ? 'border-slate-200/70 bg-slate-50/80' : 'border-white/8 bg-black/18';
	const mainTextClass = isLight ? 'text-slate-950' : 'text-white';
	const subTextClass = isLight ? 'text-slate-600' : 'text-white/58';
	const faintTextClass = isLight ? 'text-slate-500' : 'text-white/45';
	const microLabelClass = isLight ? 'text-slate-400' : 'text-white/34';
	const dividerClass = isLight ? 'border-slate-200/80' : 'border-white/7';
	const sidebarLabelClass = isLight ? 'text-slate-400' : 'text-white/28';
	const profileCardClass = isLight
		? 'border-slate-200/80 bg-white/88 hover:border-primary/25 hover:bg-white'
		: 'border-white/10 bg-white/[0.035] hover:border-primary/20 hover:bg-white/[0.05]';
	const iconButtonClass = isLight
		? 'border-slate-200/80 bg-white/88 text-slate-700 hover:border-primary/20 hover:text-primary'
		: 'border-white/10 bg-white/[0.035] text-white/70 hover:border-primary/20 hover:text-primary';
	const noticeCardClass = isLight
		? 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,248,252,0.98))] shadow-[0_16px_50px_rgba(32,51,74,0.12)]'
		: 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-[0_16px_50px_rgba(0,0,0,0.28)]';
	const noticeButtonClass = isLight
		? 'rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900'
		: 'rounded-full p-1 text-white/35 transition hover:bg-white/5 hover:text-white';
	const noticeBadgeClass =
		sidebarNotice?.tone === 'error'
			? 'rounded-full border border-red-400/30 bg-red-500/12 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-red-300'
			: sidebarNotice?.tone === 'warning'
				? 'rounded-full border border-amber-400/30 bg-amber-500/12 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-300'
				: 'rounded-full border border-primary/25 bg-primary/12 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary';
	const noticeActionClass =
		sidebarNotice?.tone === 'error'
			? isLight
				? 'mt-4 inline-flex items-center gap-2 rounded-full border border-red-200/80 bg-white/90 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-red-700 transition hover:border-red-300 hover:text-red-800'
				: 'mt-4 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-red-200 transition hover:border-red-400/35 hover:text-white'
			: sidebarNotice?.tone === 'warning'
				? isLight
					? 'mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/90 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700 transition hover:border-amber-300 hover:text-amber-800'
					: 'mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-200 transition hover:border-amber-400/35 hover:text-white'
				: isLight
					? 'mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-800 transition hover:border-primary/20 hover:text-primary'
					: 'mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white transition hover:border-primary/20 hover:text-primary';
	const stageClass = isLight
		? 'relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[rgba(255,255,255,0.92)] shadow-[0_24px_70px_rgba(32,51,74,0.12)]'
		: 'relative overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(14,15,18,0.88)] shadow-[0_24px_70px_rgba(0,0,0,0.34)]';
	const stageStatusChipClass = isLight
		? 'rounded-full border border-slate-200/80 bg-white/86 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-600'
		: 'rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/65';
	const stageInfoChipClass = isLight ? 'rounded-full border border-slate-200/80 bg-slate-50/88 px-4 py-2' : 'rounded-full border border-white/10 bg-black/22 px-4 py-2';
	const repeatModeChipClass =
		player?.repeatMode && player.repeatMode !== 'off'
			? isLight
				? 'rounded-full border border-primary/25 bg-primary/12 px-4 py-2 text-primary'
				: 'rounded-full border border-secondary/25 bg-secondary/12 px-4 py-2 text-secondary'
			: stageInfoChipClass;
	const artworkBackdropClass = isLight
		? 'absolute inset-y-8 right-8 left-8 rounded-[2rem] border border-slate-200/80 bg-[rgba(241,245,249,0.86)] shadow-[0_24px_90px_rgba(32,51,74,0.16)] backdrop-blur-md'
		: 'absolute inset-y-8 right-8 left-8 rounded-[2rem] border border-white/10 bg-black/25 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-md';
	const artworkFrameClass = isLight
		? 'relative aspect-[0.86] w-full max-w-[320px] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[rgba(255,255,255,0.88)] shadow-[0_24px_90px_rgba(32,51,74,0.16)]'
		: 'relative aspect-[0.86] w-full max-w-[320px] overflow-hidden rounded-[2rem] border border-white/12 bg-[rgba(255,255,255,0.03)] shadow-[0_24px_90px_rgba(0,0,0,0.45)]';
	const statCardClass = isLight
		? 'rounded-[1.6rem] border border-slate-200/80 bg-white/88 p-5 shadow-[0_18px_50px_rgba(32,51,74,0.1)]'
		: 'rounded-[1.6rem] border border-white/10 bg-[rgba(18,19,22,0.82)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.26)]';
	const queuePanelClass = isLight
		? 'w-full min-w-0 rounded-[1.9rem] border border-slate-200/80 bg-white/92 p-5 shadow-[0_22px_65px_rgba(32,51,74,0.12)]'
		: 'w-full min-w-0 rounded-[1.9rem] border border-white/10 bg-[rgba(18,19,22,0.84)] p-5 shadow-[0_22px_65px_rgba(0,0,0,0.34)]';
	const queueBadgeClass = isLight
		? 'rounded-full border border-slate-200/80 bg-slate-50/88 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500'
		: 'rounded-full border border-white/10 bg-black/18 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/64';
	const queueRowClass = isLight
		? 'flex min-w-0 items-center gap-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50/86 px-3 py-3 transition hover:border-slate-300'
		: 'flex min-w-0 items-center gap-3 rounded-[1.35rem] border border-white/8 bg-black/18 px-3 py-3 transition hover:border-white/12';
	const premiumPanelClass = isLight
		? 'w-full min-w-0 rounded-[1.9rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,255,0.92))] p-5 shadow-[0_22px_65px_rgba(32,51,74,0.12)]'
		: 'w-full min-w-0 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,19,22,0.84),rgba(18,19,22,0.78))] p-5 shadow-[0_22px_65px_rgba(0,0,0,0.34)]';
	const insetPanelClass = isLight ? 'rounded-[1.3rem] border border-slate-200/80 bg-slate-50/86 px-4 py-4' : 'rounded-[1.3rem] border border-white/8 bg-black/18 px-4 py-4';
	const messageCardClass = isLight
		? 'mt-5 rounded-[1.25rem] border border-slate-200/80 bg-slate-50/86 px-4 py-3 text-sm text-slate-600'
		: 'mt-5 rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/58';
	const roundControlButtonClass = isLight
		? 'flex h-14 w-14 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-800 transition hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40'
		: 'flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40';
	const pillActionButtonClass = isLight
		? 'inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40'
		: 'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white transition hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40';
	const scrollToPremiumStudio = () => {
		const premiumStudio = document.getElementById('premium-studio');
		if (!premiumStudio) return;
		premiumStudio.scrollIntoView({ behavior: 'smooth', block: 'start' });
		window.history.replaceState(null, '', '#premium-studio');
	};
	const openSearchModal = () => setIsSearchModalOpen(true);
	const closeSearchModal = () => setIsSearchModalOpen(false);

	const sidebarPrimaryLinks: SidebarLink[] = [
		{ label: 'Home', caption: 'Main site', icon: 'home', href: publicSiteUrl, external: true },
		{ label: 'Overview', caption: 'Player control', icon: 'overview', href: overviewHref, active: true },
		{ label: 'Servers', caption: 'Switch guild', icon: 'servers', href: '/servers' },
		{
			label: 'Guild settings',
			caption: selectedGuild?.canManage ? 'Tune this server' : 'Requires Manage Guild',
			icon: 'settings',
			href: selectedGuild?.canManage ? guildSettingsHref : undefined,
			disabled: !selectedGuild?.canManage,
		},
		{ label: 'Playlists', caption: 'Coming soon', icon: 'playlists', disabled: true, comingSoon: true },
	];
	const sidebarExploreLinks: SidebarLink[] = [
		{ label: 'Commands', caption: 'Public docs', icon: 'commands', href: `${publicSiteUrl}/commands`, external: true },
		{ label: 'Status', caption: 'System health', icon: 'status', href: `${publicSiteUrl}/status`, external: true },
	];
	const sidebarFooterLinks: SidebarLink[] = [
		{ label: 'Settings', caption: 'Account', icon: 'account', href: '/settings' },
		{ label: 'Help Center', caption: 'Support server', icon: 'support', href: SUPPORT_SERVER_URL, external: true },
	];

	const renderSidebarLink = (item: SidebarLink) => {
		const baseClassName = `group flex w-full items-center gap-3 rounded-[1.15rem] border px-3 py-3 text-left transition ${
			item.active
				? `border-primary/25 bg-primary/12 ${mainTextClass} shadow-[0_14px_40px_rgba(0,255,255,0.12)]`
				: item.disabled
					? isLight
						? 'border-slate-200/50 bg-transparent text-slate-400'
						: 'border-white/6 bg-transparent text-white/32'
					: isLight
						? 'border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-white/75 hover:text-slate-950'
						: 'border-transparent bg-transparent text-white/72 hover:border-white/8 hover:bg-white/[0.04] hover:text-white'
		}`;
		const content = (
			<>
				<div
					className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border ${
						item.active
							? 'border-primary/30 bg-primary/15 text-primary'
							: item.disabled
								? isLight
									? 'border-slate-200/60 bg-slate-100/80 text-slate-400'
									: 'border-white/5 bg-white/[0.02] text-white/25'
								: isLight
									? 'border-slate-200/80 bg-white/82 text-slate-700'
									: 'border-white/10 bg-white/[0.04] text-white/80'
					}`}
				>
					<DashboardSidebarIcon className="h-5 w-5" name={item.icon} />
				</div>
				<div className={`min-w-0 flex-1 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
					<div className="truncate text-sm font-bold tracking-[-0.02em]">{item.label}</div>
					<div className={`mt-1 truncate text-xs ${faintTextClass}`}>{item.caption}</div>
				</div>
				{!isSidebarCollapsed && item.comingSoon ? (
					<span className="rounded-full border border-secondary/25 bg-secondary/12 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-secondary">
						Soon
					</span>
				) : null}
			</>
		);

		if (!item.href || item.disabled) {
			return (
				<button className={baseClassName} disabled key={item.label} title={item.comingSoon ? 'Coming soon' : item.caption} type="button">
					{content}
				</button>
			);
		}

		const shouldOpenNewTab = item.icon === 'support';
		return (
			<Link
				className={baseClassName}
				href={item.href}
				key={item.label}
				prefetch={item.external ? false : undefined}
				rel={shouldOpenNewTab ? 'noreferrer' : undefined}
				target={shouldOpenNewTab ? '_blank' : undefined}
				title={item.caption}
			>
				{content}
			</Link>
		);
	};

	return (
		<div className="relative z-10 min-h-screen overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
			<div className={`mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1820px] flex-col overflow-hidden rounded-[2rem] border backdrop-blur-xl lg:flex-row ${frameClass}`}>
				<aside
					className={`relative flex min-h-0 shrink-0 flex-col overflow-y-auto border-b border-white/8 px-4 py-5 transition-[width] duration-300 [scrollbar-gutter:stable] lg:border-b-0 lg:border-r ${sidebarClass} ${
						isSidebarCollapsed ? 'w-full lg:w-[104px]' : 'w-full lg:w-[292px]'
					}`}
				>
					<div className="flex items-center justify-between gap-3">
						<Link
							className={`group flex min-w-0 flex-1 items-center gap-3 rounded-[1.2rem] border px-3 py-3 transition ${profileCardClass} ${
								isSidebarCollapsed ? 'justify-center px-0' : ''
							}`}
							href="/settings"
							title="Open account settings"
						>
							{isSidebarCollapsed ? null : authUser?.avatarUrl ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img alt={accountDisplayName} className="h-11 w-11 rounded-full border border-white/10 object-cover" src={authUser?.avatarUrl ?? undefined} />
							) : !isSidebarCollapsed ? (
								<div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/25 bg-primary/12 font-headline text-base font-bold text-primary">
									{accountDisplayName.slice(0, 1).toUpperCase()}
								</div>
							) : (
								<div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/25 bg-primary/12 text-primary">
									<DashboardSidebarIcon className="h-5 w-5" name="account" />
								</div>
							)}
							{isSidebarCollapsed ? null : (
								<>
									<div className="min-w-0 flex-1">
										<div className={`truncate text-sm font-bold ${mainTextClass}`}>{accountDisplayName}</div>
										<div className={`mt-1 truncate text-xs ${faintTextClass}`}>{accountHandle}</div>
									</div>
									<div className={`${microLabelClass} transition group-hover:text-primary`}>
										<DashboardSidebarIcon className="h-4 w-4" name="chevron" />
									</div>
								</>
							)}
						</Link>
						<button
							aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
							className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border transition lg:flex ${iconButtonClass}`}
							onClick={onSidebarToggle}
							type="button"
						>
							<div className={`${isSidebarCollapsed ? 'rotate-180' : ''} transition-transform duration-300`}>
								<DashboardSidebarIcon className="h-5 w-5" name="collapse" />
							</div>
						</button>
					</div>

					<div className="mt-8">
						<div className={`px-2 text-[11px] font-extrabold uppercase tracking-[0.24em] ${sidebarLabelClass} ${isSidebarCollapsed ? 'sr-only' : ''}`}>Workspace</div>
						<div className="mt-3 grid gap-2">{sidebarPrimaryLinks.map(renderSidebarLink)}</div>
					</div>

					<div className={`mt-4 border-t pt-4 ${dividerClass}`}>
						<div className={`px-2 text-[11px] font-extrabold uppercase tracking-[0.24em] ${sidebarLabelClass} ${isSidebarCollapsed ? 'sr-only' : ''}`}>Explore</div>
						<div className="mt-3 grid gap-2">{sidebarExploreLinks.map(renderSidebarLink)}</div>
					</div>

					<div className="mt-4 flex-1">
						{sidebarNotice && !isSidebarCollapsed ? (
							<div className={`rounded-[1.5rem] border p-4 ${noticeCardClass}`}>
								<div className="flex items-start justify-between gap-3">
									<span className={noticeBadgeClass}>{sidebarNotice.badge}</span>
									{sidebarNotice.dismissible ? (
										<button aria-label="Dismiss dashboard notice" className={noticeButtonClass} onClick={onDismissNotice} type="button">
											<PlayerControlIcon className="h-3.5 w-3.5" name="close" />
										</button>
									) : null}
								</div>
								<div className={`mt-4 text-base font-bold ${mainTextClass}`}>{sidebarNotice.title}</div>
								<p className={`mt-2 text-sm leading-6 ${subTextClass}`}>{sidebarNotice.body}</p>
								{sidebarNotice.actionLabel ? (
									<button className={noticeActionClass} onClick={sidebarNotice.tone === 'promo' ? scrollToPremiumStudio : onRefreshState} type="button">
										{sidebarNotice.actionLabel}
										<DashboardSidebarIcon className="h-3.5 w-3.5" name="chevron" />
									</button>
								) : null}
							</div>
						) : null}
					</div>

					<div className={`mt-4 border-t pt-4 ${dividerClass}`}>
						<div className="grid gap-2">{sidebarFooterLinks.map(renderSidebarLink)}</div>
					</div>
				</aside>

				<main className={`min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] ${workspaceClass}`}>
					<header
						className={`sticky top-0 z-10 border-b px-5 py-4 backdrop-blur-xl sm:px-6 lg:px-8 ${dividerClass} ${
							isLight ? 'bg-[rgba(248,250,252,0.78)]' : 'bg-[rgba(9,10,12,0.72)]'
						}`}
					>
						<div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
							<div className="min-w-0">
								<div className={`truncate font-headline text-2xl font-bold tracking-[-0.05em] sm:text-3xl ${mainTextClass}`}>
									Player control: <span className="text-primary">{selectedGuild?.name ?? 'Choose a server to start listening'}</span>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-3">
								<button className="ghost-button px-4 py-2 text-sm" onClick={openSearchModal} type="button">
									Search
								</button>
								<button className="ghost-button px-4 py-2 text-sm" onClick={onRefreshState} type="button">
									Refresh State
								</button>
								<Link className="ghost-button px-4 py-2 text-sm" href="/servers">
									Change Server
								</Link>
								<div className="relative min-w-[13rem]">
									<button
										aria-expanded={isBotMenuOpen}
										aria-haspopup="listbox"
										className="dashboard-select"
										onClick={onToggleBotMenu}
										ref={botMenuTriggerRef}
										type="button"
									>
										<span className="truncate pr-8">{selectedBot?.label ?? 'Select bot'}</span>
									</button>
									{isBotMenuOpen && botMenuPosition
										? createPortal(
												<div className="dashboard-select-menu max-h-72 overflow-y-auto" role="listbox" style={botMenuStyle}>
													{botOptions.map((bot) => (
														<button
															className={`dashboard-select-option ${formBotId === bot.botId ? 'dashboard-select-option-active' : ''}`}
															key={bot.botId}
															onClick={() => onSwitchBot(bot.botId)}
															role="option"
															type="button"
														>
															<span className="truncate">{bot.label}</span>
														</button>
													))}
												</div>,
												document.body
											)
										: null}
								</div>
							</div>
						</div>
					</header>

					<div className="px-5 py-5 sm:px-6 lg:px-8 lg:py-6">
						<div className="mx-auto grid w-full max-w-[1600px] gap-4 2xl:grid-cols-[minmax(0,1.14fr)_minmax(0,300px)]">
							<div className="grid gap-4">
								<article className={stageClass} key={playerSurfaceKey}>
									<div
										className="absolute inset-0"
										style={
											currentTrack?.artworkUrl
												? {
														backgroundImage: `linear-gradient(90deg, rgba(8,8,10,0.92) 0%, rgba(8,8,10,0.72) 38%, rgba(8,8,10,0.82) 100%), url(${currentTrack.artworkUrl})`,
														backgroundPosition: 'center',
														backgroundSize: 'cover',
													}
												: undefined
										}
									/>
									{!currentTrack?.artworkUrl ? (
										<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,255,0.16),transparent_24%),radial-gradient(circle_at_80%_10%,rgba(112,0,255,0.16),transparent_22%),linear-gradient(180deg,rgba(10,10,12,0.96),rgba(16,17,18,0.9))]" />
									) : null}

									<div className="relative grid min-h-[280px] gap-5 px-4 py-4 lg:grid-cols-[1.22fr_0.78fr] lg:px-5 lg:py-4">
										<div className="flex min-w-0 flex-col justify-end">
											<div className="mb-3 flex flex-wrap items-center gap-2">
												<span className="rounded-full border border-primary/25 bg-primary/12 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
													{currentTrack ? 'Now Playing' : 'Standby'}
												</span>
												<span className={stageStatusChipClass}>{player?.paused ? 'Paused' : currentTrack ? 'Live stream' : 'Waiting'}</span>
												{autoplayModeEnabled ? (
													<span className="rounded-full border border-secondary/25 bg-secondary/12 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-secondary">
														Autoplay On
													</span>
												) : null}
											</div>

											<div className="max-w-3xl">
												<h2
													className={`truncate font-headline text-[1.8rem] font-bold tracking-[-0.07em] sm:text-[2.15rem] xl:text-[2.9rem] ${mainTextClass}`}
												>
													{currentTrack?.title ?? 'No active player'}
												</h2>
												<p className={`mt-3 truncate text-lg sm:text-xl ${isLight ? 'text-slate-700' : 'text-white/74'}`}>
													{currentTrack?.artist ?? playerError ?? 'Join your voice channel from here or start playback in Discord.'}
												</p>
												<p className={`mt-3 text-sm leading-6 ${isLight ? 'text-slate-600' : 'text-white/56'}`}>
													{currentTrackRequester
														? `Requested by ${currentTrackRequester}`
														: selectedBot
															? `${selectedBot.label} is ready for live playback in this workspace.`
															: 'Select a bot instance to start controlling playback.'}
												</p>
											</div>

											<div className={`mt-4 flex flex-wrap gap-2.5 text-sm ${isLight ? 'text-slate-600' : 'text-white/68'}`}>
												<div className={stageInfoChipClass}>
													Queue · {queueCount} {queueCount === 1 ? 'track' : 'tracks'}
												</div>
												<div className={stageInfoChipClass}>Queued time · {formatDuration(queueDuration)}</div>
												<div className={repeatModeChipClass}>Repeat · {(player?.repeatMode ?? 'off').toUpperCase()}</div>
											</div>
										</div>

										<div className="relative hidden min-h-[190px] items-center justify-center lg:flex">
											<div className={artworkBackdropClass} />
											<div className={artworkFrameClass}>
												{currentTrack?.artworkUrl ? (
													// eslint-disable-next-line @next/next/no-img-element
													<img
														alt={currentTrack?.title ?? 'Current track artwork'}
														className="h-full w-full object-cover"
														src={currentTrack?.artworkUrl ?? undefined}
													/>
												) : (
													<div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(22,24,27,0.95),rgba(12,13,15,0.98))]">
														<div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
															Lunio
														</div>
													</div>
												)}
											</div>
										</div>
									</div>
								</article>

								<article className={`rounded-[1.9rem] border p-4 ${panelClass}`}>
									<div className={`mb-4 flex items-center justify-between gap-4 text-sm font-bold ${isLight ? 'text-slate-600' : 'text-white/74'}`}>
										<span>{formatClock(syncedDisplayPosition)}</span>
										<span>{formatClock(trackDuration)}</span>
									</div>
									<div className="relative">
										<div className="h-2 rounded-full bg-white/10">
											<div className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-secondary" style={{ width: `${progressPercent}%` }} />
										</div>
										<input
											className="dashboard-range absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent"
											disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
											max={Math.max(trackDuration, 1000)}
											min={0}
											onChange={(event) => onScrubChange(Number(event.target.value))}
											onMouseDown={onScrubStart}
											onMouseUp={onSubmitSeek}
											onTouchEnd={onSubmitSeek}
											onTouchStart={onScrubStart}
											step={1000}
											type="range"
											value={Math.min(syncedDisplayPosition, Math.max(trackDuration, 1000))}
										/>
									</div>
									<div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,236px)] xl:items-start">
										<div className="flex min-w-0 flex-wrap items-center gap-3">
											{!isPlayerConnected ? (
												<button
													className="inline-flex min-h-[4.5rem] items-center justify-center rounded-full bg-primary px-8 text-sm font-extrabold uppercase tracking-[0.2em] text-black shadow-[0_18px_45px_rgba(0,255,255,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
													disabled={isBusy || !canUseJoinControl}
													onClick={() => onSendCommand('join')}
													type="button"
												>
													Join Voice
												</button>
											) : (
												<>
													<button
														aria-label="Shuffle"
														className={roundControlButtonClass}
														disabled={isBusy || queueCount <= 2 || !canUsePlayerDjControls}
														onClick={() => onSendCommand('shuffle')}
														type="button"
													>
														<PlayerControlIcon name="shuffle" />
													</button>
													<button
														aria-label="Previous"
														className={roundControlButtonClass}
														disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
														onClick={() => onSendCommand('previous')}
														type="button"
													>
														<PlayerControlIcon name="previous" />
													</button>
													<button
														aria-label={player?.paused ? 'Resume' : 'Pause'}
														className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full bg-primary text-black shadow-[0_22px_55px_rgba(0,255,255,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
														disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
														onClick={() => onSendCommand(player?.paused ? 'resume' : 'pause')}
														type="button"
													>
														<PlayerControlIcon className="h-6 w-6" name={player?.paused ? 'play' : 'pause'} />
													</button>
													<button
														aria-label="Skip"
														className={roundControlButtonClass}
														disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
														onClick={() => onSendCommand('skip')}
														type="button"
													>
														<PlayerControlIcon name="skip" />
													</button>
													<button
														aria-label={`Repeat mode: ${player?.repeatMode ?? 'off'}`}
														className={`relative flex h-14 w-14 items-center justify-center rounded-full border text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
															player?.repeatMode && player?.repeatMode !== 'off'
																? 'border-primary/25 bg-primary/12 text-primary'
																: 'border-white/10 bg-white/[0.04] hover:border-primary/20 hover:text-primary'
														}`}
														disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
														onClick={() => onSendCommand('repeat')}
														type="button"
													>
														<PlayerControlIcon name="repeat" />
														{player?.repeatMode === 'track' ? (
															<span className="pointer-events-none absolute bottom-[0.45rem] right-[0.5rem] text-[0.62rem] font-black leading-none text-current">
																1
															</span>
														) : player?.repeatMode === 'queue' ? (
															<span className="pointer-events-none absolute bottom-[0.55rem] left-1/2 -translate-x-1/2 text-[0.8rem] font-black leading-none text-current">
																.
															</span>
														) : null}
													</button>
												</>
											)}
										</div>

										<div className="flex min-w-0 flex-col gap-3 xl:w-full">
											<label className="block">
												<div className="mb-2 flex items-center justify-between gap-3">
													<span className={`text-xs font-extrabold uppercase tracking-[0.22em] ${isLight ? 'text-slate-500' : 'text-white/38'}`}>
														Volume
													</span>
													<span className={`text-sm font-bold ${mainTextClass}`}>{volumeDraft}%</span>
												</div>
												<input
													className="dashboard-range h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
													disabled={isBusy || player?.state !== 'CONNECTED' || !canUsePlayerDjControls}
													max={200}
													min={1}
													onChange={(event) => onVolumeDraftChange(Number(event.target.value))}
													onMouseUp={onSubmitVolume}
													onTouchEnd={onSubmitVolume}
													step={1}
													type="range"
													value={volumeDraft}
												/>
											</label>

											<div className="flex flex-wrap items-center gap-3">
												<button
													className={pillActionButtonClass}
													disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
													onClick={() => onSendCommand('stop')}
													type="button"
												>
													<PlayerControlIcon className="h-4 w-4" name="stop" />
													Stop
												</button>
												<button
													className={pillActionButtonClass}
													disabled={isBusy || !canUseLeaveControl}
													onClick={() => onSendCommand('leave')}
													type="button"
												>
													<PlayerControlIcon className="h-4 w-4" name="leave" />
													Leave
												</button>
											</div>
										</div>
									</div>

									{!hasVoiceChannelContext ? (
										<div className={messageCardClass}>Join a permitted voice channel to unlock the realtime controls from this dashboard.</div>
									) : player && !canUseDjControls ? (
										<div className={messageCardClass}>
											Lunio can see you, but DJ-gated playback controls are still restricted for your current voice context.
										</div>
									) : null}
								</article>

								<div className="grid gap-4 xl:grid-cols-4">
									<div className={statCardClass}>
										<div className={`text-[11px] font-extrabold uppercase tracking-[0.22em] ${microLabelClass}`}>Session</div>
										<div className={`mt-4 text-3xl font-headline font-bold tracking-[-0.06em] ${mainTextClass}`}>{activityState}</div>
										<div className={`mt-2 text-sm ${isLight ? 'text-slate-500' : 'text-white/52'}`}>
											{player?.voiceChannelId ? 'Voice channel attached' : 'Waiting for voice context'}
										</div>
									</div>
									<div className={statCardClass}>
										<div className={`text-[11px] font-extrabold uppercase tracking-[0.22em] ${microLabelClass}`}>Queue Time</div>
										<div className={`mt-4 text-3xl font-headline font-bold tracking-[-0.06em] ${mainTextClass}`}>{formatDuration(queueDuration)}</div>
										<div className={`mt-2 text-sm ${isLight ? 'text-slate-500' : 'text-white/52'}`}>{queueCount} tracks buffered</div>
									</div>
									<div className={statCardClass}>
										<div className={`text-[11px] font-extrabold uppercase tracking-[0.22em] ${microLabelClass}`}>Filters</div>
										<div className={`mt-4 text-3xl font-headline font-bold tracking-[-0.06em] ${mainTextClass}`}>{activePremiumFilters.length}</div>
										<div className={`mt-2 text-sm ${isLight ? 'text-slate-500' : 'text-white/52'}`}>
											{activePremiumFilters.length ? activePremiumFilters.join(', ') : 'No premium filters active'}
										</div>
									</div>
									<div className={statCardClass}>
										<div className={`text-[11px] font-extrabold uppercase tracking-[0.22em] ${microLabelClass}`}>Autoplay</div>
										<div className={`mt-4 text-3xl font-headline font-bold tracking-[-0.06em] ${mainTextClass}`}>
											{formatToggleState(player?.autoplayEnabled)}
										</div>
										<div className={`mt-2 text-sm ${isLight ? 'text-slate-500' : 'text-white/52'}`}>
											{currentTrack ? (currentTrackFromAutoplay ? 'Current track from autoplay' : 'Manual queue source') : 'No active track'}
										</div>
									</div>
								</div>

								<article className={`rounded-[1.8rem] border p-5 shadow-[0_22px_60px_rgba(0,0,0,0.26)] ${getCommandFeedbackToneClasses(commandFeedback.phase)}`}>
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div>
											<div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-current/72">Latest action</div>
											<h3 className="mt-3 font-headline text-2xl font-bold tracking-[-0.05em] text-white">{commandFeedback.title}</h3>
										</div>
										<span className="rounded-full border border-current/15 bg-black/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-current">
											{formatCommandFeedbackPhase(commandFeedback.phase)}
										</span>
									</div>
									<p className="mt-4 max-w-3xl text-sm leading-7 text-current/90">{commandFeedback.message}</p>
									<div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
										<div className="rounded-[1.15rem] border border-current/10 bg-black/10 px-4 py-3">
											<div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-current/70">Command</div>
											<div className="mt-2 text-sm font-bold text-white">
												{commandFeedback.commandType ? formatCommandTypeLabel(commandFeedback.commandType) : '--'}
											</div>
										</div>
										<div className="rounded-[1.15rem] border border-current/10 bg-black/10 px-4 py-3">
											<div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-current/70">Command ID</div>
											<div className="mt-2 text-sm font-bold text-white">{formatShortCommandId(commandFeedback.commandId)}</div>
										</div>
										<div className="rounded-[1.15rem] border border-current/10 bg-black/10 px-4 py-3">
											<div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-current/70">Instance</div>
											<div className="mt-2 text-sm font-bold text-white">{commandFeedback.instanceId ?? '--'}</div>
										</div>
										<div className="rounded-[1.15rem] border border-current/10 bg-black/10 px-4 py-3">
											<div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-current/70">Finished</div>
											<div className="mt-2 text-sm font-bold text-white">{commandFinishedTime}</div>
										</div>
									</div>
								</article>
							</div>

							<aside className="grid min-w-0 gap-6">
								<article className={queuePanelClass}>
									<div className="flex items-center justify-between gap-4">
										<div>
											<div className={`text-[11px] font-extrabold uppercase tracking-[0.22em] ${microLabelClass}`}>Up Next</div>
											<h3 className={`mt-2 font-headline text-3xl font-bold tracking-[-0.05em] ${mainTextClass}`}>Upcoming Queue</h3>
										</div>
										<div className={queueBadgeClass}>{queueCount} tracks</div>
									</div>
									<div className="mt-5 space-y-3">
										{queuePreview.length ? (
											queuePreview.map((track, index) => (
												<div className={queueRowClass} key={`${track.url}-${index}`}>
													{track.artworkUrl ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img alt={track.title} className="h-14 w-14 rounded-[1rem] border border-white/10 object-cover" src={track.artworkUrl} />
													) : (
														<div className="flex h-14 w-14 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
															{String(index + 1).padStart(2, '0')}
														</div>
													)}
													<div className="min-w-0 flex-1">
														<div className={`truncate text-lg font-bold ${mainTextClass}`}>{track.title}</div>
														<div className={`mt-1 truncate text-sm ${isLight ? 'text-slate-500' : 'text-white/48'}`}>{track.artist}</div>
													</div>
													<div className="ml-2 flex flex-col items-end gap-2">
														<div className={`text-sm font-bold ${isLight ? 'text-slate-600' : 'text-white/68'}`}>{formatDuration(track.duration)}</div>
														<button
															aria-label={`Remove ${track.title} from queue`}
															className={`${roundControlButtonClass} h-9 w-9`}
															disabled={isBusy || !canUsePlayerDjControls}
															onClick={() => onRemoveQueuedTrack(index)}
															type="button"
														>
															<PlayerControlIcon className="h-4 w-4" name="close" />
														</button>
													</div>
												</div>
											))
										) : (
											<div
												className={`rounded-[1.35rem] border px-4 py-6 text-sm leading-7 ${softSurfaceClass} ${isLight ? 'text-slate-500' : 'text-white/54'}`}
											>
												No queued tracks yet. Add music from Discord and the queue will appear here in realtime.
											</div>
										)}
									</div>
								</article>

								<article className={`${premiumPanelClass} scroll-mt-6`} id="premium-studio">
									<div className="flex items-start justify-between gap-4">
										<div>
											<div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-secondary">Premium Studio</div>
											<h3 className={`mt-2 font-headline text-3xl font-bold tracking-[-0.05em] ${mainTextClass}`}>Live premium controls</h3>
										</div>
										<div className="rounded-full border border-secondary/25 bg-secondary/12 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-secondary">
											{canUsePremiumControls ? 'Unlocked' : 'Standard'}
										</div>
									</div>
									<p className={`mt-4 text-sm leading-7 ${isLight ? 'text-slate-600' : 'text-white/56'}`}>
										{!canUsePremiumControls
											? 'Premium is not active for this user or guild right now.'
											: canUseDjControls
												? 'You can tune premium playback directly from the dashboard.'
												: 'Premium is active, but DJ-gated controls are currently unavailable.'}
									</p>

									<div className="mt-5 grid gap-3">
										<button
											className="secondary-button w-full justify-center"
											disabled={isBusy || !authUser || !canUseAutoplayControl}
											onClick={() =>
												onSendPremiumControl('autoplay', {
													enabled: !autoplayModeEnabled,
												})
											}
											type="button"
										>
											{autoplayModeEnabled ? 'Turn Autoplay Off' : 'Turn Autoplay On'}
										</button>
										<label className={`block ${insetPanelClass}`}>
											<div className="flex items-center justify-between gap-3">
												<span className="field-label">Bassboost</span>
												<span className={`text-sm font-bold ${mainTextClass}`}>{bassboostDraft}</span>
											</div>
											<input
												className="dashboard-range mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
												disabled={isBusy || !authUser || !canUsePremiumDjControls}
												max={3}
												min={-3}
												onChange={(event) => onBassboostDraftChange(Number(event.target.value))}
												onMouseUp={() =>
													onSendPremiumControl('bassboost', {
														level: bassboostDraft,
													})
												}
												onTouchEnd={() =>
													onSendPremiumControl('bassboost', {
														level: bassboostDraft,
													})
												}
												step={1}
												type="range"
												value={bassboostDraft}
											/>
										</label>

										<label className={`block ${insetPanelClass}`}>
											<div className="flex items-center justify-between gap-3">
												<span className="field-label">Speed</span>
												<span className={`text-sm font-bold ${mainTextClass}`}>{speedDraft.toFixed(1)}x</span>
											</div>
											<input
												className="dashboard-range mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
												disabled={isBusy || !authUser || !canUsePremiumDjControls}
												max={2}
												min={0.1}
												onChange={(event) => onSpeedDraftChange(Number(event.target.value))}
												onMouseUp={() =>
													onSendPremiumControl('speed', {
														value: Number(speedDraft.toFixed(1)),
													})
												}
												onTouchEnd={() =>
													onSendPremiumControl('speed', {
														value: Number(speedDraft.toFixed(1)),
													})
												}
												step={0.1}
												type="range"
												value={speedDraft}
											/>
										</label>

										<div className="grid grid-cols-2 gap-3">
											<button
												className="dashboard-mini-button"
												disabled={isBusy || !authUser || !canUsePremiumDjControls}
												onClick={() =>
													onSendPremiumControl('filter', {
														filter: 'nightcore',
														enabled: !playerFilters.nightcore.enabled,
													})
												}
												type="button"
											>
												{playerFilters.nightcore.enabled ? 'Nightcore Off' : 'Nightcore On'}
											</button>
											<button
												className="dashboard-mini-button"
												disabled={isBusy || !authUser || !canUsePremiumDjControls}
												onClick={() =>
													onSendPremiumControl('filter', {
														filter: 'vaporwave',
														enabled: !playerFilters.vaporwave.enabled,
													})
												}
												type="button"
											>
												{playerFilters.vaporwave.enabled ? 'Vaporwave Off' : 'Vaporwave On'}
											</button>
											<button
												className="dashboard-mini-button"
												disabled={isBusy || !authUser || !canUsePremiumDjControls}
												onClick={() =>
													onSendPremiumControl('filter', {
														filter: 'demon',
														enabled: !playerFilters.demon.enabled,
													})
												}
												type="button"
											>
												{playerFilters.demon.enabled ? 'Demon Off' : 'Demon On'}
											</button>
											<button
												className="dashboard-mini-button"
												disabled={isBusy || !authUser || !canUsePremiumDjControls}
												onClick={() => onSendPremiumControl('filter/reset', {})}
												type="button"
											>
												Reset Filters
											</button>
										</div>
									</div>

									<div className={`mt-5 rounded-[1.3rem] border px-4 py-3 text-sm leading-7 ${softSurfaceClass} ${isLight ? 'text-slate-600' : 'text-white/56'}`}>
										{activePremiumFilters.length ? `Active now: ${activePremiumFilters.join(', ')}` : 'No premium filters are active right now.'}
									</div>

									{selectedGuild?.canManage ? (
										<Link className="secondary-button mt-5 w-full justify-center" href={guildSettingsHref}>
											Open Guild Settings
										</Link>
									) : (
										<div
											className={`mt-5 rounded-[1.3rem] border px-4 py-3 text-sm leading-7 ${softSurfaceClass} ${isLight ? 'text-slate-600' : 'text-white/56'}`}
										>
											Premium filters are controlled from Discord commands by members with the right access.
										</div>
									)}
								</article>
							</aside>
						</div>
					</div>
				</main>
			</div>
			{isSearchModalOpen
				? createPortal(
						<div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={closeSearchModal}>
							<div
								className={`w-full max-w-xl rounded-[1.75rem] border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] ${panelClass}`}
								onClick={(event) => event.stopPropagation()}
							>
								<div className="flex items-start justify-between gap-4">
									<div>
										<div className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Search tracks</div>
										<h2 className={`mt-3 font-headline text-3xl font-bold tracking-[-0.05em] ${mainTextClass}`}>Coming soon</h2>
									</div>
									<button
										aria-label="Close search modal"
										className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${iconButtonClass}`}
										onClick={closeSearchModal}
										type="button"
									>
										<PlayerControlIcon className="h-4 w-4" name="close" />
									</button>
								</div>
								<p className={`mt-4 text-sm leading-7 ${subTextClass}`}>
									Track search from the dashboard is planned next. This modal is the future entry point for searching songs and queueing them directly from the
									web player.
								</p>
								<div className={`mt-5 rounded-[1.35rem] border px-4 py-4 ${softSurfaceClass}`}>
									<div className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">Preview</div>
									<input className="field-input mt-3" disabled placeholder="Search by title, artist or URL" type="text" value="" />
									<div className={`mt-3 text-sm ${faintTextClass}`}>The backend search endpoint is not live yet, so this is temporarily disabled.</div>
								</div>
								<div className="mt-6 flex justify-end">
									<button className="ghost-button px-4 py-2 text-sm" onClick={closeSearchModal} type="button">
										Close
									</button>
								</div>
							</div>
						</div>,
						document.body
					)
				: null}
		</div>
	);
}
