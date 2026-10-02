'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { commitOnPointerRelease } from '@/lib/slider-commit';
import { Spinner } from '@/components/spinner';
import { ThinkingOrb } from '@/components/thinking-orb';
import { ListSkeleton } from '@/components/loading-skeleton';
import { useSiteLanguage } from '@/components/site-language-provider';
import { buildDashboardPath } from '@/lib/dashboard-routes';
import { formatTimeOfDay } from '@/lib/format';
import {
	formatDuration,
	type AuthGuild,
	type AuthUser,
	type CommandFeedback,
	type GuildPlayerState,
	type SearchPlaylistResult,
	type SearchTrackResult,
	type Track,
} from '@/lib/api';
import { formatCommandFeedbackPhase, formatCommandTypeLabel, formatShortCommandId } from '@/lib/command-feedback';
import { DashboardWorkspaceShell } from './dashboard-workspace-shell';

type BotOption = {
	botId: string;
	label: string;
	avatarUrl?: string | null;
};

type PlayerAction = 'join' | 'leave' | 'previous' | 'skip' | 'shuffle' | 'repeat' | 'pause' | 'resume' | 'stop';
type PremiumAction = 'autoplay' | 'bassboost' | 'speed' | 'filter' | 'filter/reset';
type PlayerIconName = 'previous' | 'pause' | 'play' | 'skip' | 'shuffle' | 'repeat' | 'stop' | 'leave' | 'close' | 'search' | 'refresh' | 'volume' | 'music' | 'info' | 'plus';

export type DashboardNotice = {
	title: string;
	body: string;
	tone: 'warning' | 'error';
};

const SLIDER_COMMIT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);
const CONFIRM_WINDOW_MS = 4000;

function formatClock(ms: number | null | undefined) {
	if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) return '--:--';
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function sliderFill(value: number, min: number, max: number): CSSProperties {
	const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
	return { '--fill': `${Math.max(0, Math.min(100, percent))}%` } as CSSProperties;
}

function onSliderKeyUp(commit: (value: number) => void) {
	return (event: KeyboardEvent<HTMLInputElement>) => {
		if (SLIDER_COMMIT_KEYS.has(event.key)) commit(Number(event.currentTarget.value));
	};
}

const PENDING_COMMAND_PHASES = new Set<CommandFeedback['phase']>(['sending', 'accepted', 'received']);

export function PlayerControlIcon({ name, className = 'h-5 w-5' }: { name: PlayerIconName; className?: string }) {
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
					<rect x="6.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
					<rect x="14" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
				</svg>
			);
		case 'play':
			return (
				<svg {...sharedProps}>
					<path d="M8 5.75v12.5L18 12 8 5.75Z" fill="currentColor" stroke="none" />
				</svg>
			);
		case 'previous':
			return (
				<svg {...sharedProps}>
					<path d="M18 6.5v11L9.5 12 18 6.5Z" fill="currentColor" stroke="none" />
					<path d="M6.5 6.5v11" />
				</svg>
			);
		case 'skip':
			return (
				<svg {...sharedProps}>
					<path d="M6 6.5v11l8.5-5.5L6 6.5Z" fill="currentColor" stroke="none" />
					<path d="M17.5 6.5v11" />
				</svg>
			);
		case 'shuffle':
			return (
				<svg {...sharedProps}>
					<path d="M16 4h4v4" />
					<path d="M4 18.5 20 4" />
					<path d="M16 20h4v-4" />
					<path d="m14.5 14.5 5.5 5.5" />
					<path d="M4 5.5l5 5" />
				</svg>
			);
		case 'repeat':
			return (
				<svg {...sharedProps}>
					<path d="m17 3 3 3-3 3" />
					<path d="M4 11V9a3 3 0 0 1 3-3h13" />
					<path d="m7 21-3-3 3-3" />
					<path d="M20 13v2a3 3 0 0 1-3 3H4" />
				</svg>
			);
		case 'stop':
			return (
				<svg {...sharedProps}>
					<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
				</svg>
			);
		case 'leave':
			return (
				<svg {...sharedProps}>
					<path d="M10 5H7.5A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19H10" />
					<path d="m14 8 4 4-4 4" />
					<path d="M9.5 12H18" />
				</svg>
			);
		case 'close':
			return (
				<svg {...sharedProps}>
					<path d="M6 6l12 12" />
					<path d="M18 6 6 18" />
				</svg>
			);
		case 'search':
			return (
				<svg {...sharedProps}>
					<circle cx="11" cy="11" r="6.5" />
					<path d="m20 20-4.35-4.35" />
				</svg>
			);
		case 'refresh':
			return (
				<svg {...sharedProps}>
					<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
					<path d="M4 4v4h4" />
					<path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
					<path d="M20 20v-4h-4" />
				</svg>
			);
		case 'volume':
			return (
				<svg {...sharedProps}>
					<path d="M5 10v4h3l4 3.5v-11L8 10H5Z" />
					<path d="M16 9a4 4 0 0 1 0 6" />
				</svg>
			);
		case 'music':
			return (
				<svg {...sharedProps}>
					<path d="M9 18V6l10-2v12" />
					<circle cx="6.5" cy="18" r="2.5" />
					<circle cx="16.5" cy="16" r="2.5" />
				</svg>
			);
		case 'info':
			return (
				<svg {...sharedProps}>
					<circle cx="12" cy="12" r="8.5" />
					<path d="M12 11v5" />
					<path d="M12 8h.01" />
				</svg>
			);
		case 'plus':
			return (
				<svg {...sharedProps}>
					<path d="M12 5v14" />
					<path d="M5 12h14" />
				</svg>
			);
	}
}

function Artwork({ src, size, className = '' }: { src?: string | null; size: number; className?: string }) {
	if (src) {
		// eslint-disable-next-line @next/next/no-img-element
		return <img alt="" className={`shrink-0 object-cover ${className}`} height={size} loading="lazy" src={src} width={size} />;
	}

	return (
		<div aria-hidden="true" className={`flex shrink-0 items-center justify-center bg-[var(--dash-active)] text-muted ${className}`}>
			<PlayerControlIcon className="h-1/3 w-1/3" name="music" />
		</div>
	);
}

function StatusDot({ tone }: { tone: 'live' | 'paused' | 'idle' | 'offline' }) {
	const color = tone === 'live' ? 'bg-success' : tone === 'paused' ? 'bg-amber-400' : tone === 'idle' ? 'bg-primary' : 'bg-muted';
	return <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${color}`} />;
}

export type DashboardPlayerLayoutProps = {
	activePremiumFilters: string[];
	activityState: 'Offline' | 'Paused' | 'Live' | 'Idle';
	authUser: AuthUser | null;
	autoplayModeEnabled: boolean;
	bassboostDraft: number;
	botOptions: BotOption[];
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
	isBusy: boolean;
	notice: DashboardNotice | null;
	player: GuildPlayerState | null;
	playerFilters: GuildPlayerState['filters'];
	queueCount: number;
	queueDuration: number;
	queueTracks: Track[];
	queueingSearchUrl: string | null;
	searchError: string | null;
	searchPlaylist: SearchPlaylistResult | null;
	searchQuery: string;
	searchResults: SearchTrackResult[];
	selectedBot: BotOption | null;
	selectedGuild: AuthGuild | null;
	speedDraft: number;
	syncedDisplayPosition: number;
	trackDuration: number;
	volumeDraft: number;
	isSearchLoading: boolean;
	onBassboostDraftChange: (value: number) => void;
	onRefreshState: () => void;
	isRefreshingState: boolean;
	onRemoveQueuedTrack: (index: number) => void;
	onScrubChange: (value: number) => void;
	onScrubStart: () => void;
	onSearchReset: () => void;
	onSearchQueryChange: (value: string) => void;
	onSearchResultAdd: (trackUrl: string, trackData?: Record<string, unknown> | null) => Promise<boolean>;
	onSearchSubmit: () => void;
	onSendCommand: (action: PlayerAction) => void;
	onSendPremiumControl: (action: PremiumAction, body: Record<string, unknown>) => void;
	onSpeedDraftChange: (value: number) => void;
	onSubmitSeek: (position?: number) => void;
	onSubmitVolume: (volume?: number) => void;
	onSwitchBot: (botId: string) => void;
	onVolumeDraftChange: (value: number) => void;
};

export function DashboardPlayerLayout(props: DashboardPlayerLayoutProps) {
	const {
		activePremiumFilters,
		activityState,
		authUser,
		autoplayModeEnabled,
		bassboostDraft,
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
		isBusy,
		notice,
		player,
		playerFilters,
		queueCount,
		queueDuration,
		queueTracks,
		queueingSearchUrl,
		searchError,
		searchPlaylist,
		searchQuery,
		searchResults,
		selectedBot,
		selectedGuild,
		speedDraft,
		syncedDisplayPosition,
		trackDuration,
		volumeDraft,
		isSearchLoading,
		onBassboostDraftChange,
		onRefreshState,
		isRefreshingState,
		onRemoveQueuedTrack,
		onScrubChange,
		onScrubStart,
		onSearchReset,
		onSearchQueryChange,
		onSearchResultAdd,
		onSearchSubmit,
		onSendCommand,
		onSendPremiumControl,
		onSpeedDraftChange,
		onSubmitSeek,
		onSubmitVolume,
		onSwitchBot,
		onVolumeDraftChange,
	} = props;
	const { language } = useSiteLanguage();
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [pendingConfirm, setPendingConfirm] = useState<'stop' | 'leave' | null>(null);
	const searchDialogRef = useRef<HTMLDialogElement | null>(null);
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const lastAutoSearchQueryRef = useRef('');

	const guildSettingsHref = buildDashboardPath(formBotId, formGuildId, 'settings');
	const isPlayerConnected = player?.state === 'CONNECTED';
	const repeatMode = player?.repeatMode ?? 'off';
	const isRepeatPending = commandFeedback.commandType === 'PLAYER_REPEAT' && PENDING_COMMAND_PHASES.has(commandFeedback.phase);
	const statusTone = activityState === 'Live' ? 'live' : activityState === 'Paused' ? 'paused' : activityState === 'Idle' ? 'idle' : 'offline';
	const statusLabel = activityState === 'Live' ? 'Playing' : activityState === 'Idle' ? 'Connected' : activityState;
	const seekMax = Math.max(trackDuration, 1000);
	const seekValue = Math.min(syncedDisplayPosition, seekMax);
	const searchDisabledReason = !authUser
		? 'Sign in with Discord to search and queue tracks.'
		: !selectedGuild
			? 'Select a server before searching.'
			: !hasVoiceChannelContext
				? 'Join a voice channel Lunio can use, then search again.'
				: null;
	const permissionHint = !authUser
		? 'Sign in with Discord to control playback from here.'
		: !hasVoiceChannelContext
			? 'Join a voice channel in this server to unlock playback controls.'
			: player && !canUseDjControls
				? 'Playback controls need the DJ role (or the server’s DJ rules) for your current voice channel.'
				: null;

	// Debounced search while the dialog is open.
	useEffect(() => {
		if (!isSearchOpen) {
			lastAutoSearchQueryRef.current = '';
			return;
		}
		const trimmedQuery = searchQuery.trim();
		if (trimmedQuery.length < 3 || searchDisabledReason || isSearchLoading || trimmedQuery === lastAutoSearchQueryRef.current) return;

		const timeout = window.setTimeout(() => {
			lastAutoSearchQueryRef.current = trimmedQuery;
			onSearchSubmit();
		}, 320);

		return () => window.clearTimeout(timeout);
	}, [isSearchLoading, isSearchOpen, onSearchSubmit, searchDisabledReason, searchQuery]);

	useEffect(() => {
		const dialog = searchDialogRef.current;
		if (!dialog) return;
		if (isSearchOpen && !dialog.open) {
			dialog.showModal();
			searchInputRef.current?.focus();
		}
		if (!isSearchOpen && dialog.open) dialog.close();
	}, [isSearchOpen]);

	useEffect(() => {
		if (!pendingConfirm) return;
		const timeout = window.setTimeout(() => setPendingConfirm(null), CONFIRM_WINDOW_MS);
		return () => window.clearTimeout(timeout);
	}, [pendingConfirm]);

	const openSearch = () => {
		lastAutoSearchQueryRef.current = '';
		onSearchReset();
		setIsSearchOpen(true);
	};
	const closeSearch = () => {
		setIsSearchOpen(false);
		onSearchReset();
	};

	const confirmThen = (action: 'stop' | 'leave') => {
		if (pendingConfirm === action) {
			setPendingConfirm(null);
			onSendCommand(action);
			return;
		}
		setPendingConfirm(action);
	};

	const headerActions = (
		<>
			<button className="dash-btn" onClick={openSearch} type="button">
				<PlayerControlIcon className="h-4 w-4" name="search" />
				Search Tracks
			</button>
			<button
				aria-label={isRefreshingState ? 'Refreshing player state' : 'Refresh player state'}
				className="dash-btn dash-btn-icon"
				disabled={isRefreshingState}
				onClick={onRefreshState}
				title="Refresh player state"
				type="button"
			>
				{isRefreshingState ? <ThinkingOrb /> : <PlayerControlIcon className="h-4 w-4" name="refresh" />}
			</button>
			{botOptions.length > 1 ? (
				<>
					<label className="sr-only" htmlFor="dashboard-bot-select">
						Bot
					</label>
					<select className="dash-select" id="dashboard-bot-select" name="bot" onChange={(event) => onSwitchBot(event.target.value)} value={formBotId}>
						{botOptions.map((bot) => (
							<option key={bot.botId} value={bot.botId}>
								{bot.label}
							</option>
						))}
					</select>
				</>
			) : null}
		</>
	);

	return (
		<DashboardWorkspaceShell
			activeKey="overview"
			botId={formBotId}
			canManageGuild={selectedGuild?.canManage}
			guildId={formGuildId}
			headerActions={headerActions}
			hideMiniPlayerBar
			subtitle={selectedGuild ? `${selectedGuild.name}${selectedBot ? ` · ${selectedBot.label}` : ''}` : 'Live playback, queue, and sound controls'}
			title="Overview"
		>
			<div className="grid gap-6">
				{notice ? (
					<div
						className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center ${
							notice.tone === 'error' ? 'border-danger/35 bg-danger/[0.08]' : 'border-amber-400/35 bg-amber-400/[0.08]'
						}`}
						role={notice.tone === 'error' ? 'alert' : 'status'}
					>
						<PlayerControlIcon className={`h-5 w-5 shrink-0 ${notice.tone === 'error' ? 'text-danger' : 'text-amber-500'}`} name="info" />
						<div className="min-w-0 flex-1">
							<div className="text-sm font-semibold">{notice.title}</div>
							<p className="mt-0.5 break-words text-sm text-muted">{notice.body}</p>
						</div>
						<button className="dash-btn" disabled={isRefreshingState} onClick={onRefreshState} type="button">
							{isRefreshingState ? (
								<>
									<ThinkingOrb />
									Refreshing…
								</>
							) : (
								'Refresh State'
							)}
						</button>
					</div>
				) : null}

				<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
					<div className="grid min-w-0 gap-6">
						{/* Now playing */}
						<section aria-labelledby="now-playing-heading" className="dash-card p-5 sm:p-6">
							<div className="flex flex-col gap-6 sm:flex-row">
								<Artwork className="aspect-square w-28 rounded-lg sm:w-44" size={176} src={currentTrack?.artworkUrl} />

								<div className="flex min-w-0 flex-1 flex-col">
									<div className="flex flex-wrap items-center gap-2">
										<span className="dash-badge">
											<StatusDot tone={statusTone} />
											{statusLabel}
										</span>
										{autoplayModeEnabled ? <span className="dash-badge dash-badge-secondary">Autoplay</span> : null}
										{currentTrackFromAutoplay ? <span className="dash-badge">From autoplay</span> : null}
									</div>

									<h2 className="mt-3 truncate text-2xl font-semibold tracking-tight sm:text-[1.75rem]" id="now-playing-heading" title={currentTrack?.title}>
										{currentTrack?.title ?? (isPlayerConnected ? 'Nothing playing' : 'Lunio isn’t in a voice channel')}
									</h2>
									<p className="mt-1 truncate text-base text-muted" title={currentTrack?.artist}>
										{currentTrack?.artist ??
											(isPlayerConnected ? 'Search for a track or queue one from Discord.' : 'Join a voice channel, then bring Lunio in with Join Voice.')}
									</p>
									{currentTrackRequester ? <p className="mt-1 truncate text-sm text-muted">Requested by {currentTrackRequester}</p> : null}

									<div className="mt-auto pt-6">
										<input
											aria-label="Seek"
											aria-valuetext={`${formatClock(seekValue)} of ${formatClock(trackDuration)}`}
											className="dash-slider"
											disabled={!currentTrack || !canUsePlayerDjControls}
											max={seekMax}
											min={0}
											name="seek"
											onChange={(event) => onScrubChange(Number(event.target.value))}
											onKeyDown={(event) => SLIDER_COMMIT_KEYS.has(event.key) && onScrubStart()}
											onKeyUp={onSliderKeyUp(onSubmitSeek)}
											onPointerDown={(event) => {
												onScrubStart();
												commitOnPointerRelease(event, onSubmitSeek);
											}}
											step={1000}
											style={sliderFill(seekValue, 0, seekMax)}
											type="range"
											value={seekValue}
										/>
										<div className="mt-2 flex justify-between text-xs font-medium tabular-nums text-muted">
											<span>{formatClock(syncedDisplayPosition)}</span>
											<span>{formatClock(trackDuration)}</span>
										</div>
									</div>
								</div>
							</div>

							<div className="dash-divider mt-6 flex flex-col gap-5 border-t pt-5 lg:flex-row lg:items-center lg:justify-between">
								{isPlayerConnected ? (
									<div className="flex items-center justify-center gap-2 lg:justify-start">
										<button
											aria-label="Shuffle queue"
											className="dash-btn dash-btn-icon h-10 w-10 border-transparent bg-transparent"
											disabled={isBusy || queueCount <= 2 || !canUsePlayerDjControls}
											onClick={() => onSendCommand('shuffle')}
											title="Shuffle queue"
											type="button"
										>
											<PlayerControlIcon className="h-[18px] w-[18px]" name="shuffle" />
										</button>
										<button
											aria-label="Previous track"
											className="dash-btn dash-btn-icon h-10 w-10 border-transparent bg-transparent"
											disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
											onClick={() => onSendCommand('previous')}
											title="Previous track"
											type="button"
										>
											<PlayerControlIcon name="previous" />
										</button>
										<button
											aria-label={player?.paused ? 'Resume' : 'Pause'}
											className="dash-btn dash-btn-primary dash-btn-icon h-12 w-12 rounded-full"
											disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
											onClick={() => onSendCommand(player?.paused ? 'resume' : 'pause')}
											title={player?.paused ? 'Resume' : 'Pause'}
											type="button"
										>
											<PlayerControlIcon className="h-5 w-5" name={player?.paused ? 'play' : 'pause'} />
										</button>
										<button
											aria-label="Skip track"
											className="dash-btn dash-btn-icon h-10 w-10 border-transparent bg-transparent"
											disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
											onClick={() => onSendCommand('skip')}
											title="Skip track"
											type="button"
										>
											<PlayerControlIcon name="skip" />
										</button>
										<button
											aria-busy={isRepeatPending}
											aria-label={`Repeat: ${repeatMode}. Change repeat mode`}
											aria-pressed={repeatMode !== 'off'}
											className="dash-btn dash-btn-icon relative h-10 w-10 border-transparent bg-transparent"
											disabled={isBusy || isRepeatPending || !currentTrack || !canUsePlayerDjControls}
											onClick={() => onSendCommand('repeat')}
											title={isRepeatPending ? 'Updating repeat mode…' : `Repeat: ${repeatMode}`}
											type="button"
										>
											<PlayerControlIcon className={`h-[18px] w-[18px] ${isRepeatPending ? 'animate-pulse' : ''}`} name="repeat" />
											{repeatMode === 'track' ? (
												<span aria-hidden="true" className="absolute right-1 top-1 text-[9px] font-bold leading-none">
													1
												</span>
											) : null}
										</button>
									</div>
								) : (
									<button
										className="dash-btn dash-btn-primary h-10 px-5"
										disabled={isBusy || !canUseJoinControl}
										onClick={() => onSendCommand('join')}
										type="button"
									>
										Join Voice
									</button>
								)}

								<div className="flex flex-wrap items-center gap-3 lg:justify-end">
									<div className="flex min-w-[12rem] flex-1 items-center gap-3 lg:w-56 lg:flex-none">
										<PlayerControlIcon className="h-4 w-4 shrink-0 text-muted" name="volume" />
										<input
											aria-label="Volume"
											aria-valuetext={`${volumeDraft}%`}
											className="dash-slider"
											disabled={isBusy || !isPlayerConnected || !canUsePlayerDjControls}
											max={200}
											min={1}
											name="volume"
											onChange={(event) => onVolumeDraftChange(Number(event.target.value))}
											onKeyUp={onSliderKeyUp(onSubmitVolume)}
											onPointerDown={(event) => commitOnPointerRelease(event, onSubmitVolume)}
											step={1}
											style={sliderFill(volumeDraft, 1, 200)}
											type="range"
											value={volumeDraft}
										/>
										<span className="w-10 text-right text-xs font-medium tabular-nums text-muted">{volumeDraft}%</span>
									</div>
									{isPlayerConnected ? (
										<div className="flex items-center gap-2">
											<button
												className="dash-btn dash-btn-danger"
												disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
												onClick={() => confirmThen('stop')}
												type="button"
											>
												<PlayerControlIcon className="h-3.5 w-3.5" name="stop" />
												{pendingConfirm === 'stop' ? 'Confirm Stop' : 'Stop'}
											</button>
											<button
												className="dash-btn dash-btn-danger"
												disabled={isBusy || !canUseLeaveControl}
												onClick={() => confirmThen('leave')}
												type="button"
											>
												<PlayerControlIcon className="h-3.5 w-3.5" name="leave" />
												{pendingConfirm === 'leave' ? 'Confirm Leave' : 'Leave'}
											</button>
										</div>
									) : null}
								</div>
							</div>
							<p aria-live="polite" className="sr-only">
								{pendingConfirm === 'stop'
									? 'Press Confirm Stop to stop playback and clear the queue.'
									: pendingConfirm === 'leave'
										? 'Press Confirm Leave to disconnect Lunio from voice.'
										: ''}
							</p>

							{permissionHint ? (
								<div className="dash-inset mt-5 flex items-start gap-2.5 px-3 py-2.5 text-sm text-muted">
									<PlayerControlIcon className="mt-0.5 h-4 w-4 shrink-0" name="info" />
									<span>{permissionHint}</span>
								</div>
							) : null}
						</section>

						{/* Queue */}
						<section aria-labelledby="queue-heading" className="dash-card">
							<div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
								<div className="flex min-w-0 items-baseline gap-3">
									<h2 className="text-base font-semibold" id="queue-heading">
										Up Next
									</h2>
									<span className="text-sm tabular-nums text-muted">
										{queueCount} {queueCount === 1 ? 'track' : 'tracks'}
										{queueCount ? ` · ${formatDuration(queueDuration)}` : ''}
									</span>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									{repeatMode !== 'off' ? <span className="dash-badge dash-badge-primary">Repeat {repeatMode}</span> : null}
									{queueTracks.length ? (
										<button className="dash-btn h-8 px-3" onClick={openSearch} type="button">
											<PlayerControlIcon className="h-4 w-4" name="plus" />
											Add Tracks
										</button>
									) : null}
								</div>
							</div>

							{queueTracks.length ? (
								<ol className="dash-divider border-t">
									{queueTracks.map((track, index) => (
										<li
											className="dash-row dash-divider flex min-w-0 items-center gap-3 border-b px-5 py-2.5 last:border-b-0 sm:px-6"
											key={`${track.url}-${index}`}
										>
											<span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums text-muted">{index + 1}</span>
											<Artwork className="h-10 w-10 rounded-md" size={40} src={track.artworkUrl} />
											<div className="min-w-0 flex-1">
												<div className="truncate text-sm font-medium" title={track.title}>
													{track.title}
												</div>
												<div className="truncate text-xs text-muted">{track.artist}</div>
											</div>
											<span className="hidden shrink-0 text-xs tabular-nums text-muted sm:block">{formatDuration(track.duration)}</span>
											<button
												aria-label={`Remove “${track.title}” from queue`}
												className="dash-btn dash-btn-icon dash-btn-danger h-8 w-8 border-transparent bg-transparent text-muted"
												disabled={isBusy || !canUsePlayerDjControls}
												onClick={() => onRemoveQueuedTrack(index)}
												title="Remove from queue"
												type="button"
											>
												<PlayerControlIcon className="h-4 w-4" name="close" />
											</button>
										</li>
									))}
								</ol>
							) : (
								<div className="dash-divider flex flex-col items-center border-t px-6 py-12 text-center">
									<span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--dash-active)] text-muted">
										<PlayerControlIcon className="h-5 w-5" name="music" />
									</span>
									<p className="mt-3 text-sm font-medium">The queue is empty</p>
									<p className="mt-1 max-w-sm text-sm text-muted">Tracks you add here or from Discord show up in real time.</p>
									<button className="dash-btn mt-4" onClick={openSearch} type="button">
										<PlayerControlIcon className="h-4 w-4" name="plus" />
										Add Tracks
									</button>
								</div>
							)}
						</section>
					</div>

					<div className="grid min-w-0 gap-6">
						{/* Sound controls */}
						<section aria-labelledby="sound-heading" className="dash-card scroll-mt-6 p-5" id="premium-studio">
							<div className="flex items-center justify-between gap-3">
								<h2 className="text-base font-semibold" id="sound-heading">
									Sound
								</h2>
								<span className={`dash-badge ${canUsePremiumControls ? 'dash-badge-secondary' : ''}`}>{canUsePremiumControls ? 'Premium' : 'Premium only'}</span>
							</div>
							<p className="mt-1 text-sm text-muted">
								{!canUsePremiumControls
									? 'Upgrade this server to Premium to use autoplay and filters.'
									: canUseDjControls
										? 'Changes apply to the live player immediately.'
										: 'Premium is active, but you need DJ access in your voice channel.'}
							</p>

							<div className="mt-5 grid gap-5">
								<div className="flex items-center justify-between gap-3">
									<label className="text-sm font-medium" htmlFor="autoplay-switch">
										Autoplay
									</label>
									<button
										aria-checked={autoplayModeEnabled}
										className="dash-switch"
										disabled={isBusy || !authUser || !canUseAutoplayControl}
										id="autoplay-switch"
										onClick={() => onSendPremiumControl('autoplay', { enabled: !autoplayModeEnabled })}
										role="switch"
										type="button"
									/>
								</div>

								<div>
									<div className="flex items-center justify-between gap-3">
										<label className="text-sm font-medium" htmlFor="bassboost-slider">
											Bass Boost
										</label>
										<span className="text-xs font-medium tabular-nums text-muted">{bassboostDraft > 0 ? `+${bassboostDraft}` : bassboostDraft}</span>
									</div>
									<input
										className="dash-slider mt-3"
										disabled={isBusy || !authUser || !canUsePremiumDjControls}
										id="bassboost-slider"
										max={3}
										min={-3}
										name="bassboost"
										onChange={(event) => onBassboostDraftChange(Number(event.target.value))}
										onKeyUp={onSliderKeyUp(() => onSendPremiumControl('bassboost', { level: bassboostDraft }))}
										onPointerUp={() => onSendPremiumControl('bassboost', { level: bassboostDraft })}
										step={1}
										style={sliderFill(bassboostDraft, -3, 3)}
										type="range"
										value={bassboostDraft}
									/>
								</div>

								<div>
									<div className="flex items-center justify-between gap-3">
										<label className="text-sm font-medium" htmlFor="speed-slider">
											Speed
										</label>
										<span className="text-xs font-medium tabular-nums text-muted">{speedDraft.toFixed(1)}×</span>
									</div>
									<input
										className="dash-slider mt-3"
										disabled={isBusy || !authUser || !canUsePremiumDjControls}
										id="speed-slider"
										max={2}
										min={0.1}
										name="speed"
										onChange={(event) => onSpeedDraftChange(Number(event.target.value))}
										onKeyUp={onSliderKeyUp(() => onSendPremiumControl('speed', { value: Number(speedDraft.toFixed(1)) }))}
										onPointerUp={() => onSendPremiumControl('speed', { value: Number(speedDraft.toFixed(1)) })}
										step={0.1}
										style={sliderFill(speedDraft, 0.1, 2)}
										type="range"
										value={speedDraft}
									/>
								</div>

								<fieldset>
									<legend className="text-sm font-medium">Filters</legend>
									<div className="mt-3 grid grid-cols-3 gap-2">
										{(['nightcore', 'vaporwave', 'demon'] as const).map((filter) => (
											<button
												aria-pressed={Boolean(playerFilters[filter].enabled)}
												className="dash-btn px-2 capitalize"
												disabled={isBusy || !authUser || !canUsePremiumDjControls}
												key={filter}
												onClick={() => onSendPremiumControl('filter', { filter, enabled: !playerFilters[filter].enabled })}
												type="button"
											>
												{filter}
											</button>
										))}
									</div>
								</fieldset>
							</div>

							<div className="dash-divider mt-5 flex items-center justify-between gap-3 border-t pt-4">
								<span className="min-w-0 truncate text-xs text-muted">{activePremiumFilters.length ? activePremiumFilters.join(', ') : 'No filters active'}</span>
								<button
									className="dash-btn h-8 shrink-0 px-2.5 text-xs"
									disabled={isBusy || !authUser || !canUsePremiumDjControls || activePremiumFilters.length === 0}
									onClick={() => onSendPremiumControl('filter/reset', {})}
									type="button"
								>
									Reset Filters
								</button>
							</div>
							{selectedGuild?.canManage ? (
								<Link className="mt-3 inline-flex text-sm font-medium text-primary hover:underline" href={guildSettingsHref} prefetch={false}>
									Server settings →
								</Link>
							) : null}
						</section>

						{/* Latest action */}
						<section aria-labelledby="activity-heading" className="dash-card p-5">
							<div className="flex items-center justify-between gap-3">
								<h2 className="text-base font-semibold" id="activity-heading">
									Latest Action
								</h2>
								<span
									className={`dash-badge ${
										commandFeedback.phase === 'succeeded'
											? 'dash-badge-primary'
											: commandFeedback.phase === 'failed' || commandFeedback.phase === 'timed_out'
												? 'border-danger/35 bg-danger/10 text-danger'
												: ''
									}`}
								>
									{commandFeedback.phase === 'sending' ? <Spinner className="h-3 w-3" /> : null}
									{formatCommandFeedbackPhase(commandFeedback.phase)}
								</span>
							</div>
							<div aria-live="polite" className="mt-3">
								<p className="text-sm font-medium">{commandFeedback.title}</p>
								<p className="mt-1 break-words text-sm text-muted">{commandFeedback.message}</p>
							</div>
							<dl className="dash-divider mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm">
								<div className="min-w-0">
									<dt className="text-xs text-muted">Command</dt>
									<dd className="mt-0.5 truncate font-medium">{commandFeedback.commandType ? formatCommandTypeLabel(commandFeedback.commandType) : '—'}</dd>
								</div>
								<div className="min-w-0">
									<dt className="text-xs text-muted">Finished</dt>
									<dd className="mt-0.5 truncate font-medium tabular-nums">{formatTimeOfDay(commandFeedback.resultTimestamp, language)}</dd>
								</div>
								<div className="min-w-0">
									<dt className="text-xs text-muted">Command ID</dt>
									<dd className="mt-0.5 truncate font-mono text-xs" translate="no">
										{formatShortCommandId(commandFeedback.commandId)}
									</dd>
								</div>
								<div className="min-w-0">
									<dt className="text-xs text-muted">Instance</dt>
									<dd className="mt-0.5 truncate font-mono text-xs" translate="no">
										{commandFeedback.instanceId ?? '—'}
									</dd>
								</div>
							</dl>
						</section>
					</div>
				</div>
			</div>

			{/* Search dialog — native <dialog> gives focus trapping, Escape, and an inert background. */}
			<dialog
				aria-labelledby="search-dialog-title"
				className="dash-card m-auto w-[min(40rem,calc(100vw-2rem))] max-w-none overflow-hidden p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm"
				onClick={(event) => {
					if (event.target === event.currentTarget) closeSearch();
				}}
				onClose={() => {
					setIsSearchOpen(false);
					onSearchReset();
				}}
				ref={searchDialogRef}
			>
				{isSearchOpen ? (
					<div className="flex max-h-[min(40rem,calc(100dvh-4rem))] flex-col">
						<div className="flex items-center justify-between gap-4 px-5 pt-5">
							<h2 className="text-base font-semibold" id="search-dialog-title">
								Search Tracks
							</h2>
							<button aria-label="Close search" className="dash-btn dash-btn-icon h-8 w-8 border-transparent bg-transparent" onClick={closeSearch} type="button">
								<PlayerControlIcon className="h-4 w-4" name="close" />
							</button>
						</div>
						<form
							className="px-5 pt-3"
							onSubmit={(event) => {
								event.preventDefault();
								lastAutoSearchQueryRef.current = searchQuery.trim();
								onSearchSubmit();
							}}
							role="search"
						>
							<label className="sr-only" htmlFor="track-search-input">
								Search by title, artist, or URL
							</label>
							<div className="relative">
								<PlayerControlIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" name="search" />
								<input
									autoComplete="off"
									className="dash-input pl-9"
									disabled={Boolean(searchDisabledReason)}
									enterKeyHint="search"
									id="track-search-input"
									name="q"
									onChange={(event) => onSearchQueryChange(event.target.value)}
									placeholder="Song title, artist, or URL…"
									ref={searchInputRef}
									spellCheck={false}
									type="search"
									value={searchQuery}
								/>
							</div>
							<p aria-live="polite" className="mt-2 flex min-h-5 items-center gap-2 text-xs text-muted">
								{isSearchLoading ? <ThinkingOrb state="searching" /> : null}
								{searchDisabledReason ??
									(searchQuery.trim().length >= 3 ? (isSearchLoading ? 'Searching…' : 'Results update as you type.') : 'Type at least 3 characters.')}
							</p>
						</form>

						<div aria-busy={isSearchLoading} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
							{searchError ? (
								<div className="rounded-lg border border-danger/35 bg-danger/[0.08] px-3 py-2.5 text-sm" role="alert">
									{searchError}
								</div>
							) : null}

							{isSearchLoading && !searchResults.length && !searchPlaylist && !searchError ? <ListSkeleton action label="Loading track matches..." /> : null}

							{searchPlaylist ? (
								<div className={`dash-inset mb-3 flex items-center gap-3 p-3 ${isSearchLoading ? 'opacity-50' : ''}`}>
									<Artwork className="h-12 w-12 rounded-md" size={48} src={searchPlaylist.artworkUrl} />
									<div className="min-w-0 flex-1">
										<div className="text-xs font-medium text-primary">Playlist</div>
										<div className="truncate text-sm font-semibold">{searchPlaylist.title}</div>
										<div className="truncate text-xs text-muted">
											{searchPlaylist.author ? `${searchPlaylist.author} · ` : ''}
											{searchPlaylist.trackCount} tracks
										</div>
									</div>
									<button
										className="dash-btn dash-btn-primary"
										disabled={isBusy || isSearchLoading || Boolean(searchDisabledReason) || queueingSearchUrl === searchPlaylist.url}
										onClick={async () => {
											if (await onSearchResultAdd(searchPlaylist.url)) closeSearch();
										}}
										type="button"
									>
										{queueingSearchUrl === searchPlaylist.url ? (
											<>
												<ThinkingOrb />
												Adding…
											</>
										) : (
											'Add Playlist'
										)}
									</button>
								</div>
							) : null}

							{searchResults.length ? (
								<ul className={`grid gap-1 ${isSearchLoading ? 'opacity-50' : ''}`}>
									{searchResults.map((result, index) => {
										const isQueueingThisResult = queueingSearchUrl === result.url;
										return (
											<li
												className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-[var(--dash-subtle)]"
												key={`${result.url}|${result.title}|${result.artist}|${index}`}
											>
												<Artwork className="h-10 w-10 rounded-md" size={40} src={result.artworkUrl} />
												<div className="min-w-0 flex-1">
													<div className="truncate text-sm font-medium" title={result.title}>
														{result.title}
													</div>
													<div className="truncate text-xs text-muted">
														{result.artist} · <span className="tabular-nums">{formatDuration(result.duration)}</span>
													</div>
												</div>
												<button
													className="dash-btn h-8 px-3 text-xs"
													disabled={isBusy || isSearchLoading || Boolean(searchDisabledReason) || isQueueingThisResult}
													onClick={async () => {
														if (await onSearchResultAdd(result.url, result.trackData ?? null)) closeSearch();
													}}
													type="button"
												>
													{isQueueingThisResult ? (
														<>
															<ThinkingOrb className="h-4 w-4" />
															Adding…
														</>
													) : (
														'Add to Queue'
													)}
												</button>
											</li>
										);
									})}
								</ul>
							) : null}
						</div>
					</div>
				) : null}
			</dialog>
		</DashboardWorkspaceShell>
	);
}
