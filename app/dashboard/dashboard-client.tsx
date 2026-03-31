'use client';

import Link from 'next/link';
import { buildDashboardPath } from '@/lib/dashboard-routes';
import { getPreferredBotId as getPreferredBotFromList } from '@/lib/bot-preference';
import { DashboardRouteState } from '@/components/dashboard-route-state';
import { DashboardPlayerLayout } from './dashboard-player-layout';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
	apiJson,
	buildBotScopedPath,
	type BrokerCommandType,
	type CommandFeedback,
	formatDuration,
	type AcceptedCommandResponse,
	type AuthGuild,
	type AuthGuildsResponse,
	type AuthUser,
	type BotsResponse,
	type CommandStatus,
	type FrontendEvent,
	type GuildMetadata,
	type GuildPlayerState,
} from '@/lib/api';
import {
	buildAcceptedCommandFeedback,
	buildCommandFeedbackFromStatus,
	buildFailedCommandFeedback,
	buildSendingCommandFeedback,
	buildTimedOutCommandFeedback,
	DEFAULT_COMMAND_FEEDBACK,
	formatCommandFeedbackPhase,
	formatCommandTypeLabel,
	formatShortCommandId,
	getCommandFeedbackToneClasses,
} from '@/lib/command-feedback';

type DashboardState = {
	botId: string;
	guildId: string;
	userId: string;
	volume: string;
	seek: string;
};
type PlayerFilters = GuildPlayerState['filters'];
type PlayerCommandAction = 'join' | 'leave' | 'previous' | 'skip' | 'queue/remove' | 'shuffle' | 'repeat' | 'pause' | 'resume' | 'stop' | 'volume' | 'seek';
type PremiumControlAction = 'autoplay' | 'bassboost' | 'speed' | 'filter' | 'filter/reset';

const STORAGE_KEYS = {
	botId: 'lunio:web:botId',
	guildId: 'lunio:web:guildId',
	userId: 'lunio:web:userId',
	sidebarCollapsed: 'lunio:web:dashboardSidebarCollapsed',
	sidebarNoticeDismissed: 'lunio:web:dashboardSidebarNoticeDismissed',
};

const DEFAULT_STATE: DashboardState = {
	botId: '',
	guildId: '',
	userId: '',
	volume: '100',
	seek: '60000',
};
const DEFAULT_PLAYER_FILTERS: PlayerFilters = {
	bassBoost: { enabled: false, level: 0 },
	demon: { enabled: false, level: null },
	nightcore: { enabled: false, level: null },
	pitch: { enabled: false, level: null },
	speed: { enabled: false, level: 1 },
	vaporwave: { enabled: false, level: null },
};

const PLAYER_ACTION_COMMAND_TYPES: Record<PlayerCommandAction, BrokerCommandType> = {
	join: 'PLAYER_JOIN',
	leave: 'PLAYER_LEAVE',
	previous: 'PLAYER_PREVIOUS',
	skip: 'PLAYER_SKIP',
	'queue/remove': 'PLAYER_QUEUE_REMOVE',
	shuffle: 'PLAYER_SHUFFLE',
	repeat: 'PLAYER_REPEAT',
	pause: 'PLAYER_PAUSE',
	resume: 'PLAYER_RESUME',
	stop: 'PLAYER_STOP',
	volume: 'PLAYER_VOLUME',
	seek: 'PLAYER_SEEK',
};

const PREMIUM_ACTION_COMMAND_TYPES: Record<PremiumControlAction, BrokerCommandType> = {
	autoplay: 'PLAYER_AUTOPLAY',
	bassboost: 'PLAYER_BASSBOOST',
	speed: 'PLAYER_SPEED',
	filter: 'PLAYER_FILTER_TOGGLE',
	'filter/reset': 'PLAYER_FILTER_RESET',
};

type PlayerIconName = 'previous' | 'pause' | 'play' | 'skip' | 'shuffle' | 'repeat' | 'stop' | 'leave' | 'close';
type DashboardSidebarIconName = 'overview' | 'servers' | 'settings' | 'playlists' | 'commands' | 'status' | 'account' | 'support' | 'chevron' | 'collapse';

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

export function DashboardSidebarIcon({ name, className = 'h-5 w-5' }: { name: DashboardSidebarIconName; className?: string }) {
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

type SelectMenuPosition = {
	left: number;
	top: number;
	width: number;
};

function useSelectMenuPosition(isOpen: boolean) {
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const [position, setPosition] = useState<SelectMenuPosition | null>(null);

	useEffect(() => {
		if (!isOpen) {
			setPosition(null);
			return;
		}

		const updatePosition = () => {
			const rect = triggerRef.current?.getBoundingClientRect();
			if (!rect) return;
			setPosition({
				left: rect.left,
				top: rect.bottom + 10,
				width: rect.width,
			});
		};

		updatePosition();
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);

		return () => {
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [isOpen]);

	return { triggerRef, position };
}

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

function getLivePlayerPosition(player: GuildPlayerState | null, trackDuration: number) {
	if (!player?.currentTrack) return 0;
	const basePosition = Math.max(0, Number(player.position ?? 0));
	if (player.paused) {
		return trackDuration > 0 ? Math.min(basePosition, trackDuration) : basePosition;
	}

	const elapsed = Math.max(0, Date.now() - Number(player.updatedAt ?? Date.now()));
	const livePosition = basePosition + elapsed;
	return trackDuration > 0 ? Math.min(livePosition, trackDuration) : livePosition;
}

function getNextRepeatMode(repeatMode: GuildPlayerState['repeatMode'], hasCurrentTrack: boolean, queueCount: number): GuildPlayerState['repeatMode'] {
	if (repeatMode === 'off') {
		if (queueCount > 0) return 'queue';
		if (hasCurrentTrack) return 'track';
		return 'off';
	}

	if (repeatMode === 'queue') return 'track';
	return 'off';
}

function normalizePlayerFilters(filters: unknown, fallback: PlayerFilters = DEFAULT_PLAYER_FILTERS): PlayerFilters {
	if (!filters || typeof filters !== 'object') return fallback;

	const candidate = filters as Partial<PlayerFilters>;

	return {
		bassBoost: candidate.bassBoost ?? fallback.bassBoost,
		demon: candidate.demon ?? fallback.demon,
		nightcore: candidate.nightcore ?? fallback.nightcore,
		pitch: candidate.pitch ?? fallback.pitch,
		speed: candidate.speed ?? fallback.speed,
		vaporwave: candidate.vaporwave ?? fallback.vaporwave,
	};
}

export function DashboardClient({ botIdFromQuery, guildIdFromQuery }: { botIdFromQuery?: string; guildIdFromQuery?: string }) {
	const router = useRouter();
	const [form, setForm] = useState<DashboardState>(DEFAULT_STATE);
	const [botOptions, setBotOptions] = useState<Array<{ botId: string; label: string; avatarUrl?: string | null }>>([]);
	const [guildOptions, setGuildOptions] = useState<AuthGuild[]>([]);
	const [hasLoadedGuildOptions, setHasLoadedGuildOptions] = useState(false);
	const [authUser, setAuthUser] = useState<AuthUser | null>(null);
	const [guildMetadata, setGuildMetadata] = useState<GuildMetadata | null>(null);
	const [player, setPlayer] = useState<GuildPlayerState | null>(null);
	const [playerError, setPlayerError] = useState<string | null>(null);
	const [commandFeedback, setCommandFeedback] = useState<CommandFeedback>(DEFAULT_COMMAND_FEEDBACK);
	const [isBusy, setIsBusy] = useState(false);
	const [displayPosition, setDisplayPosition] = useState(0);
	const [scrubValue, setScrubValue] = useState(0);
	const [isScrubbing, setIsScrubbing] = useState(false);
	const [volumeDraft, setVolumeDraft] = useState(100);
	const [bassboostDraft, setBassboostDraft] = useState(0);
	const [speedDraft, setSpeedDraft] = useState(1);
	const [isBotMenuOpen, setIsBotMenuOpen] = useState(false);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const [showSidebarNotice, setShowSidebarNotice] = useState(true);
	const [hasLoadedBotOptions, setHasLoadedBotOptions] = useState(false);
	const { triggerRef: botMenuTriggerRef, position: botMenuPosition } = useSelectMenuPosition(isBotMenuOpen);

	const persist = (nextState: DashboardState) => {
		window.localStorage.setItem(STORAGE_KEYS.botId, nextState.botId);
		window.localStorage.setItem(STORAGE_KEYS.guildId, nextState.guildId);
		window.localStorage.setItem(STORAGE_KEYS.userId, nextState.userId);
	};

	const updateField = (field: keyof DashboardState, value: string) => {
		setForm((current) => {
			const nextState = { ...current, [field]: value };
			persist(nextState);
			return nextState;
		});
	};

	const switchBot = (nextBotId: string) => {
		setIsBotMenuOpen(false);
		if (!nextBotId || nextBotId === form.botId) return;

		updateField('botId', nextBotId);
		router.push(buildDashboardPath(nextBotId, form.guildId));
	};

	const refreshPlayerState = async (botId = form.botId.trim(), guildId = form.guildId.trim()) => {
		if (!botId || !guildId) return;
		try {
			const state = await apiJson<GuildPlayerState>(buildBotScopedPath(botId, guildId, '/player'));
			setPlayer(state);
			setPlayerError(null);
		} catch (error) {
			setPlayer(null);
			setPlayerError(error instanceof Error ? error.message : 'Unable to load player state');
		}
	};

	const applyOptimisticPlayerUpdate = (updater: (current: GuildPlayerState) => GuildPlayerState) => {
		setPlayer((current) => (current ? updater(current) : current));
	};

	useEffect(() => {
		setForm({
			...DEFAULT_STATE,
			botId: botIdFromQuery || window.localStorage.getItem(STORAGE_KEYS.botId) || '',
			guildId: guildIdFromQuery || window.localStorage.getItem(STORAGE_KEYS.guildId) || '',
			userId: window.localStorage.getItem(STORAGE_KEYS.userId) || '',
		});
	}, [botIdFromQuery, guildIdFromQuery]);

	useEffect(() => {
		setIsSidebarCollapsed(window.localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === '1');
		setShowSidebarNotice(window.localStorage.getItem(STORAGE_KEYS.sidebarNoticeDismissed) !== '1');
	}, []);

	useEffect(() => {
		window.localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, isSidebarCollapsed ? '1' : '0');
	}, [isSidebarCollapsed]);

	useEffect(() => {
		window.localStorage.setItem(STORAGE_KEYS.sidebarNoticeDismissed, showSidebarNotice ? '0' : '1');
	}, [showSidebarNotice]);

	useEffect(() => {
		let active = true;
		void apiJson<AuthUser>('/api/auth/me')
			.then((user) => {
				if (!active) return;
				setAuthUser(user);
				setForm((current) => {
					const next = { ...current, userId: user.userId };
					persist(next);
					return next;
				});
			})
			.catch(() => {
				if (active) setAuthUser(null);
			});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		let active = true;
		void apiJson<BotsResponse>('/api/bots')
			.then((response) => {
				if (!active) return;
				const nextBots = response.bots ?? [];
				setBotOptions(nextBots);
				setHasLoadedBotOptions(true);
				if (!form.botId.trim() && nextBots.length > 0) updateField('botId', getPreferredBotFromList(nextBots.map((bot) => bot.botId)));
			})
			.catch(() => {
				if (active) {
					setBotOptions([]);
					setHasLoadedBotOptions(true);
				}
			});
		return () => {
			active = false;
		};
	}, [form.botId]);

	useEffect(() => {
		let active = true;
		void apiJson<AuthGuildsResponse>('/api/auth/guilds')
			.then((response) => {
				if (active) {
					setGuildOptions(response.guilds ?? []);
					setHasLoadedGuildOptions(true);
				}
			})
			.catch(() => {
				if (active) {
					setGuildOptions([]);
					setHasLoadedGuildOptions(true);
				}
			});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		setPlayer(null);
		setPlayerError(null);
		setDisplayPosition(0);
		setScrubValue(0);
		setIsBotMenuOpen(false);
		setCommandFeedback(DEFAULT_COMMAND_FEEDBACK);
	}, [form.botId, form.guildId]);

	useEffect(() => {
		if (form.botId.trim() && form.guildId.trim()) void refreshPlayerState();
	}, [form.botId, form.guildId]);

	useEffect(() => {
		if (!form.botId.trim() || !form.guildId.trim() || !authUser?.userId) {
			setGuildMetadata(null);
			return;
		}

		let active = true;
		void apiJson<GuildMetadata>(buildBotScopedPath(form.botId.trim(), form.guildId.trim(), '/metadata'))
			.then((metadata) => {
				if (active) setGuildMetadata(metadata);
			})
			.catch(() => {
				if (active) setGuildMetadata(null);
			});

		return () => {
			active = false;
		};
	}, [form.botId, form.guildId, authUser?.userId, player?.voiceChannelId, player?.currentTrack?.url]);

	useEffect(() => {
		if (!form.botId.trim() || !form.guildId.trim()) return;
		const interval = window.setInterval(() => void refreshPlayerState(), 15000);
		return () => window.clearInterval(interval);
	}, [form.botId, form.guildId]);

	useEffect(() => {
		if (!form.botId.trim() || !form.guildId.trim()) return;
		const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
		const socket = new WebSocket(apiBaseUrl.replace(/^http/i, 'ws'));
		socket.addEventListener('message', (event) => {
			try {
				const payload = JSON.parse(event.data) as FrontendEvent;
				if (payload.botId !== form.botId.trim()) return;
				if ('guildId' in payload && payload.guildId !== form.guildId.trim()) return;
				if (payload.type === 'PLAYER_STATE_UPDATE') {
					const hasNoPlayerState = payload.currentTrack === null && payload.voiceChannelId === null;

					setPlayer((current) =>
						hasNoPlayerState
							? null
							: {
									botId: payload.botId,
									guildId: payload.guildId,
									instanceId: payload.instanceId,
									currentTrack: payload.currentTrack,
									queue: current?.queue ?? [],
									updatedAt: payload.updatedAt,
									paused: payload.paused,
									volume: payload.volume,
									position: payload.position,
									repeatMode: payload.repeatMode,
									voiceChannelId: payload.voiceChannelId,
									channelId: payload.channelId,
									textChannelId: payload.textChannelId,
									autoPlayRequester: payload.autoPlayRequester,
									autoplayEnabled: payload.autoplayEnabled,
									isAutoPlay: payload.isAutoPlay,
									is247: payload.is247,
									filters: normalizePlayerFilters(payload.filters, current?.filters ?? DEFAULT_PLAYER_FILTERS),
								}
					);
					setPlayerError(null);
				}
				if (payload.type === 'QUEUE_UPDATE') {
					setPlayer((current) =>
						payload.currentTrack === null && payload.queue.length === 0
							? null
							: current
								? {
										...current,
										botId: payload.botId,
										currentTrack: payload.currentTrack,
										queue: payload.queue,
										updatedAt: payload.updatedAt,
									}
								: {
										botId: payload.botId,
										guildId: payload.guildId,
										instanceId: payload.instanceId,
										currentTrack: payload.currentTrack,
										queue: payload.queue,
										updatedAt: payload.updatedAt,
										paused: false,
										volume: 100,
										position: 0,
										repeatMode: 'off',
										voiceChannelId: null,
										channelId: null,
										textChannelId: null,
										autoPlayRequester: null,
										autoplayEnabled: null,
										isAutoPlay: null,
										is247: null,
										filters: DEFAULT_PLAYER_FILTERS,
									}
					);
				}
				if (payload.type === 'COMMAND_ACK') {
					setCommandFeedback((current) =>
						current.commandId === payload.commandId
							? {
									...current,
									phase: 'received',
									commandId: payload.commandId,
									commandType: payload.commandType,
									instanceId: payload.instanceId,
									ackTimestamp: payload.timestamp,
									updatedAt: payload.timestamp,
									title: `${formatCommandTypeLabel(payload.commandType)} received by Lunio`,
									message: 'Waiting for Lunio to finish this action.',
								}
							: current
					);
				}
				if (payload.type === 'COMMAND_RESULT') {
					setCommandFeedback((current) =>
						current.commandId === payload.commandId
							? {
									...current,
									phase: payload.success ? 'succeeded' : 'failed',
									commandId: payload.commandId,
									commandType: payload.commandType,
									instanceId: payload.instanceId,
									code: payload.code,
									resultTimestamp: payload.timestamp,
									updatedAt: payload.timestamp,
									title: `${formatCommandTypeLabel(payload.commandType)} ${payload.success ? 'applied' : 'failed'}`,
									message: payload.message,
								}
							: current
					);
				}
			} catch {}
		});
		return () => socket.close();
	}, [form.botId, form.guildId]);

	useEffect(() => {
		if (!player?.currentTrack) {
			setDisplayPosition(0);
			setScrubValue(0);
			setIsScrubbing(false);
			return;
		}
		const nextPosition = getLivePlayerPosition(player, player.currentTrack.duration ?? 0);
		setDisplayPosition(nextPosition);
		if (!isScrubbing) setScrubValue(nextPosition);
	}, [player, isScrubbing]);

	useEffect(() => {
		if (!player?.currentTrack || player.paused || isScrubbing) return;

		const interval = window.setInterval(() => {
			setDisplayPosition(getLivePlayerPosition(player, player.currentTrack?.duration ?? 0));
		}, 500);

		return () => window.clearInterval(interval);
	}, [player, isScrubbing]);

	useEffect(() => {
		setIsBotMenuOpen(false);
		setIsScrubbing(false);
	}, [player?.voiceChannelId, player?.currentTrack?.url]);

	useEffect(() => {
		if (typeof player?.volume === 'number') {
			setVolumeDraft(player.volume);
			setForm((current) => ({ ...current, volume: String(player.volume) }));
		}
	}, [player?.volume]);

	useEffect(() => {
		setBassboostDraft(player?.filters?.bassBoost?.level ?? 0);
		setSpeedDraft(player?.filters?.speed?.level ?? 1);
	}, [player?.filters?.bassBoost?.level, player?.filters?.speed?.level]);

	const pollCommand = async (commandId: string) => {
		for (let attempt = 0; attempt < 12; attempt += 1) {
			const status = await apiJson<CommandStatus>(`/api/commands/${commandId}`);
			setCommandFeedback((current) => (current.commandId === commandId ? buildCommandFeedbackFromStatus(status) : current));
			if (status.result) {
				return;
			}
			await new Promise((resolve) => window.setTimeout(resolve, 900));
		}
		setCommandFeedback((current) => (current.commandId === commandId ? buildTimedOutCommandFeedback(current) : current));
	};

	const sendCommand = async (type: PlayerCommandAction, overrides?: Record<string, unknown>) => {
		const commandType = PLAYER_ACTION_COMMAND_TYPES[type];
		if (!form.botId.trim() || !form.guildId.trim() || !form.userId.trim()) {
			setCommandFeedback(buildFailedCommandFeedback('Sign in and choose a server before sending player commands.', commandType));
			return;
		}
		setIsBusy(true);
		setCommandFeedback(buildSendingCommandFeedback(commandType));
		const body: Record<string, unknown> = { userId: form.userId.trim() };
		if (type === 'volume') body.volume = Number(form.volume);
		if (type === 'seek') body.position = Number(form.seek);
		Object.assign(body, overrides ?? {});

		if (type === 'pause')
			applyOptimisticPlayerUpdate((current) => ({
				...current,
				paused: true,
				updatedAt: Date.now(),
			}));
		if (type === 'resume')
			applyOptimisticPlayerUpdate((current) => ({
				...current,
				paused: false,
				updatedAt: Date.now(),
			}));
		if (type === 'stop')
			applyOptimisticPlayerUpdate((current) => ({
				...current,
				currentTrack: null,
				queue: [],
				position: 0,
				paused: false,
				repeatMode: 'off',
				updatedAt: Date.now(),
			}));
		if (type === 'leave') setPlayer(null);
		if (type === 'repeat') {
			applyOptimisticPlayerUpdate((current) => ({
				...current,
				repeatMode: getNextRepeatMode(current.repeatMode, Boolean(current.currentTrack), current.queue.length),
				updatedAt: Date.now(),
			}));
		}
		if (type === 'volume') {
			const volumeValue = Number(body.volume ?? form.volume);
			applyOptimisticPlayerUpdate((current) => ({
				...current,
				volume: Number.isFinite(volumeValue) ? volumeValue : current.volume,
				updatedAt: Date.now(),
			}));
		}
		if (type === 'seek') {
			const seekValue = Number(overrides?.position ?? body.position ?? form.seek);
			applyOptimisticPlayerUpdate((current) => ({
				...current,
				position: Number.isFinite(seekValue) ? seekValue : current.position,
				updatedAt: Date.now(),
			}));
		}
		if (type === 'queue/remove') {
			const queueIndex = Number(overrides?.index ?? body.index);
			applyOptimisticPlayerUpdate((current) => ({
				...current,
				queue: current.queue.filter((_, index) => index !== queueIndex),
				updatedAt: Date.now(),
			}));
		}

		try {
			const accepted = await apiJson<AcceptedCommandResponse>(buildBotScopedPath(form.botId.trim(), form.guildId.trim(), `/player/${type}`), {
				method: 'POST',
				body: JSON.stringify(body),
			});
			setCommandFeedback(buildAcceptedCommandFeedback(accepted));
			await pollCommand(accepted.commandId);
			if (type === 'join') {
				await refreshPlayerState(form.botId.trim(), form.guildId.trim());
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to send player command';
			setCommandFeedback(buildFailedCommandFeedback(message, commandType));
			await refreshPlayerState(form.botId.trim(), form.guildId.trim());
		} finally {
			setIsBusy(false);
		}
	};

	const submitSliderSeek = async () => {
		const safePosition = Math.max(1000, Math.floor(scrubValue));
		setForm((current) => ({ ...current, seek: String(safePosition) }));
		setPlayer((current) => (current ? { ...current, position: safePosition, updatedAt: Date.now() } : current));
		setIsScrubbing(false);
		setDisplayPosition(safePosition);
		await sendCommand('seek', { position: safePosition });
	};

	const submitVolume = async (nextVolume = volumeDraft) => {
		const safeVolume = Math.max(1, Math.min(200, Math.round(nextVolume)));
		setVolumeDraft(safeVolume);
		updateField('volume', String(safeVolume));
		await sendCommand('volume', { volume: safeVolume });
	};

	const removeQueuedTrack = async (index: number) => {
		await sendCommand('queue/remove', { index });
	};

	const sendPremiumControl = async (action: PremiumControlAction, body: Record<string, unknown>) => {
		const commandType = PREMIUM_ACTION_COMMAND_TYPES[action];
		if (!form.botId.trim() || !form.guildId.trim() || !form.userId.trim()) {
			setCommandFeedback(buildFailedCommandFeedback('Sign in and choose a server before sending premium controls.', commandType));
			return;
		}

		setIsBusy(true);
		setCommandFeedback(buildSendingCommandFeedback(commandType));
		try {
			const accepted = await apiJson<AcceptedCommandResponse>(buildBotScopedPath(form.botId.trim(), form.guildId.trim(), `/player/${action}`), {
				method: 'POST',
				body: JSON.stringify({ userId: form.userId.trim(), ...body }),
			});
			setCommandFeedback(buildAcceptedCommandFeedback(accepted));
			await pollCommand(accepted.commandId);
			await refreshPlayerState(form.botId.trim(), form.guildId.trim());
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to send premium control';
			setCommandFeedback(buildFailedCommandFeedback(message, commandType));
			await refreshPlayerState(form.botId.trim(), form.guildId.trim());
		} finally {
			setIsBusy(false);
		}
	};

	const selectedGuild = useMemo(() => guildOptions.find((guild) => guild.guildId === form.guildId.trim()) ?? null, [guildOptions, form.guildId]);
	const selectedBot = useMemo(() => botOptions.find((bot) => bot.botId === form.botId.trim()) ?? null, [botOptions, form.botId]);
	const botMenuStyle = botMenuPosition
		? {
				left: `${botMenuPosition.left}px`,
				top: `${botMenuPosition.top}px`,
				width: `${botMenuPosition.width}px`,
			}
		: undefined;
	const authDisplayName = authUser ? authUser.globalName || authUser.username : 'Not signed in';
	const authProfileName = authUser?.globalName || authUser?.username || 'Guest';
	const authProfileHandle = authUser?.username ? `@${authUser.username}` : 'Sign in to attach your Discord identity.';
	const commandAckTime = typeof commandFeedback.ackTimestamp === 'number' ? new Date(commandFeedback.ackTimestamp).toLocaleTimeString() : '--';
	const commandFinishedTime = typeof commandFeedback.resultTimestamp === 'number' ? new Date(commandFeedback.resultTimestamp).toLocaleTimeString() : '--';
	const dashboardRouteMissingGuild = Boolean(form.guildId.trim()) && hasLoadedGuildOptions && !selectedGuild;
	const dashboardRouteMissingBot = Boolean(form.botId.trim()) && hasLoadedBotOptions && !selectedBot;
	const dashboardRouteBotNotInGuild =
		Boolean(form.botId.trim()) && Boolean(form.guildId.trim()) && Boolean(selectedGuild) && !selectedGuild?.connectedBots.includes(form.botId.trim());

	if (dashboardRouteMissingGuild || dashboardRouteMissingBot) {
		return (
			<DashboardRouteState
				title="Dashboard not available"
				message="That bot or server route does not exist for your current session. Pick a server you actually share with Lunio."
			/>
		);
	}

	if (dashboardRouteBotNotInGuild) {
		return (
			<DashboardRouteState title="Bot not in this server" message="The selected bot is not connected to this server right now, so this dashboard route cannot be opened." />
		);
	}
	const currentTrack = player?.currentTrack ?? null;
	const trackDuration = currentTrack?.duration ?? 0;
	const safeDisplayPosition = currentTrack ? Math.min(displayPosition, trackDuration || displayPosition) : 0;
	const syncedDisplayPosition = isScrubbing ? Math.min(scrubValue, Math.max(trackDuration, 1000)) : Math.floor(safeDisplayPosition / 1000) * 1000;
	const progressPercent = currentTrack && trackDuration > 0 ? Math.max(0, Math.min(100, (syncedDisplayPosition / trackDuration) * 100)) : 0;
	const queueTracks = player?.queue ?? [];
	const queueCount = queueTracks.length;
	const queueDuration = queueTracks.reduce((total, track) => total + (track.duration ?? 0), 0);
	const activityState = player?.paused ? 'Paused' : currentTrack ? 'Live' : 'Idle';
	const playerSurfaceKey = `${player?.voiceChannelId ?? 'none'}:${currentTrack?.url ?? 'idle'}`;
	const playerFilters = player?.filters ?? DEFAULT_PLAYER_FILTERS;
	const autoplayModeEnabled = Boolean(player?.autoplayEnabled);
	const currentTrackFromAutoplay = Boolean(currentTrack?.isAutoplay);
	const currentTrackRequester = currentTrack?.requesterName ?? null;
	const requesterPermissions = guildMetadata?.requester ?? null;
	const canUsePremiumControls = Boolean(requesterPermissions?.canUsePremiumControls);
	const canUseDjControls = Boolean(requesterPermissions?.canUseDjControls);
	const hasVoiceChannelContext = Boolean(requesterPermissions?.currentVoiceChannelId);
	const canUseJoinControl = Boolean(authUser && form.guildId.trim() && hasVoiceChannelContext);
	const canUsePlayerDjControls = Boolean(player && canUseDjControls);
	const canUseAutoplayControl = Boolean(player && canUsePremiumControls && hasVoiceChannelContext);
	const canUsePremiumDjControls = Boolean(player && canUsePremiumControls && canUseDjControls);
	const activePremiumFilters = [
		playerFilters.nightcore.enabled ? 'Nightcore' : null,
		playerFilters.vaporwave.enabled ? 'Vaporwave' : null,
		playerFilters.demon.enabled ? 'Demon' : null,
		playerFilters.bassBoost.enabled ? `Bassboost ${playerFilters.bassBoost.level ?? 0}` : null,
		playerFilters.speed.enabled ? `Speed ${playerFilters.speed.level ?? 1}x` : null,
		playerFilters.pitch.enabled ? `Pitch ${playerFilters.pitch.level ?? 1}` : null,
	].filter(Boolean) as string[];

	const legacyView = false ? (
		<div className="grid gap-6">
			<section className="dashboard-hero-card">
				<div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
					<div>
						<div className="eyebrow">Player control</div>
						<h1 className="font-headline text-4xl font-bold tracking-[-0.06em] text-white sm:text-5xl">
							{selectedGuild?.name ?? 'Choose a server to start listening'}
						</h1>
						<p className="mt-4 max-w-2xl text-base leading-8 text-muted">A real-time player surface for playback, queue flow, and multi-bot control in one place.</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Link className="ghost-button px-4 py-2 text-sm" href="/servers">
							Change Server
						</Link>
						{selectedGuild?.canManage ? (
							<Link className="secondary-button px-4 py-2 text-sm" href={buildDashboardPath(form.botId, form.guildId, 'settings')}>
								Settings
							</Link>
						) : null}
					</div>
				</div>

				<div className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
					<div className="dashboard-context-grid overflow-visible">
						<article className="dashboard-context-card">
							<div className="metric-label">Guild</div>
							<div className="mt-4 flex items-center gap-4">
								{selectedGuild?.iconUrl ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										alt={selectedGuild?.name ?? 'Selected guild'}
										className="h-14 w-14 rounded-2xl border border-white/10 object-cover"
										src={selectedGuild?.iconUrl ?? undefined}
									/>
								) : (
									<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-headline text-lg font-bold text-primary">
										{(selectedGuild?.name ?? 'L').slice(0, 1).toUpperCase()}
									</div>
								)}
								<div className="min-w-0">
									<div className="truncate font-headline text-2xl font-bold tracking-[-0.05em] text-white">{selectedGuild?.name ?? 'No server selected'}</div>
									<div className="mt-1 text-sm text-muted">
										{selectedGuild?.canManage
											? 'Manage Guild access detected'
											: selectedGuild
												? 'Playback access only'
												: 'Pick a server from the server picker'}
									</div>
								</div>
							</div>
						</article>

						<article className="dashboard-context-card">
							<div className="metric-label">Current bot</div>
							<div className="mt-4 flex items-center gap-4">
								{selectedBot?.avatarUrl ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										alt={selectedBot?.label ?? 'Selected bot'}
										className="h-14 w-14 rounded-full border border-primary/20 object-cover"
										src={selectedBot?.avatarUrl ?? undefined}
									/>
								) : (
									<div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-headline text-lg font-bold text-primary">
										{(selectedBot?.label ?? 'B').slice(0, 1).toUpperCase()}
									</div>
								)}
								<div className="min-w-0 flex-1">
									<div className="font-headline text-2xl font-bold tracking-[-0.05em] text-white">{selectedBot?.label ?? 'Select bot'}</div>
									<div className="relative mt-2">
										<button
											aria-expanded={isBotMenuOpen}
											aria-haspopup="listbox"
											className="dashboard-select"
											onClick={() => setIsBotMenuOpen((current) => !current)}
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
																className={`dashboard-select-option ${form.botId === bot.botId ? 'dashboard-select-option-active' : ''}`}
																key={bot.botId}
																onClick={() => switchBot(bot.botId)}
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
						</article>
					</div>

					<article className="dashboard-meta-card">
						<div className="metric-label">Session</div>
						<div className="mt-4 grid gap-4 sm:grid-cols-4">
							<div>
								<div className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted">User</div>
								<div className="mt-2 text-sm font-bold text-white">{authDisplayName}</div>
							</div>
							<div>
								<div className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted">Autoplay</div>
								<div className="mt-2 text-sm font-bold text-white">{autoplayModeEnabled ? 'On' : 'Off'}</div>
							</div>
							<div>
								<div className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted">State</div>
								<div className="mt-2 text-sm font-bold text-white">{activityState}</div>
							</div>
							<div>
								<div className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted">Repeat</div>
								<div className="mt-2 text-sm font-bold uppercase text-white">{player?.repeatMode ?? 'off'}</div>
							</div>
						</div>
						{!authUser ? (
							<div className="mt-5 rounded-[1.4rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-100">
								Sign in with Discord to control playback from the dashboard.
							</div>
						) : null}
						{!form.guildId ? (
							<div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted">
								Choose a server from the picker before using player controls.
							</div>
						) : null}
					</article>
				</div>
			</section>

			<section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_380px]">
				<div className="grid gap-6">
					<article className="dashboard-player-card" key={playerSurfaceKey}>
						<div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
							<div className="dashboard-art-card">
								{currentTrack?.artworkUrl ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img alt={currentTrack?.title ?? 'Current track artwork'} className="h-full w-full object-cover" src={currentTrack?.artworkUrl ?? undefined} />
								) : (
									<div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.16),transparent_32%),linear-gradient(180deg,#0b0d0d_0%,#141616_100%)]">
										<div className="rounded-full border border-primary/20 bg-primary/10 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
											No artwork
										</div>
									</div>
								)}
							</div>

							<div className="flex min-w-0 flex-col">
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div className="min-w-0">
										<div className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Now playing</div>
										<div className="mt-3 flex flex-wrap items-center gap-2">
											{autoplayModeEnabled ? (
												<div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-200">
													Autoplay On
												</div>
											) : null}
											{currentTrackFromAutoplay ? (
												<div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
													Autoplay Track
												</div>
											) : null}
										</div>
										<h2 className="mt-3 truncate font-headline text-4xl font-bold tracking-[-0.06em] text-white">
											{currentTrack?.title ?? 'No active player'}
										</h2>
										<p className="mt-2 truncate text-base text-white/70">
											{currentTrack?.artist ?? playerError ?? 'Join your voice channel from here or start playback in Discord.'}
										</p>
										{currentTrackRequester ? <p className="mt-2 text-sm text-white/55">Requested by {currentTrackRequester}</p> : null}
									</div>
									<div className="dashboard-pill">{player?.paused ? 'Paused' : currentTrack ? 'Streaming' : 'Standby'}</div>
								</div>

								<div className="mt-8">
									<div className="mb-3 flex items-center justify-between gap-4 text-sm font-bold text-white/80">
										<span>{formatClock(syncedDisplayPosition)}</span>
										<span>{formatClock(trackDuration)}</span>
									</div>
									<div className="relative">
										<div className="h-2 rounded-full bg-white/10">
											<div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${progressPercent}%` }} />
										</div>
										<input
											className="dashboard-range absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent"
											disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
											max={Math.max(trackDuration, 1000)}
											min={0}
											onChange={(event) => setScrubValue(Number(event.target.value))}
											onMouseDown={() => setIsScrubbing(true)}
											onMouseUp={() => void submitSliderSeek()}
											onTouchEnd={() => void submitSliderSeek()}
											onTouchStart={() => setIsScrubbing(true)}
											step={1000}
											type="range"
											value={Math.min(syncedDisplayPosition, Math.max(trackDuration, 1000))}
										/>
									</div>
								</div>

								<div className="mt-8 flex flex-col gap-5">
									{!player ? (
										<button
											className="dashboard-control-button dashboard-control-primary"
											disabled={isBusy || !canUseJoinControl}
											onClick={() => void sendCommand('join')}
											type="button"
										>
											Join Your Voice Channel
										</button>
									) : (
										<>
											<div className="flex flex-wrap items-center justify-between gap-5 rounded-[1.7rem] border border-white/10 bg-black/20 px-4 py-4">
												<div className="flex items-center gap-3">
													<button
														aria-label="Shuffle"
														className="dashboard-control-button dashboard-control-icon"
														disabled={isBusy || queueCount <= 2 || !canUsePlayerDjControls}
														onClick={() => void sendCommand('shuffle')}
														title="Shuffle"
														type="button"
													>
														<PlayerControlIcon name="shuffle" />
													</button>
													<button
														aria-label="Previous"
														className="dashboard-control-button dashboard-control-icon"
														disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
														onClick={() => void sendCommand('previous')}
														title="Previous / Replay"
														type="button"
													>
														<PlayerControlIcon name="previous" />
													</button>
													<button
														aria-label={player?.paused ? 'Resume' : 'Pause'}
														className="dashboard-control-button dashboard-control-primary dashboard-control-icon dashboard-control-icon-primary"
														disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
														onClick={() => void sendCommand(player?.paused ? 'resume' : 'pause')}
														title={player?.paused ? 'Resume' : 'Pause'}
														type="button"
													>
														<PlayerControlIcon name={player?.paused ? 'play' : 'pause'} />
													</button>
													<button
														aria-label="Skip"
														className="dashboard-control-button dashboard-control-icon"
														disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
														onClick={() => void sendCommand('skip')}
														title="Skip"
														type="button"
													>
														<PlayerControlIcon name="skip" />
													</button>
													<button
														aria-label={`Repeat mode: ${player?.repeatMode ?? 'off'}`}
														className={`dashboard-control-button dashboard-control-icon relative ${
															player?.repeatMode && player?.repeatMode !== 'off' ? 'dashboard-control-primary' : ''
														}`}
														disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
														onClick={() => void sendCommand('repeat')}
														title={`Cycle repeat mode (currently: ${player?.repeatMode ?? 'off'})`}
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
												</div>

												<label className="min-w-[13rem] flex-1">
													<div className="mb-2 flex items-center justify-between gap-3">
														<span className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted">Volume</span>
														<span className="text-sm font-bold text-white">{volumeDraft}%</span>
													</div>
													<input
														className="dashboard-range h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
														disabled={isBusy || !player || !canUsePlayerDjControls}
														max={200}
														min={1}
														onChange={(event) => {
															const next = Number(event.target.value);
															setVolumeDraft(next);
															setForm((current) => ({
																...current,
																volume: String(next),
															}));
														}}
														onMouseUp={() => void submitVolume()}
														onTouchEnd={() => void submitVolume()}
														step={1}
														type="range"
														value={volumeDraft}
													/>
												</label>
											</div>

											<div className="flex flex-wrap items-center gap-3">
												<button
													aria-label="Stop"
													className="dashboard-control-button"
													disabled={isBusy || !currentTrack || !canUsePlayerDjControls}
													onClick={() => void sendCommand('stop')}
													title="Stop"
													type="button"
												>
													<PlayerControlIcon className="mr-2 h-4 w-4" name="stop" />
													Stop
												</button>
												<button
													aria-label="Leave voice channel"
													className="dashboard-control-button"
													disabled={isBusy || !canUsePlayerDjControls}
													onClick={() => void sendCommand('leave')}
													title="Leave voice channel"
													type="button"
												>
													<PlayerControlIcon className="mr-2 h-4 w-4" name="leave" />
													Leave
												</button>
												<button className="ghost-button min-w-[10rem] justify-center" onClick={() => void refreshPlayerState()} type="button">
													Refresh State
												</button>
											</div>
										</>
									)}
								</div>
								{!hasVoiceChannelContext ? (
									<div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-muted">
										Join a permitted voice channel to enable dashboard playback controls.
									</div>
								) : player && !canUseDjControls ? (
									<div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-muted">
										Playback controls are disabled until Lunio sees you as a valid DJ for this server.
									</div>
								) : null}
							</div>
						</div>
					</article>

					<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
						<article className="dashboard-panel-card">
							<div className="flex items-center justify-between gap-4">
								<div>
									<div className="metric-label">Up next</div>
									<h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">Queue</h3>
								</div>
								<div className="dashboard-pill">{queueCount} tracks</div>
							</div>
							<div className="mt-6 space-y-3">
								{queueTracks.length ? (
									queueTracks.slice(0, 8).map((track, index) => (
										<div className="dashboard-queue-row gap-4" key={`${track.url}-${index}`}>
											{track.artworkUrl ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img alt={track.title} className="mr-4 h-11 w-11 rounded-2xl border border-white/10 object-cover" src={track.artworkUrl} />
											) : (
												<div className="mr-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
													{String(index + 1).padStart(2, '0')}
												</div>
											)}
											<div className="min-w-0 flex-1">
												<div className="truncate font-bold text-white">{track.title}</div>
												<div className="mt-1 truncate text-sm text-muted">{track.artist}</div>
											</div>
											<div className="ml-4 flex items-center gap-3">
												<div className="text-sm font-bold text-white/75">{formatDuration(track.duration)}</div>
												<button
													aria-label={`Remove ${track.title} from queue`}
													className="dashboard-mini-button dashboard-mini-icon h-10 min-h-0 w-10 rounded-full"
													disabled={isBusy || !canUsePlayerDjControls}
													onClick={() => void removeQueuedTrack(index)}
													title="Remove from queue"
													type="button"
												>
													<PlayerControlIcon className="h-4 w-4" name="close" />
												</button>
											</div>
										</div>
									))
								) : (
									<div className="dashboard-empty-card">No queued tracks yet. Add music from Discord and the queue will appear here.</div>
								)}
							</div>
						</article>

						<article className="dashboard-panel-card">
							<div className="metric-label">Session monitor</div>
							<h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">Current state</h3>
							<div className="mt-6 grid gap-3">
								<div className="dashboard-stat-row">
									<span>Progress</span>
									<strong>{formatClock(syncedDisplayPosition)}</strong>
								</div>
								<div className="dashboard-stat-row">
									<span>Duration</span>
									<strong>{formatClock(trackDuration)}</strong>
								</div>
								<div className="dashboard-stat-row">
									<span>Volume</span>
									<strong>{player?.volume ?? '--'}%</strong>
								</div>
								<div className="dashboard-stat-row">
									<span>Repeat mode</span>
									<strong className="uppercase">{player?.repeatMode ?? 'off'}</strong>
								</div>
								<div className="dashboard-stat-row">
									<span>Queue length</span>
									<strong>{queueCount}</strong>
								</div>
								<div className="dashboard-stat-row">
									<span>Queued time</span>
									<strong>{formatDuration(queueDuration)}</strong>
								</div>
							</div>
							<div className={`mt-6 rounded-[1.6rem] border p-4 ${getCommandFeedbackToneClasses(commandFeedback.phase)}`}>
								<div className="flex items-center justify-between gap-3">
									<div className="metric-label text-current/70">Latest action</div>
									<span className="text-xs font-extrabold uppercase tracking-[0.2em] text-current">{formatCommandFeedbackPhase(commandFeedback.phase)}</span>
								</div>
								<div className="mt-3 text-base font-bold text-white">{commandFeedback.title}</div>
								<p className="mt-2 text-sm leading-6 text-current/90">{commandFeedback.message}</p>
								<div className="mt-4 grid gap-3">
									<div className="dashboard-stat-row">
										<span>Command</span>
										<strong>{commandFeedback.commandType ? formatCommandTypeLabel(commandFeedback.commandType) : '--'}</strong>
									</div>
									<div className="dashboard-stat-row">
										<span>Command ID</span>
										<strong>{formatShortCommandId(commandFeedback.commandId)}</strong>
									</div>
									<div className="dashboard-stat-row">
										<span>Instance</span>
										<strong>{commandFeedback.instanceId ?? '--'}</strong>
									</div>
									<div className="dashboard-stat-row">
										<span>Received</span>
										<strong>{commandAckTime}</strong>
									</div>
									<div className="dashboard-stat-row">
										<span>Finished</span>
										<strong>{commandFinishedTime}</strong>
									</div>
								</div>
							</div>
						</article>
					</div>
				</div>

				<aside className="grid gap-6">
					<article className="dashboard-side-card">
						<div className="metric-label">Premium control</div>
						<h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">Premium settings</h3>
						<p className="mt-4 text-sm leading-7 text-muted">Live premium playback features from Lunio, based on the active player and the premium command set.</p>
						<div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
							<div className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted">Premium status</div>
							<div className="mt-2 text-sm font-bold text-white">
								{!canUsePremiumControls
									? 'Premium is not active for this user or guild.'
									: canUseDjControls
										? 'You can use DJ-gated premium controls right now.'
										: 'Premium is active, but DJ-gated controls are currently unavailable.'}
							</div>
						</div>
						<div className="mt-6 grid gap-3">
							<div className="dashboard-stat-row">
								<span>Autoplay</span>
								<strong>{formatToggleState(player?.autoplayEnabled)}</strong>
							</div>
							<div className="dashboard-stat-row">
								<span>Track source</span>
								<strong>{currentTrack ? (currentTrackFromAutoplay ? 'Autoplay' : 'Manual') : '--'}</strong>
							</div>
							<div className="dashboard-stat-row">
								<span>Bassboost</span>
								<strong>{playerFilters.bassBoost.enabled ? `${playerFilters.bassBoost.level ?? 0}` : 'Off'}</strong>
							</div>
							<div className="dashboard-stat-row">
								<span>Speed</span>
								<strong>{playerFilters.speed.enabled ? `${playerFilters.speed.level ?? 1}x` : '1x'}</strong>
							</div>
							<div className="dashboard-stat-row">
								<span>Nightcore</span>
								<strong>{formatToggleState(playerFilters.nightcore.enabled)}</strong>
							</div>
							<div className="dashboard-stat-row">
								<span>Vaporwave</span>
								<strong>{formatToggleState(playerFilters.vaporwave.enabled)}</strong>
							</div>
							<div className="dashboard-stat-row">
								<span>Demon</span>
								<strong>{formatToggleState(playerFilters.demon.enabled)}</strong>
							</div>
						</div>
						<div className="mt-6 grid gap-4">
							<button
								className="secondary-button w-full justify-center"
								disabled={isBusy || !authUser || !canUseAutoplayControl}
								onClick={() =>
									void sendPremiumControl('autoplay', {
										enabled: !autoplayModeEnabled,
									})
								}
								type="button"
							>
								{autoplayModeEnabled ? 'Turn Autoplay Off' : 'Turn Autoplay On'}
							</button>

							<label className="block">
								<div className="flex items-center justify-between gap-3">
									<span className="field-label">Bassboost</span>
									<span className="text-sm font-bold text-white">{bassboostDraft}</span>
								</div>
								<input
									className="dashboard-range mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
									disabled={isBusy || !authUser || !canUsePremiumDjControls}
									max={3}
									min={-3}
									onChange={(event) => setBassboostDraft(Number(event.target.value))}
									onMouseUp={() =>
										void sendPremiumControl('bassboost', {
											level: bassboostDraft,
										})
									}
									onTouchEnd={() =>
										void sendPremiumControl('bassboost', {
											level: bassboostDraft,
										})
									}
									step={1}
									type="range"
									value={bassboostDraft}
								/>
							</label>

							<label className="block">
								<div className="flex items-center justify-between gap-3">
									<span className="field-label">Speed</span>
									<span className="text-sm font-bold text-white">{speedDraft.toFixed(1)}x</span>
								</div>
								<input
									className="dashboard-range mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
									disabled={isBusy || !authUser || !canUsePremiumDjControls}
									max={2}
									min={0.1}
									onChange={(event) => setSpeedDraft(Number(event.target.value))}
									onMouseUp={() =>
										void sendPremiumControl('speed', {
											value: Number(speedDraft.toFixed(1)),
										})
									}
									onTouchEnd={() =>
										void sendPremiumControl('speed', {
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
										void sendPremiumControl('filter', {
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
										void sendPremiumControl('filter', {
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
										void sendPremiumControl('filter', {
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
									onClick={() => void sendPremiumControl('filter/reset', {})}
									type="button"
								>
									Reset Filters
								</button>
							</div>
						</div>
						{canUsePremiumControls && !canUseDjControls ? (
							<div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-muted">
								DJ-gated premium controls are disabled until Lunio sees you as eligible in the current voice context.
							</div>
						) : null}
						<div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-muted">
							{activePremiumFilters.length ? `Active now: ${activePremiumFilters.join(', ')}` : 'No premium filters are active right now.'}
						</div>
						{selectedGuild?.canManage ? (
							<Link className="secondary-button mt-5 w-full justify-center" href={buildDashboardPath(form.botId, form.guildId, 'settings')}>
								Open Guild Settings
							</Link>
						) : (
							<div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-muted">
								Premium filters are controlled from Discord commands by members with the right access.
							</div>
						)}
					</article>

					<article className="dashboard-side-card">
						<div className="metric-label">Signed in</div>
						<div className="mt-4 flex items-center gap-4">
							{authUser?.avatarUrl ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									alt={authUser?.username ?? 'Signed in user'}
									className="h-14 w-14 rounded-full border border-white/10 object-cover"
									src={authUser?.avatarUrl ?? undefined}
								/>
							) : (
								<div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] font-headline text-lg font-bold text-primary">
									{(authUser?.username ?? 'U').slice(0, 1).toUpperCase()}
								</div>
							)}
							<div className="min-w-0">
								<div className="truncate font-bold text-white">{authProfileName}</div>
								<div className="mt-1 truncate text-sm text-muted">{authProfileHandle}</div>
							</div>
						</div>
					</article>
				</aside>
			</section>
		</div>
	) : null;
	void legacyView;

	const handleVolumeDraftChange = (next: number) => {
		setVolumeDraft(next);
		setForm((current) => ({
			...current,
			volume: String(next),
		}));
	};

	return (
		<DashboardPlayerLayout
			activePremiumFilters={activePremiumFilters}
			activityState={activityState}
			authUser={authUser}
			autoplayModeEnabled={autoplayModeEnabled}
			bassboostDraft={bassboostDraft}
			botMenuPosition={botMenuPosition}
			botMenuTriggerRef={botMenuTriggerRef}
			botOptions={botOptions}
			canUseAutoplayControl={canUseAutoplayControl}
			canUseDjControls={canUseDjControls}
			canUseJoinControl={canUseJoinControl}
			canUsePlayerDjControls={canUsePlayerDjControls}
			canUsePremiumControls={canUsePremiumControls}
			canUsePremiumDjControls={canUsePremiumDjControls}
			commandFeedback={commandFeedback}
			currentTrack={currentTrack}
			currentTrackFromAutoplay={currentTrackFromAutoplay}
			currentTrackRequester={currentTrackRequester}
			formBotId={form.botId}
			formGuildId={form.guildId}
			hasVoiceChannelContext={hasVoiceChannelContext}
			isBotMenuOpen={isBotMenuOpen}
			isBusy={isBusy}
			isSidebarCollapsed={isSidebarCollapsed}
			player={player}
			playerError={playerError}
			playerFilters={playerFilters}
			playerSurfaceKey={playerSurfaceKey}
			progressPercent={progressPercent}
			queueCount={queueCount}
			queueDuration={queueDuration}
			queueTracks={queueTracks}
			selectedBot={selectedBot}
			selectedGuild={selectedGuild}
			showSidebarNotice={showSidebarNotice}
			speedDraft={speedDraft}
			syncedDisplayPosition={syncedDisplayPosition}
			trackDuration={trackDuration}
			volumeDraft={volumeDraft}
			onBassboostDraftChange={setBassboostDraft}
			onDismissNotice={() => setShowSidebarNotice(false)}
			onRefreshState={() => void refreshPlayerState()}
			onRemoveQueuedTrack={(index) => void removeQueuedTrack(index)}
			onScrubChange={setScrubValue}
			onScrubStart={() => setIsScrubbing(true)}
			onSendCommand={(action) => void sendCommand(action)}
			onSendPremiumControl={(action, body) => void sendPremiumControl(action, body)}
			onSidebarToggle={() => setIsSidebarCollapsed((current) => !current)}
			onSpeedDraftChange={setSpeedDraft}
			onSubmitSeek={() => void submitSliderSeek()}
			onSubmitVolume={() => void submitVolume()}
			onSwitchBot={switchBot}
			onToggleBotMenu={() => setIsBotMenuOpen((current) => !current)}
			onVolumeDraftChange={handleVolumeDraftChange}
		/>
	);
}
