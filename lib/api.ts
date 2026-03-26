export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export interface BotInstance {
  instanceId: string;
  region: string;
  connectedAt: number;
  lastHeartbeat: number;
  latency: number;
  guildCount: number;
  playerCount: number;
  shards: Array<{
    shardId: number;
    status: "ready" | "connecting" | "disconnected";
    latency: number;
    guildCount: number;
    memoryMB: number;
  }>;
}

export interface StatsResponse {
  totalGuilds: number;
  totalPlayers: number;
  totalInstances: number;
  totalShards: number;
}

export interface NodesResponse {
  instances: BotInstance[];
}

export interface Track {
  title: string;
  artist: string;
  duration: number;
  url: string;
  artworkUrl: string;
}

export interface GuildPlayerState {
  guildId: string;
  instanceId: string;
  currentTrack: Track | null;
  queue: Track[];
  updatedAt: number;
  paused: boolean;
  volume: number;
  position: number;
  repeatMode: "off" | "track" | "queue";
  voiceChannelId: string | null;
  channelId: string | null;
  textChannelId: string | null;
  autoPlayRequester: string | null;
  isAutoPlay: boolean | null;
  is247: boolean | null;
}

export interface CommandStatus {
  commandId: string;
  commandType: string;
  guildId: string;
  instanceId: string;
  ack?: {
    status: "received";
    timestamp: number;
  };
  result?: {
    success: boolean;
    message: string;
    code?: string;
    timestamp: number;
    data?: Record<string, unknown>;
  };
  updatedAt: number;
}

export interface AcceptedCommandResponse {
  accepted: true;
  commandId: string;
  commandType: string;
  guildId: string;
  instanceId: string;
}

export interface FrontendQueueEvent {
  type: "QUEUE_UPDATE";
  instanceId: string;
  guildId: string;
  currentTrack: Track | null;
  queue: Track[];
  updatedAt: number;
}

export interface FrontendPlayerStateEvent {
  type: "PLAYER_STATE_UPDATE";
  instanceId: string;
  guildId: string;
  currentTrack: Track | null;
  updatedAt: number;
  paused: boolean;
  volume: number;
  position: number;
  repeatMode: "off" | "track" | "queue";
  voiceChannelId: string | null;
  channelId: string | null;
  textChannelId: string | null;
  autoPlayRequester: string | null;
  isAutoPlay: boolean | null;
  is247: boolean | null;
  filters?: Record<string, unknown>;
}

export interface FrontendCommandAckEvent {
  type: "COMMAND_ACK";
  instanceId: string;
  commandId: string;
  commandType: string;
  guildId: string;
  status: "received";
  timestamp: number;
}

export interface FrontendCommandResultEvent {
  type: "COMMAND_RESULT";
  instanceId: string;
  commandId: string;
  commandType: string;
  guildId: string;
  success: boolean;
  code?: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export type FrontendEvent =
  | FrontendQueueEvent
  | FrontendPlayerStateEvent
  | FrontendCommandAckEvent
  | FrontendCommandResultEvent;

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

export function formatDuration(ms: number | null | undefined) {
  if (!ms || ms < 0) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
