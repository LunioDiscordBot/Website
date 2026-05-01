export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
export const API_PREFIX = '/v1';

function normalizeApiPath(path: string) {
	if (path.startsWith('/api/')) {
		return `${API_PREFIX}${path.slice(4)}`;
	}
	if (path === '/api') {
		return API_PREFIX;
	}
	if (path.startsWith('/v1/')) {
		return path;
	}
	return `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface BotInstance {
	botId: string;
	instanceId: string;
	region: string;
	connectedAt: number;
	lastHeartbeat: number;
	uptimeMs: number;
	latency: number;
	userCount: number;
	memoryMB: number;
	guildCount: number;
	playerCount: number;
	shards: Array<{
		shardId: number;
		status: 'ready' | 'connecting' | 'reconnecting' | 'idle' | 'nearly' | 'disconnected' | 'waiting_for_guilds' | 'identifying' | 'resuming';
		latency: number;
		guildCount: number;
		userCount: number;
		playerCount: number;
		uptimeMs: number;
	}>;
}

export interface StatsResponse {
	botId: string | null;
	totalGuilds: number;
	totalUsers: number;
	totalPlayers: number;
	totalInstances: number;
	totalShards: number;
}

export interface NodesResponse {
	botId: string | null;
	instances: BotInstance[];
}

export interface BotsResponse {
	bots: Array<{
		botId: string;
		label: string;
		avatarUrl?: string | null;
		inviteUrl?: string | null;
	}>;
}

export interface AuthUser {
	userId: string;
	username: string;
	globalName: string | null;
	avatarUrl: string | null;
}

export interface AuthGuild {
	guildId: string;
	name: string;
	iconUrl: string | null;
	owner: boolean;
	canManage: boolean;
	connectedBots: string[];
	botStates: Array<{
		botId: string;
		label: string;
		avatarUrl: string | null;
		clientId: string | null;
		inviteUrl: string | null;
		status: 'connected' | 'invite';
	}>;
}

export interface AuthGuildsResponse {
	guilds: AuthGuild[];
}

export interface ReferralPromoStatus {
	granted: boolean;
	ready: boolean;
	anchorGuild: {
		guildId: string;
		name: string | null;
	} | null;
	pendingGuild: {
		guildId: string;
		name: string | null;
	} | null;
	redeemedGuildIds?: string[];
	message: string;
}

export interface ReferralPromoStatusResponse {
	botId: string;
	status: ReferralPromoStatus | null;
}

export interface GuildSettings {
	botId: string;
	guildId: string;
	Language: string;
	Announce: boolean;
	DelAnnounce: boolean;
	Playlists: boolean;
	Ephemeral: boolean;
	Requester: boolean;
	PlayerControls: boolean;
	VoiceStatus: boolean;
	DefaultVol: number;
	MusicDJ: boolean;
	MusicDJRole: string[];
	VCToggle: boolean;
	VCs: string[];
	CustomChannel: boolean;
	mChannelID: string | null;
	LogsChannelID: string | null;
	mEmbedMode: 'v1' | 'v2';
	SongUserLimit: number;
	SongTimeLimitMS: number;
	twentyFourSeven: boolean;
	premiumRequired: {
		DefaultVol: boolean;
		twentyFourSeven: boolean;
	};
	updatedAt: number;
}

export interface GuildMetadata {
	guildId: string;
	name: string;
	icon: string | null;
	memberCount: number;
	roles: Array<{
		id: string;
		name: string;
	}>;
	textChannels: Array<{
		id: string;
		name: string;
	}>;
	voiceChannels: Array<{
		id: string;
		name: string;
		type: 'voice' | 'stage';
	}>;
	settings?: {
		CustomChannel: boolean;
		mChannelID: string | null;
		LogsChannelID?: string | null;
		mEmbedMode: 'v1' | 'v2';
		Announce: boolean;
		DelAnnounce: boolean;
		MusicDJ: boolean;
		MusicDJRole: string[];
		VCToggle: boolean;
		VCs: string[];
		DefaultVol: number;
		Playlists: boolean;
		twentyFourSeven: boolean;
		permpremium: boolean;
		Language: string;
		Requester: boolean;
		PlayerControls: boolean;
		VoiceStatus: boolean;
		Ephemeral: boolean;
		SongUserLimit: number;
		SongTimeLimitMS: number;
	};
	requester?: {
		userId: string;
		roleIds: string[];
		currentVoiceChannelId: string | null;
		canUseDjControls: boolean;
		canUsePremiumControls: boolean;
		canManageGuild: boolean;
	};
}

export interface Track {
	title: string;
	artist: string;
	duration: number;
	url: string;
	artworkUrl: string | null;
	isAutoplay?: boolean | null;
	requesterName?: string | null;
}

export interface SearchTrackResult {
	title: string;
	artist: string;
	duration: number;
	url: string;
	artworkUrl: string | null;
	sourceName?: string | null;
	trackData?: Record<string, unknown> | null;
}

export interface SearchPlaylistResult {
	title: string;
	url: string;
	artworkUrl: string | null;
	trackCount: number;
	author?: string | null;
}

export type BrokerCommandType =
	| 'GUILD_SETTINGS_UPDATE'
	| 'PLAYER_JOIN'
	| 'PLAYER_LEAVE'
	| 'PLAYER_PREVIOUS'
	| 'PLAYER_SEARCH'
	| 'PLAYER_SEARCH_ADD'
	| 'PLAYER_SKIP'
	| 'PLAYER_QUEUE_REMOVE'
	| 'PLAYER_SHUFFLE'
	| 'PLAYER_REPEAT'
	| 'PLAYER_PAUSE'
	| 'PLAYER_RESUME'
	| 'PLAYER_STOP'
	| 'PLAYER_VOLUME'
	| 'PLAYER_SEEK'
	| 'PLAYER_AUTOPLAY'
	| 'PLAYER_BASSBOOST'
	| 'PLAYER_SPEED'
	| 'PLAYER_FILTER_TOGGLE'
	| 'PLAYER_FILTER_RESET';

export type CommandAckStatus = 'received';
export type CommandResultData = Record<string, unknown>;
export type CommandFeedbackPhase = 'idle' | 'sending' | 'accepted' | 'received' | 'succeeded' | 'failed' | 'timed_out';

export interface CommandFeedback {
	phase: CommandFeedbackPhase;
	title: string;
	message: string;
	commandId?: string;
	commandType?: BrokerCommandType;
	instanceId?: string;
	code?: string;
	ackTimestamp?: number;
	resultTimestamp?: number;
	updatedAt?: number;
}

export interface GuildPlayerState {
	botId: string;
	guildId: string;
	instanceId: string;
	revision: number;
	state: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'DISCONNECTING' | 'DESTROYING';
	currentTrack: Track | null;
	queue: Track[];
	updatedAt: number;
	paused: boolean;
	volume: number;
	position: number;
	repeatMode: 'off' | 'track' | 'queue';
	voiceChannelId: string | null;
	channelId: string | null;
	textChannelId: string | null;
	autoPlayRequester: string | null;
	autoplayEnabled: boolean | null;
	isAutoPlay: boolean | null;
	is247: boolean | null;
	filters: {
		bassBoost: {
			enabled: boolean | null;
			level: number | null;
		};
		demon: {
			enabled: boolean | null;
			level: number | null;
		};
		nightcore: {
			enabled: boolean | null;
			level: number | null;
		};
		pitch: {
			enabled: boolean | null;
			level: number | null;
		};
		speed: {
			enabled: boolean | null;
			level: number | null;
		};
		vaporwave: {
			enabled: boolean | null;
			level: number | null;
		};
	};
}

export interface CommandStatus {
	botId?: string;
	commandId: string;
	commandType: BrokerCommandType;
	guildId: string;
	instanceId: string;
	ack?: {
		status: CommandAckStatus;
		timestamp: number;
	};
	result?: {
		success: boolean;
		message: string;
		code?: string;
		timestamp: number;
		data?: CommandResultData;
	};
	updatedAt: number;
}

export interface AcceptedCommandResponse {
	accepted: true;
	botId: string;
	commandId: string;
	commandType: BrokerCommandType;
	guildId: string;
	instanceId: string;
}

export interface GuildSettingsSaveResponse {
	settings: GuildSettings;
	command: {
		commandId: string;
		commandType: BrokerCommandType;
		guildId: string;
		instanceId: string;
		ack?: CommandStatus['ack'];
		result: NonNullable<CommandStatus['result']>;
	};
}

export interface FrontendQueueEvent {
	type: 'QUEUE_UPDATE';
	botId: string;
	instanceId: string;
	guildId: string;
	revision: number;
	currentTrack: Track | null;
	queue: Track[];
	updatedAt: number;
}

export interface FrontendPlayerStateEvent {
	type: 'PLAYER_STATE_UPDATE';
	botId: string;
	instanceId: string;
	guildId: string;
	revision: number;
	state: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'DISCONNECTING' | 'DESTROYING';
	currentTrack: Track | null;
	updatedAt: number;
	paused: boolean;
	volume: number;
	position: number;
	repeatMode: 'off' | 'track' | 'queue';
	voiceChannelId: string | null;
	channelId: string | null;
	textChannelId: string | null;
	autoPlayRequester: string | null;
	autoplayEnabled: boolean | null;
	isAutoPlay: boolean | null;
	is247: boolean | null;
	filters?: Record<string, unknown>;
}

export interface FrontendCommandAckEvent {
	type: 'COMMAND_ACK';
	botId: string;
	instanceId: string;
	commandId: string;
	commandType: BrokerCommandType;
	guildId: string;
	status: CommandAckStatus;
	timestamp: number;
}

export interface FrontendCommandResultEvent {
	type: 'COMMAND_RESULT';
	botId: string;
	instanceId: string;
	commandId: string;
	commandType: BrokerCommandType;
	guildId: string;
	success: boolean;
	code?: string;
	message: string;
	timestamp: number;
	data?: CommandResultData;
}

export interface FrontendStatsEvent {
	type: 'STATS_UPDATE';
	botId: string;
	instanceId: string;
	userCount: number;
	uptimeMs: number;
	memoryMB: number;
	guildCount: number;
	playerCount: number;
}

export interface FrontendLogEvent {
	type: 'LOG_EVENT';
	botId: string;
	instanceId: string;
	level: 'info' | 'warn' | 'error';
	message: string;
	timestamp: number;
}

export interface FrontendShardStateEvent {
	type: 'SHARD_STATE_UPDATE';
	botId: string;
	instanceId: string;
	shard: BotInstance['shards'][number];
	event: 'spawn' | 'disconnect' | 'resume' | 'death' | 'ready' | 'reconnecting';
	timestamp: number;
	details?: Record<string, unknown>;
}

export type FrontendEvent =
	| FrontendStatsEvent
	| FrontendLogEvent
	| FrontendShardStateEvent
	| FrontendQueueEvent
	| FrontendPlayerStateEvent
	| FrontendCommandAckEvent
	| FrontendCommandResultEvent;

export function buildBotScopedPath(botId: string, guildId: string, suffix = '') {
	return `${API_PREFIX}/bots/${encodeURIComponent(botId)}/guilds/${encodeURIComponent(guildId)}${suffix}`;
}

export function withBotQuery(path: string, botId?: string | null) {
	if (!botId) return path;
	const separator = path.includes('?') ? '&' : '?';
	return `${path}${separator}botId=${encodeURIComponent(botId)}`;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${normalizeApiPath(path)}`, {
		...init,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(init?.headers || {}),
		},
		cache: 'no-store',
	});

	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(typeof data?.error === 'string' ? data.error : `Request failed with status ${response.status}`);
	}

	return data as T;
}

export function formatDuration(ms: number | null | undefined) {
	if (!ms || ms < 0) return '--:--';
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatCompactNumber(value: number | null | undefined) {
	if (typeof value !== 'number' || Number.isNaN(value)) return '--';
	return new Intl.NumberFormat('en', {
		notation: value >= 1000 ? 'compact' : 'standard',
		maximumFractionDigits: value >= 1000 ? 1 : 0,
	}).format(value);
}

export function formatUptime(ms: number | null | undefined) {
	if (!ms || ms < 0) return '--';
	const totalSeconds = Math.floor(ms / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);

	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
}
