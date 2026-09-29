'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
	apiJson,
	buildBotScopedPath,
	type AcceptedCommandResponse,
	type BrokerCommandType,
	type CommandFeedback,
	type CommandStatus,
	type FrontendEvent,
	type GuildMetadata,
	type GuildPlayerState,
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

export type PlayerAction = 'join' | 'leave' | 'previous' | 'skip' | 'queue/remove' | 'shuffle' | 'repeat' | 'pause' | 'resume' | 'stop' | 'volume' | 'seek';
export type PremiumAction = 'autoplay' | 'bassboost' | 'speed' | 'filter' | 'filter/reset';
export type PlayerFilters = GuildPlayerState['filters'];

const VOICE_TOGGLE_UI_COOLDOWN_MS = 5000;

export const DEFAULT_PLAYER_FILTERS: PlayerFilters = {
	bassBoost: { enabled: false, level: 0 },
	demon: { enabled: false, level: null },
	nightcore: { enabled: false, level: null },
	pitch: { enabled: false, level: null },
	speed: { enabled: false, level: 1 },
	vaporwave: { enabled: false, level: null },
};

const PLAYER_ACTION_COMMAND_TYPES: Record<PlayerAction, BrokerCommandType> = {
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

const PREMIUM_ACTION_COMMAND_TYPES: Record<PremiumAction, BrokerCommandType> = {
	autoplay: 'PLAYER_AUTOPLAY',
	bassboost: 'PLAYER_BASSBOOST',
	speed: 'PLAYER_SPEED',
	filter: 'PLAYER_FILTER_TOGGLE',
	'filter/reset': 'PLAYER_FILTER_RESET',
};

// ── Helpers (moved out of dashboard-client) ──────────────────────────────────

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

export function getLivePlayerPosition(player: GuildPlayerState | null, trackDuration: number) {
	if (!player?.currentTrack) return 0;
	const basePosition = Math.max(0, Number(player.position ?? 0));
	if (player.paused) {
		return trackDuration > 0 ? Math.min(basePosition, trackDuration) : basePosition;
	}
	const elapsed = Math.max(0, Date.now() - Number(player.updatedAt ?? Date.now()));
	const livePosition = basePosition + elapsed;
	return trackDuration > 0 ? Math.min(livePosition, trackDuration) : livePosition;
}

export function getNextRepeatMode(repeatMode: GuildPlayerState['repeatMode'], hasCurrentTrack: boolean, queueCount: number): GuildPlayerState['repeatMode'] {
	if (repeatMode === 'off') {
		if (queueCount > 0) return 'queue';
		if (hasCurrentTrack) return 'track';
		return 'off';
	}
	if (repeatMode === 'queue') return 'track';
	return 'off';
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

// ── Context ──────────────────────────────────────────────────────────────────

export type DashboardPlayerContextValue = {
	botId: string;
	guildId: string;
	userId: string;
	hasIdentity: boolean;

	player: GuildPlayerState | null;
	playerError: string | null;
	metadata: GuildMetadata | null;
	commandFeedback: CommandFeedback;
	isBusy: boolean;

	displayPosition: number;
	trackDuration: number;
	progressPercent: number;

	scrubValue: number;
	isScrubbing: boolean;
	setIsScrubbing: (value: boolean) => void;
	setScrubValue: (value: number) => void;

	volumeDraft: number;
	setVolumeDraft: (value: number) => void;

	voiceToggleCooldownActive: boolean;

	sendCommand: (action: PlayerAction, overrides?: Record<string, unknown>) => Promise<void>;
	sendPremiumControl: (action: PremiumAction, body: Record<string, unknown>) => Promise<void>;
	submitSeek: () => Promise<void>;
	submitVolume: (next?: number) => Promise<void>;
	removeQueuedTrack: (index: number) => Promise<void>;
	refreshPlayerState: () => Promise<void>;
	refreshGuildMetadata: () => Promise<void>;
	refreshDashboardState: () => Promise<void>;
	applyOptimisticPlayerUpdate: (updater: (current: GuildPlayerState) => GuildPlayerState) => void;
};

const DashboardPlayerContext = createContext<DashboardPlayerContextValue | null>(null);

export function useDashboardPlayer(): DashboardPlayerContextValue {
	const ctx = useContext(DashboardPlayerContext);
	if (!ctx) {
		throw new Error('useDashboardPlayer must be used inside <DashboardPlayerProvider>');
	}
	return ctx;
}

export function useDashboardPlayerOptional(): DashboardPlayerContextValue | null {
	return useContext(DashboardPlayerContext);
}

// ── Provider ─────────────────────────────────────────────────────────────────

type DashboardPlayerProviderProps = {
	botId: string;
	guildId: string;
	userId: string;
	children: ReactNode;
};

export function DashboardPlayerProvider({ botId, guildId, userId, children }: DashboardPlayerProviderProps) {
	const trimmedBotId = botId.trim();
	const trimmedGuildId = guildId.trim();
	const trimmedUserId = userId.trim();
	const hasIdentity = Boolean(trimmedBotId && trimmedGuildId);

	const [player, setPlayer] = useState<GuildPlayerState | null>(null);
	const [playerError, setPlayerError] = useState<string | null>(null);
	const [metadata, setMetadata] = useState<GuildMetadata | null>(null);
	const [commandFeedback, setCommandFeedback] = useState<CommandFeedback>(DEFAULT_COMMAND_FEEDBACK);
	const [isBusy, setIsBusy] = useState(false);

	const [displayPosition, setDisplayPosition] = useState(0);
	const [scrubValue, setScrubValue] = useState(0);
	const [isScrubbing, setIsScrubbing] = useState(false);
	const [volumeDraft, setVolumeDraft] = useState(100);
	const [voiceToggleCooldownUntil, setVoiceToggleCooldownUntil] = useState(0);

	const requesterVoiceChannelId = metadata?.requester?.currentVoiceChannelId ?? null;

	const applyOptimisticPlayerUpdate = useCallback((updater: (current: GuildPlayerState) => GuildPlayerState) => {
		setPlayer((current) => (current ? updater(current) : current));
	}, []);

	const refreshPlayerState = useCallback(async () => {
		if (!trimmedBotId || !trimmedGuildId) return;
		try {
			const state = await apiJson<GuildPlayerState | null>(buildBotScopedPath(trimmedBotId, trimmedGuildId, '/player'));
			setPlayer((current) => normalizeFetchedPlayerState(state, current));
			setPlayerError(null);
		} catch (error) {
			setPlayer(null);
			setPlayerError(error instanceof Error ? error.message : 'Unable to load player state');
		}
	}, [trimmedBotId, trimmedGuildId]);

	const refreshGuildMetadata = useCallback(async () => {
		if (!trimmedBotId || !trimmedGuildId || !trimmedUserId) {
			setMetadata(null);
			return;
		}
		try {
			const next = await apiJson<GuildMetadata>(buildBotScopedPath(trimmedBotId, trimmedGuildId, '/metadata'));
			setMetadata((current) => (next.requester ? next : current?.requester ? { ...next, requester: current.requester } : next));
		} catch {
			// keep existing metadata on failure
		}
	}, [trimmedBotId, trimmedGuildId, trimmedUserId]);

	const refreshDashboardState = useCallback(async () => {
		await Promise.allSettled([refreshPlayerState(), refreshGuildMetadata()]);
	}, [refreshPlayerState, refreshGuildMetadata]);

	// Reset transient state when bot/guild changes
	useEffect(() => {
		setPlayer(null);
		setPlayerError(null);
		setMetadata(null);
		setDisplayPosition(0);
		setScrubValue(0);
		setIsScrubbing(false);
		setCommandFeedback(DEFAULT_COMMAND_FEEDBACK);
	}, [trimmedBotId, trimmedGuildId]);

	// Initial fetch on identity change
	useEffect(() => {
		if (hasIdentity) void refreshDashboardState();
	}, [hasIdentity, refreshDashboardState]);

	// Re-fetch metadata when voice channel or current track url changes
	useEffect(() => {
		if (!hasIdentity || !trimmedUserId) return;
		void refreshGuildMetadata();
	}, [hasIdentity, trimmedUserId, player?.voiceChannelId, player?.currentTrack?.url, refreshGuildMetadata]);

	// Polling for player state (8s)
	useEffect(() => {
		if (!hasIdentity) return;
		const tick = () => {
			if (document.visibilityState === 'visible') void refreshPlayerState();
		};
		const onVisibility = () => {
			if (document.visibilityState === 'visible') void refreshPlayerState();
		};
		const interval = window.setInterval(tick, 8000);
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			window.clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [hasIdentity, refreshPlayerState]);

	// WebSocket subscription
	useEffect(() => {
		if (!hasIdentity) return;
		const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
		const socket = new WebSocket(apiBaseUrl.replace(/^http/i, 'ws'));
		socket.addEventListener('message', (event) => {
			try {
				const payload = JSON.parse(event.data) as FrontendEvent;
				if (payload.botId !== trimmedBotId) return;
				if ('guildId' in payload && payload.guildId !== trimmedGuildId) return;
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
	}, [hasIdentity, trimmedBotId, trimmedGuildId]);

	// Position interpolation: snapshot whenever player updates
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

	// Position interpolation: tick while playing
	useEffect(() => {
		if (!player?.currentTrack || player.paused || isScrubbing) return;
		const interval = window.setInterval(() => {
			setDisplayPosition(getLivePlayerPosition(player, player.currentTrack?.duration ?? 0));
		}, 500);
		return () => window.clearInterval(interval);
	}, [player, isScrubbing]);

	// Sync volume draft from authoritative state
	useEffect(() => {
		if (typeof player?.volume === 'number') {
			setVolumeDraft(player.volume);
		}
	}, [player?.volume]);

	// Voice-toggle cooldown timer
	useEffect(() => {
		if (voiceToggleCooldownUntil <= Date.now()) return;
		const timeout = window.setTimeout(() => setVoiceToggleCooldownUntil(0), voiceToggleCooldownUntil - Date.now());
		return () => window.clearTimeout(timeout);
	}, [voiceToggleCooldownUntil]);

	const waitForCommandResult = useCallback(async (commandId: string, onStatus?: (status: CommandStatus) => void) => {
		for (let attempt = 0; attempt < 12; attempt += 1) {
			const status = await apiJson<CommandStatus>(`/api/commands/${commandId}`);
			onStatus?.(status);
			if (status.result) {
				return status;
			}
			await new Promise((resolve) => window.setTimeout(resolve, 900));
		}
		return null;
	}, []);

	const pollCommand = useCallback(
		async (commandId: string) => {
			const status = await waitForCommandResult(commandId, (nextStatus) => {
				setCommandFeedback((current) => (current.commandId === commandId ? buildCommandFeedbackFromStatus(nextStatus) : current));
			});
			if (status) return status;
			setCommandFeedback((current) => (current.commandId === commandId ? buildTimedOutCommandFeedback(current) : current));
			return null;
		},
		[waitForCommandResult]
	);

	const sendCommand = useCallback(
		async (type: PlayerAction, overrides?: Record<string, unknown>) => {
			const commandType = PLAYER_ACTION_COMMAND_TYPES[type];
			if (!trimmedBotId || !trimmedGuildId || !trimmedUserId) {
				setCommandFeedback(buildFailedCommandFeedback('Sign in and choose a server before sending player commands.', commandType));
				return;
			}
			setIsBusy(true);
			if (type === 'join' || type === 'leave') {
				setVoiceToggleCooldownUntil(Date.now() + VOICE_TOGGLE_UI_COOLDOWN_MS);
			}
			setCommandFeedback(buildSendingCommandFeedback(commandType));
			const body: Record<string, unknown> = {
				userId: trimmedUserId,
				memberVoiceChannelId: requesterVoiceChannelId,
			};
			if (type === 'volume') body.volume = volumeDraft;
			if (type === 'seek') body.position = scrubValue;
			Object.assign(body, overrides ?? {});

			if (type === 'pause') applyOptimisticPlayerUpdate((current) => ({ ...current, paused: true, updatedAt: Date.now() }));
			if (type === 'resume') applyOptimisticPlayerUpdate((current) => ({ ...current, paused: false, updatedAt: Date.now() }));
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
				const volumeValue = Number(body.volume ?? volumeDraft);
				applyOptimisticPlayerUpdate((current) => ({
					...current,
					volume: Number.isFinite(volumeValue) ? volumeValue : current.volume,
					updatedAt: Date.now(),
				}));
			}
			if (type === 'seek') {
				const seekValue = Number(overrides?.position ?? body.position ?? scrubValue);
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
				const accepted = await apiJson<AcceptedCommandResponse>(buildBotScopedPath(trimmedBotId, trimmedGuildId, `/player/${type}`), {
					method: 'POST',
					body: JSON.stringify(body),
				});
				setCommandFeedback(buildAcceptedCommandFeedback(accepted));
				if (type === 'join' || type === 'leave') {
					await pollCommand(accepted.commandId);
					await refreshDashboardState();
				} else {
					void pollCommand(accepted.commandId);
					window.setTimeout(() => {
						void refreshPlayerState();
					}, 1200);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unable to send player command';
				setCommandFeedback(buildFailedCommandFeedback(message, commandType));
				await refreshDashboardState();
			} finally {
				setIsBusy(false);
			}
		},
		[trimmedBotId, trimmedGuildId, trimmedUserId, requesterVoiceChannelId, volumeDraft, scrubValue, applyOptimisticPlayerUpdate, pollCommand, refreshDashboardState, refreshPlayerState]
	);

	const sendPremiumControl = useCallback(
		async (action: PremiumAction, body: Record<string, unknown>) => {
			const commandType = PREMIUM_ACTION_COMMAND_TYPES[action];
			if (!trimmedBotId || !trimmedGuildId || !trimmedUserId) {
				setCommandFeedback(buildFailedCommandFeedback('Sign in and choose a server before sending premium controls.', commandType));
				return;
			}
			setIsBusy(true);
			setCommandFeedback(buildSendingCommandFeedback(commandType));
			try {
				const accepted = await apiJson<AcceptedCommandResponse>(buildBotScopedPath(trimmedBotId, trimmedGuildId, `/player/${action}`), {
					method: 'POST',
					body: JSON.stringify({ userId: trimmedUserId, memberVoiceChannelId: requesterVoiceChannelId, ...body }),
				});
				setCommandFeedback(buildAcceptedCommandFeedback(accepted));
				void pollCommand(accepted.commandId);
				window.setTimeout(() => {
					void refreshPlayerState();
				}, 1200);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unable to send premium control';
				setCommandFeedback(buildFailedCommandFeedback(message, commandType));
				await refreshDashboardState();
			} finally {
				setIsBusy(false);
			}
		},
		[trimmedBotId, trimmedGuildId, trimmedUserId, requesterVoiceChannelId, pollCommand, refreshPlayerState, refreshDashboardState]
	);

	const submitSeek = useCallback(async () => {
		const safePosition = Math.max(1000, Math.floor(scrubValue));
		setPlayer((current) => (current ? { ...current, position: safePosition, updatedAt: Date.now() } : current));
		setIsScrubbing(false);
		setDisplayPosition(safePosition);
		await sendCommand('seek', { position: safePosition });
	}, [scrubValue, sendCommand]);

	const submitVolume = useCallback(
		async (next?: number) => {
			const nextVolume = typeof next === 'number' ? next : volumeDraft;
			const safeVolume = Math.max(1, Math.min(200, Math.round(nextVolume)));
			setVolumeDraft(safeVolume);
			await sendCommand('volume', { volume: safeVolume });
		},
		[volumeDraft, sendCommand]
	);

	const removeQueuedTrack = useCallback(
		async (index: number) => {
			await sendCommand('queue/remove', { index });
		},
		[sendCommand]
	);

	const trackDuration = player?.currentTrack?.duration ?? 0;
	const progressPercent = trackDuration > 0 ? Math.min(100, Math.max(0, (displayPosition / trackDuration) * 100)) : 0;
	const voiceToggleCooldownActive = voiceToggleCooldownUntil > Date.now();

	const value: DashboardPlayerContextValue = useMemo(
		() => ({
			botId: trimmedBotId,
			guildId: trimmedGuildId,
			userId: trimmedUserId,
			hasIdentity,
			player,
			playerError,
			metadata,
			commandFeedback,
			isBusy,
			displayPosition,
			trackDuration,
			progressPercent,
			scrubValue,
			isScrubbing,
			setIsScrubbing,
			setScrubValue,
			volumeDraft,
			setVolumeDraft,
			voiceToggleCooldownActive,
			sendCommand,
			sendPremiumControl,
			submitSeek,
			submitVolume,
			removeQueuedTrack,
			refreshPlayerState,
			refreshGuildMetadata,
			refreshDashboardState,
			applyOptimisticPlayerUpdate,
		}),
		[
			trimmedBotId,
			trimmedGuildId,
			trimmedUserId,
			hasIdentity,
			player,
			playerError,
			metadata,
			commandFeedback,
			isBusy,
			displayPosition,
			trackDuration,
			progressPercent,
			scrubValue,
			isScrubbing,
			volumeDraft,
			voiceToggleCooldownActive,
			sendCommand,
			sendPremiumControl,
			submitSeek,
			submitVolume,
			removeQueuedTrack,
			refreshPlayerState,
			refreshGuildMetadata,
			refreshDashboardState,
			applyOptimisticPlayerUpdate,
		]
	);

	return <DashboardPlayerContext.Provider value={value}>{children}</DashboardPlayerContext.Provider>;
}
