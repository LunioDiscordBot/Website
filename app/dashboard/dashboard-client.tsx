'use client';

import { buildDashboardPath } from '@/lib/dashboard-routes';
import { getPreferredBotId as getPreferredBotFromList } from '@/lib/bot-preference';
import { DashboardRouteState } from '@/components/dashboard-route-state';
import { DashboardPlayerLayout } from './dashboard-player-layout';
import { DashboardWorkspaceShell } from './dashboard-workspace-shell';
import { useDashboardPlayerOptional } from './dashboard-player-provider';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
	type SearchPlaylistResult,
	type SearchTrackResult,
	type Track,
} from '@/lib/api';
import {
	buildAcceptedCommandFeedback,
	buildCommandFeedbackFromStatus,
	buildFailedCommandFeedback,
	buildSendingCommandFeedback,
	buildTimedOutCommandFeedback,
	DEFAULT_COMMAND_FEEDBACK,
	formatCommandTypeLabel,
} from '@/lib/command-feedback';
import type { DashboardNotice, DashboardPlayerLayoutProps } from './dashboard-player-layout';

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
type RequesterPermissions = NonNullable<GuildMetadata['requester']>;
type SearchResultsData = {
	query?: string;
	playlist?: SearchPlaylistResult | null;
	results?: SearchTrackResult[];
};

const STORAGE_KEYS = {
	botId: 'lunio:web:botId',
	guildId: 'lunio:web:guildId',
	userId: 'lunio:web:userId',
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
const REQUESTER_CONTEXT_GRACE_MS = 30000;
const VOICE_TOGGLE_UI_COOLDOWN_MS = 5000;

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

function getTrackIdentity(track: Track | null | undefined) {
	if (!track) return null;
	return `${track.url}|${track.title}|${track.artist}`;
}

function isIncomingPlayerStateNewer(current: GuildPlayerState | null, incomingRevision: number, incomingUpdatedAt: number) {
	if (!current) return true;
	if (incomingRevision > current.revision) return true;
	if (incomingRevision < current.revision) return false;
	return incomingUpdatedAt >= current.updatedAt;
}

function normalizeFetchedPlayerState(state: GuildPlayerState | null, current: GuildPlayerState | null = null): GuildPlayerState | null {
	if (!state) return null;
	if (!isIncomingPlayerStateNewer(current, Number(state.revision ?? 0), Number(state.updatedAt ?? 0))) {
		return current;
	}

	const sameTrack = getTrackIdentity(state.currentTrack) !== null && getTrackIdentity(state.currentTrack) === getTrackIdentity(current?.currentTrack);
	const currentLivePosition = sameTrack && current?.currentTrack ? getLivePlayerPosition(current, current.currentTrack.duration ?? 0) : 0;
	const fetchedPosition = state.currentTrack ? Math.max(0, Number(state.position ?? 0)) : 0;

	return {
		...state,
		revision: Number(state.revision ?? 0),
		updatedAt: Date.now(),
		position: state.currentTrack ? (sameTrack && !state.paused && !(current?.paused ?? false) ? Math.max(fetchedPosition, currentLivePosition) : fetchedPosition) : 0,
		filters: normalizePlayerFilters(state.filters, DEFAULT_PLAYER_FILTERS),
	};
}

function isSearchTrackResult(value: unknown): value is SearchTrackResult {
	return Boolean(
		value &&
		typeof value === 'object' &&
		typeof (value as SearchTrackResult).title === 'string' &&
		typeof (value as SearchTrackResult).artist === 'string' &&
		typeof (value as SearchTrackResult).duration === 'number' &&
		typeof (value as SearchTrackResult).url === 'string'
	);
}

function isSearchPlaylistResult(value: unknown): value is SearchPlaylistResult {
	return Boolean(
		value &&
		typeof value === 'object' &&
		typeof (value as SearchPlaylistResult).title === 'string' &&
		typeof (value as SearchPlaylistResult).url === 'string' &&
		typeof (value as SearchPlaylistResult).trackCount === 'number'
	);
}

function extractSearchResults(data: Record<string, unknown> | undefined | null): SearchTrackResult[] {
	const candidate = (data as SearchResultsData | undefined)?.results;
	return Array.isArray(candidate) ? candidate.filter(isSearchTrackResult) : [];
}

function extractSearchPlaylist(data: Record<string, unknown> | undefined | null): SearchPlaylistResult | null {
	const candidate = (data as SearchResultsData | undefined)?.playlist;
	return isSearchPlaylistResult(candidate) ? candidate : null;
}

function buildRealtimePlayerState(current: GuildPlayerState | null, payload: Extract<FrontendEvent, { type: 'PLAYER_STATE_UPDATE' }>): GuildPlayerState | null {
	const receivedAt = Date.now();
	if (!isIncomingPlayerStateNewer(current, Number(payload.revision ?? 0), Number(payload.updatedAt ?? 0))) {
		return current;
	}
	const hasNoPlayerState = payload.state === 'DISCONNECTED' && payload.currentTrack === null && payload.voiceChannelId === null;
	if (hasNoPlayerState) return null;

	const trackChanged = getTrackIdentity(current?.currentTrack) !== getTrackIdentity(payload.currentTrack);

	return {
		botId: payload.botId,
		guildId: payload.guildId,
		instanceId: payload.instanceId,
		revision: Number(payload.revision ?? 0),
		state: payload.state,
		currentTrack: payload.currentTrack,
		queue: current?.queue ?? [],
		updatedAt: receivedAt,
		paused: payload.paused,
		volume: payload.volume,
		position: payload.currentTrack ? Math.max(0, Number(payload.position ?? (trackChanged ? 0 : (current?.position ?? 0)))) : 0,
		repeatMode: payload.repeatMode,
		voiceChannelId: payload.voiceChannelId,
		channelId: payload.channelId,
		textChannelId: payload.textChannelId,
		autoPlayRequester: payload.autoPlayRequester,
		autoplayEnabled: payload.autoplayEnabled,
		isAutoPlay: payload.isAutoPlay,
		is247: payload.is247,
		filters: normalizePlayerFilters(payload.filters, current?.filters ?? DEFAULT_PLAYER_FILTERS),
	};
}

function buildQueueSyncedPlayerState(current: GuildPlayerState | null, payload: Extract<FrontendEvent, { type: 'QUEUE_UPDATE' }>): GuildPlayerState | null {
	const receivedAt = Date.now();
	if (!isIncomingPlayerStateNewer(current, Number(payload.revision ?? 0), Number(payload.updatedAt ?? 0))) {
		return current;
	}
	const trackChanged = getTrackIdentity(current?.currentTrack) !== getTrackIdentity(payload.currentTrack);

	if (payload.currentTrack === null && payload.queue.length === 0) {
		return current?.state === 'CONNECTED'
			? {
					...current,
					revision: Number(payload.revision ?? 0),
					currentTrack: null,
					queue: [],
					position: 0,
					updatedAt: receivedAt,
				}
			: null;
	}

	if (current) {
		return {
			...current,
			botId: payload.botId,
			currentTrack: payload.currentTrack,
			queue: payload.queue,
			position: payload.currentTrack ? (trackChanged ? 0 : current.position) : 0,
			paused: payload.currentTrack ? current.paused : false,
			updatedAt: receivedAt,
		};
	}

	return {
		botId: payload.botId,
		guildId: payload.guildId,
		instanceId: payload.instanceId,
		revision: Number(payload.revision ?? 0),
		state: payload.currentTrack || payload.queue.length ? 'CONNECTED' : 'DISCONNECTED',
		currentTrack: payload.currentTrack,
		queue: payload.queue,
		updatedAt: receivedAt,
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
	};
}

export function DashboardClient({ botIdFromQuery, guildIdFromQuery }: { botIdFromQuery?: string; guildIdFromQuery?: string }) {
	const router = useRouter();
	const sharedDashboardPlayer = useDashboardPlayerOptional();
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
	const [isRefreshingState, setIsRefreshingState] = useState(false);
	const [displayPosition, setDisplayPosition] = useState(0);
	const [scrubValue, setScrubValue] = useState(0);
	const [isScrubbing, setIsScrubbing] = useState(false);
	const [volumeDraft, setVolumeDraft] = useState(100);
	const [bassboostDraft, setBassboostDraft] = useState(0);
	const [speedDraft, setSpeedDraft] = useState(1);
	const [voiceToggleCooldownUntil, setVoiceToggleCooldownUntil] = useState(0);
	const [hasLoadedBotOptions, setHasLoadedBotOptions] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchPlaylist, setSearchPlaylist] = useState<SearchPlaylistResult | null>(null);
	const [searchResults, setSearchResults] = useState<SearchTrackResult[]>([]);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [isSearchLoading, setIsSearchLoading] = useState(false);
	const [queueingSearchUrl, setQueueingSearchUrl] = useState<string | null>(null);
	const [lastKnownRequesterPermissions, setLastKnownRequesterPermissions] = useState<{
		value: RequesterPermissions;
		recordedAt: number;
	} | null>(null);

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
		if (!nextBotId || nextBotId === form.botId) return;

		updateField('botId', nextBotId);
		router.push(buildDashboardPath(nextBotId, form.guildId));
	};

	const refreshPlayerState = async (botId = form.botId.trim(), guildId = form.guildId.trim()) => {
		if (!botId || !guildId) return;
		try {
			const state = await apiJson<GuildPlayerState | null>(buildBotScopedPath(botId, guildId, '/player'));
			setPlayer((current) => normalizeFetchedPlayerState(state, current));
			setPlayerError(null);
		} catch (error) {
			setPlayer(null);
			setPlayerError(error instanceof Error ? error.message : 'Unable to load player state');
		}
	};

	const refreshGuildMetadata = async (botId = form.botId.trim(), guildId = form.guildId.trim()) => {
		if (!botId || !guildId || !authUser?.userId) {
			setGuildMetadata(null);
			return;
		}

		try {
			const metadata = await apiJson<GuildMetadata>(buildBotScopedPath(botId, guildId, '/metadata'));
			setGuildMetadata((current) => (metadata.requester ? metadata : current?.requester ? { ...metadata, requester: current.requester } : metadata));
		} catch {
			setGuildMetadata((current) => current);
		}
	};

	const refreshDashboardState = async (botId = form.botId.trim(), guildId = form.guildId.trim()) => {
		await Promise.allSettled([refreshPlayerState(botId, guildId), refreshGuildMetadata(botId, guildId)]);
	};
	const refreshManually = async () => {
		if (isRefreshingState) return;
		setIsRefreshingState(true);
		try {
			await refreshDashboardState();
		} finally {
			setIsRefreshingState(false);
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
		if (voiceToggleCooldownUntil <= Date.now()) return;
		const timeout = window.setTimeout(() => setVoiceToggleCooldownUntil(0), voiceToggleCooldownUntil - Date.now());
		return () => window.clearTimeout(timeout);
	}, [voiceToggleCooldownUntil]);

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
		setCommandFeedback(DEFAULT_COMMAND_FEEDBACK);
		setLastKnownRequesterPermissions(null);
	}, [form.botId, form.guildId]);

	useEffect(() => {
		if (isScrubbing) return;

		const sharedPlayerState = sharedDashboardPlayer?.player ?? null;
		const currentBotId = form.botId.trim();
		const currentGuildId = form.guildId.trim();
		if (
			!sharedPlayerState?.currentTrack ||
			!currentBotId ||
			!currentGuildId ||
			sharedDashboardPlayer?.botId !== currentBotId ||
			sharedDashboardPlayer?.guildId !== currentGuildId
		) {
			return;
		}

		const sharedDuration = sharedPlayerState.currentTrack.duration ?? 0;
		const sharedPosition = Math.max(0, Number(sharedDashboardPlayer.displayPosition ?? 0));
		const boundedSharedPosition = sharedDuration > 0 ? Math.min(sharedPosition, sharedDuration) : sharedPosition;
		const localTrackChanged = getTrackIdentity(player?.currentTrack) !== getTrackIdentity(sharedPlayerState.currentTrack);
		const localLivePosition = player?.currentTrack ? getLivePlayerPosition(player, player.currentTrack.duration ?? 0) : displayPosition;
		const localIsBehindSharedPlayer = boundedSharedPosition > localLivePosition + 1500;

		if (player?.currentTrack && !localTrackChanged && !localIsBehindSharedPlayer) {
			return;
		}

		setPlayer({
			...sharedPlayerState,
			position: boundedSharedPosition,
			updatedAt: Date.now(),
		});
		setPlayerError(sharedDashboardPlayer.playerError);
		setDisplayPosition(boundedSharedPosition);
		setScrubValue(boundedSharedPosition);
	}, [
		displayPosition,
		form.botId,
		form.guildId,
		isScrubbing,
		player,
		sharedDashboardPlayer?.botId,
		sharedDashboardPlayer?.displayPosition,
		sharedDashboardPlayer?.guildId,
		sharedDashboardPlayer?.player,
		sharedDashboardPlayer?.playerError,
	]);

	useEffect(() => {
		const requester = guildMetadata?.requester;
		if (!requester?.currentVoiceChannelId) return;
		setLastKnownRequesterPermissions({
			value: requester,
			recordedAt: Date.now(),
		});
	}, [guildMetadata?.requester]);

	useEffect(() => {
		if (form.botId.trim() && form.guildId.trim()) void refreshDashboardState();
	}, [form.botId, form.guildId]);

	useEffect(() => {
		if (!form.botId.trim() || !form.guildId.trim() || !authUser?.userId) {
			setGuildMetadata(null);
			return;
		}

		let active = true;
		void refreshGuildMetadata(form.botId.trim(), form.guildId.trim())
			.then(() => {
				if (!active) return;
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

		const tick = () => {
			if (document.visibilityState === 'visible') void refreshPlayerState();
		};

		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') void refreshPlayerState();
		};

		const interval = window.setInterval(tick, 8000);
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			window.clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
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
					setPlayer((current) => buildRealtimePlayerState(current, payload));
					setPlayerError(null);
				}
				if (payload.type === 'QUEUE_UPDATE') {
					setPlayer((current) => buildQueueSyncedPlayerState(current, payload));
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

	const waitForCommandResult = async (commandId: string, onStatus?: (status: CommandStatus) => void) => {
		for (let attempt = 0; attempt < 12; attempt += 1) {
			const status = await apiJson<CommandStatus>(`/api/commands/${commandId}`);
			onStatus?.(status);
			if (status.result) {
				return status;
			}
			await new Promise((resolve) => window.setTimeout(resolve, 900));
		}
		return null;
	};

	const pollCommand = async (commandId: string) => {
		const status = await waitForCommandResult(commandId, (nextStatus) => {
			setCommandFeedback((current) => (current.commandId === commandId ? buildCommandFeedbackFromStatus(nextStatus) : current));
		});
		if (status) {
			return status;
		}
		setCommandFeedback((current) => (current.commandId === commandId ? buildTimedOutCommandFeedback(current) : current));
		return null;
	};

	const sendCommand = async (type: PlayerCommandAction, overrides?: Record<string, unknown>) => {
		const commandType = PLAYER_ACTION_COMMAND_TYPES[type];
		if (!form.botId.trim() || !form.guildId.trim() || !form.userId.trim()) {
			setCommandFeedback(buildFailedCommandFeedback('Sign in and choose a server before sending player commands.', commandType));
			return;
		}
		setIsBusy(true);
		if (type === 'join' || type === 'leave') {
			setVoiceToggleCooldownUntil(Date.now() + VOICE_TOGGLE_UI_COOLDOWN_MS);
		}
		setCommandFeedback(buildSendingCommandFeedback(commandType));
		const body: Record<string, unknown> = {
			userId: form.userId.trim(),
			memberVoiceChannelId: requesterVoiceChannelId,
		};
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
			if (type === 'join' || type === 'leave') {
				await pollCommand(accepted.commandId);
				await refreshDashboardState(form.botId.trim(), form.guildId.trim());
			} else {
				void pollCommand(accepted.commandId);
				window.setTimeout(() => {
					void refreshPlayerState(form.botId.trim(), form.guildId.trim());
				}, 1200);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to send player command';
			setCommandFeedback(buildFailedCommandFeedback(message, commandType));
			await refreshDashboardState(form.botId.trim(), form.guildId.trim());
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
				body: JSON.stringify({ userId: form.userId.trim(), memberVoiceChannelId: requesterVoiceChannelId, ...body }),
			});
			setCommandFeedback(buildAcceptedCommandFeedback(accepted));
			void pollCommand(accepted.commandId);
			window.setTimeout(() => {
				void refreshPlayerState(form.botId.trim(), form.guildId.trim());
			}, 1200);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to send premium control';
			setCommandFeedback(buildFailedCommandFeedback(message, commandType));
			await refreshDashboardState(form.botId.trim(), form.guildId.trim());
		} finally {
			setIsBusy(false);
		}
	};

	const selectedGuild = useMemo(() => guildOptions.find((guild) => guild.guildId === form.guildId.trim()) ?? null, [guildOptions, form.guildId]);
	const selectedBot = useMemo(() => botOptions.find((bot) => bot.botId === form.botId.trim()) ?? null, [botOptions, form.botId]);
	const dashboardRouteMissingGuild = Boolean(form.guildId.trim()) && hasLoadedGuildOptions && !selectedGuild;
	const dashboardRouteMissingBot = Boolean(form.botId.trim()) && hasLoadedBotOptions && !selectedBot;
	const dashboardRouteBotNotInGuild =
		Boolean(form.botId.trim()) && Boolean(form.guildId.trim()) && Boolean(selectedGuild) && !selectedGuild?.connectedBots.includes(form.botId.trim());

	const currentTrack = player?.currentTrack ?? null;
	const trackDuration = currentTrack?.duration ?? 0;
	const safeDisplayPosition = currentTrack ? Math.min(displayPosition, trackDuration || displayPosition) : 0;
	const syncedDisplayPosition = isScrubbing ? Math.min(scrubValue, Math.max(trackDuration, 1000)) : Math.floor(safeDisplayPosition / 1000) * 1000;
	const queueTracks = player?.queue ?? [];
	const queueCount = queueTracks.length;
	const queueDuration = queueTracks.reduce((total, track) => total + (track.duration ?? 0), 0);
	const queueIsEmpty = !currentTrack && queueCount === 0;
	const activityState: DashboardPlayerLayoutProps['activityState'] = player?.state !== 'CONNECTED' ? 'Offline' : player?.paused ? 'Paused' : currentTrack ? 'Live' : 'Idle';
	const playerFilters = player?.filters ?? DEFAULT_PLAYER_FILTERS;
	const autoplayModeEnabled = Boolean(player?.autoplayEnabled);
	const currentTrackFromAutoplay = Boolean(currentTrack?.isAutoplay);
	const currentTrackRequester = currentTrack?.requesterName ?? null;
	const requesterPermissions = guildMetadata?.requester ?? null;
	const recentRequesterPermissions =
		lastKnownRequesterPermissions && Date.now() - lastKnownRequesterPermissions.recordedAt < REQUESTER_CONTEXT_GRACE_MS ? lastKnownRequesterPermissions.value : null;
	const effectiveRequesterPermissions = requesterPermissions?.currentVoiceChannelId
		? requesterPermissions
		: player?.voiceChannelId && recentRequesterPermissions
			? {
					...recentRequesterPermissions,
					currentVoiceChannelId: recentRequesterPermissions.currentVoiceChannelId ?? player.voiceChannelId,
				}
			: recentRequesterPermissions;
	const canUsePremiumControls = Boolean(requesterPermissions?.canUsePremiumControls);
	const canUseDjControls = Boolean(effectiveRequesterPermissions?.canUseDjControls);
	const hasVoiceChannelContext = Boolean(effectiveRequesterPermissions?.currentVoiceChannelId);
	const requesterVoiceChannelId = effectiveRequesterPermissions?.currentVoiceChannelId ?? null;
	const botVoiceChannelId = player?.voiceChannelId ?? null;
	const hasConnectedPlayer = player?.state === 'CONNECTED';
	const canManageGuild = Boolean(effectiveRequesterPermissions?.canManageGuild || requesterPermissions?.canManageGuild);
	const isVoiceToggleCoolingDown = voiceToggleCooldownUntil > Date.now();
	const canUseJoinControl = Boolean(
		authUser &&
		form.guildId.trim() &&
		requesterVoiceChannelId &&
		(!hasConnectedPlayer || (requesterVoiceChannelId !== botVoiceChannelId && queueIsEmpty)) &&
		!isVoiceToggleCoolingDown
	);
	const canUseLeaveControl = Boolean(
		hasConnectedPlayer && authUser && botVoiceChannelId && (requesterVoiceChannelId === botVoiceChannelId || canManageGuild) && !isVoiceToggleCoolingDown
	);
	const canUsePlayerDjControls = Boolean(hasConnectedPlayer && canUseDjControls);
	const canUseAutoplayControl = Boolean(hasConnectedPlayer && canUsePremiumControls && hasVoiceChannelContext);
	const canUsePremiumDjControls = Boolean(hasConnectedPlayer && canUsePremiumControls && canUseDjControls);

	const updateSearchQuery = useCallback(
		(value: string) => {
			setSearchQuery(value);
			if (value.trim().length < 3) {
				setSearchPlaylist(null);
				setSearchResults([]);
			}
			if (searchError) {
				setSearchError(null);
			}
		},
		[searchError]
	);

	const resetSearchState = useCallback(() => {
		setSearchQuery('');
		setSearchError(null);
		setSearchPlaylist(null);
		setSearchResults([]);
		setIsSearchLoading(false);
	}, []);

	const runSearch = useCallback(async () => {
		const query = searchQuery.trim();
		if (!form.botId.trim() || !form.guildId.trim() || !form.userId.trim()) {
			setSearchError('Sign in and choose a server before searching.');
			setSearchPlaylist(null);
			setSearchResults([]);
			return;
		}
		if (!requesterVoiceChannelId) {
			setSearchError('Join a permitted voice channel before searching from the dashboard.');
			setSearchPlaylist(null);
			setSearchResults([]);
			return;
		}
		if (query.length < 3) {
			setSearchError(null);
			setSearchPlaylist(null);
			setSearchResults([]);
			return;
		}

		setIsSearchLoading(true);
		setSearchError(null);
		setSearchPlaylist(null);
		setSearchResults([]);
		try {
			const accepted = await apiJson<AcceptedCommandResponse>(buildBotScopedPath(form.botId.trim(), form.guildId.trim(), '/player/search'), {
				method: 'POST',
				body: JSON.stringify({
					userId: form.userId.trim(),
					memberVoiceChannelId: requesterVoiceChannelId,
					query,
					limit: 5,
				}),
			});
			const status = await waitForCommandResult(accepted.commandId);
			if (!status?.result) {
				setSearchPlaylist(null);
				setSearchResults([]);
				setSearchError('Search timed out. Try again in a moment.');
				return;
			}

			const playlist = extractSearchPlaylist(status.result.data);
			const results = extractSearchResults(status.result.data);
			setSearchPlaylist(playlist);
			setSearchResults(results);
			setSearchError(status.result.success ? (results.length ? null : status.result.message) : status.result.message);
		} catch (error) {
			setSearchPlaylist(null);
			setSearchResults([]);
			setSearchError(error instanceof Error ? error.message : 'Unable to search tracks right now.');
		} finally {
			setIsSearchLoading(false);
		}
	}, [form.botId, form.guildId, form.userId, requesterVoiceChannelId, searchQuery]);

	const addSearchResultToQueue = useCallback(
		async (trackUrl: string, trackData?: Record<string, unknown> | null) => {
			if (!trackUrl) return false;
			if (!form.botId.trim() || !form.guildId.trim() || !form.userId.trim()) {
				setCommandFeedback(buildFailedCommandFeedback('Sign in and choose a server before queueing tracks.', 'PLAYER_SEARCH_ADD'));
				return false;
			}

			setQueueingSearchUrl(trackUrl);
			setIsBusy(true);
			setCommandFeedback(buildSendingCommandFeedback('PLAYER_SEARCH_ADD', 'Queueing the selected track from search.'));
			try {
				const accepted = await apiJson<AcceptedCommandResponse>(buildBotScopedPath(form.botId.trim(), form.guildId.trim(), '/player/search/add'), {
					method: 'POST',
					body: JSON.stringify({
						userId: form.userId.trim(),
						memberVoiceChannelId: requesterVoiceChannelId,
						trackUrl,
						trackData: trackData && typeof trackData === 'object' ? trackData : null,
					}),
				});
				setCommandFeedback(buildAcceptedCommandFeedback(accepted));
				const status = await pollCommand(accepted.commandId);
				if (status?.result?.success) {
					await refreshDashboardState(form.botId.trim(), form.guildId.trim());
					return true;
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unable to queue the selected track';
				setCommandFeedback(buildFailedCommandFeedback(message, 'PLAYER_SEARCH_ADD'));
				await refreshDashboardState(form.botId.trim(), form.guildId.trim());
			} finally {
				setQueueingSearchUrl(null);
				setIsBusy(false);
			}
			return false;
		},
		[form.botId, form.guildId, form.userId, requesterVoiceChannelId, refreshDashboardState]
	);

	const notice: DashboardNotice | null =
		commandFeedback.phase === 'failed' || commandFeedback.phase === 'timed_out'
			? {
					title: commandFeedback.title,
					body: commandFeedback.message,
					tone: commandFeedback.code === 'RATE_LIMITED' || commandFeedback.message.toLowerCase().includes('wait') ? 'warning' : 'error',
				}
			: playerError
				? {
						title: 'Player state is out of sync',
						body: `${playerError} Refresh to load the latest state.`,
						tone: 'warning',
					}
				: null;
	const activePremiumFilters = [
		playerFilters.nightcore.enabled ? 'Nightcore' : null,
		playerFilters.vaporwave.enabled ? 'Vaporwave' : null,
		playerFilters.demon.enabled ? 'Demon' : null,
		playerFilters.bassBoost.enabled ? `Bassboost ${playerFilters.bassBoost.level ?? 0}` : null,
		playerFilters.speed.enabled ? `Speed ${playerFilters.speed.level ?? 1}x` : null,
		playerFilters.pitch.enabled ? `Pitch ${playerFilters.pitch.level ?? 1}` : null,
	].filter(Boolean) as string[];

	if (dashboardRouteMissingGuild || dashboardRouteMissingBot || dashboardRouteBotNotInGuild) {
		return (
			<DashboardWorkspaceShell activeKey="overview" hideMiniPlayerBar title="Overview">
				{dashboardRouteBotNotInGuild ? (
					<DashboardRouteState
						title="Bot not in this server"
						message="This bot isn’t in the selected server right now. Invite it from the server list, or pick another server."
					/>
				) : (
					<DashboardRouteState
						title="Dashboard not available"
						message="This server or bot isn’t available to your account. Pick a server you share with Lunio from the server list."
					/>
				)}
			</DashboardWorkspaceShell>
		);
	}

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
			botOptions={botOptions}
			canUseAutoplayControl={canUseAutoplayControl}
			canUseDjControls={canUseDjControls}
			canUseJoinControl={canUseJoinControl}
			canUseLeaveControl={canUseLeaveControl}
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
			isBusy={isBusy}
			player={player}
			playerFilters={playerFilters}
			queueCount={queueCount}
			queueDuration={queueDuration}
			queueTracks={queueTracks}
			queueingSearchUrl={queueingSearchUrl}
			searchError={searchError}
			searchPlaylist={searchPlaylist}
			searchQuery={searchQuery}
			searchResults={searchResults}
			notice={notice}
			selectedBot={selectedBot}
			selectedGuild={selectedGuild}
			speedDraft={speedDraft}
			syncedDisplayPosition={syncedDisplayPosition}
			trackDuration={trackDuration}
			volumeDraft={volumeDraft}
			isSearchLoading={isSearchLoading}
			onBassboostDraftChange={setBassboostDraft}
			isRefreshingState={isRefreshingState}
			onRefreshState={() => void refreshManually()}
			onRemoveQueuedTrack={(index) => void removeQueuedTrack(index)}
			onScrubChange={setScrubValue}
			onScrubStart={() => setIsScrubbing(true)}
			onSearchReset={resetSearchState}
			onSearchQueryChange={updateSearchQuery}
			onSearchResultAdd={addSearchResultToQueue}
			onSearchSubmit={() => void runSearch()}
			onSendCommand={(action) => void sendCommand(action)}
			onSendPremiumControl={(action, body) => void sendPremiumControl(action, body)}
			onSpeedDraftChange={setSpeedDraft}
			onSubmitSeek={() => void submitSliderSeek()}
			onSubmitVolume={() => void submitVolume()}
			onSwitchBot={switchBot}
			onVolumeDraftChange={handleVolumeDraftChange}
		/>
	);
}
