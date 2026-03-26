"use client";

import { useEffect, useState } from "react";
import {
  apiJson,
  formatDuration,
  type AcceptedCommandResponse,
  type CommandStatus,
  type FrontendEvent,
  type GuildPlayerState,
} from "@/lib/api";

type DashboardState = {
  guildId: string;
  userId: string;
  memberVoiceChannelId: string;
  volume: string;
  seek: string;
};

const STORAGE_KEYS = {
  guildId: "lunio:web:guildId",
  userId: "lunio:web:userId",
  memberVoiceChannelId: "lunio:web:memberVoiceChannelId",
};

const DEFAULT_STATE: DashboardState = {
  guildId: "",
  userId: "",
  memberVoiceChannelId: "",
  volume: "100",
  seek: "60000",
};

export function DashboardClient({ guildIdFromQuery }: { guildIdFromQuery?: string }) {
  const [form, setForm] = useState<DashboardState>(DEFAULT_STATE);
  const [player, setPlayer] = useState<GuildPlayerState | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [commandOutput, setCommandOutput] = useState("Command results will appear here.");
  const [isBusy, setIsBusy] = useState(false);
  const [displayPosition, setDisplayPosition] = useState(0);
  const [scrubValue, setScrubValue] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    const nextState: DashboardState = {
      ...DEFAULT_STATE,
      guildId:
        guildIdFromQuery ||
        window.localStorage.getItem(STORAGE_KEYS.guildId) ||
        DEFAULT_STATE.guildId,
      userId: window.localStorage.getItem(STORAGE_KEYS.userId) || DEFAULT_STATE.userId,
      memberVoiceChannelId:
        window.localStorage.getItem(STORAGE_KEYS.memberVoiceChannelId) ||
        DEFAULT_STATE.memberVoiceChannelId,
    };

    setForm(nextState);
  }, [guildIdFromQuery]);

  useEffect(() => {
    if (form.guildId.trim()) {
      void refreshPlayerState(form.guildId.trim());
    }
  }, [form.guildId]);

  useEffect(() => {
    if (!form.guildId.trim()) return;

    const interval = window.setInterval(() => {
      void refreshPlayerState(form.guildId.trim());
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [form.guildId]);

  useEffect(() => {
    if (!form.guildId.trim()) return;

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
    const wsUrl = apiBaseUrl.replace(/^http/i, "ws");
    const socket = new WebSocket(wsUrl);

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data) as FrontendEvent;

        if (payload.type === "PLAYER_STATE_UPDATE" && payload.guildId === form.guildId.trim()) {
          setPlayer((current) => ({
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
            isAutoPlay: payload.isAutoPlay,
            is247: payload.is247,
          }));
          setPlayerError(null);
        }

        if (payload.type === "QUEUE_UPDATE" && payload.guildId === form.guildId.trim()) {
          setPlayer((current) =>
            current
              ? {
                  ...current,
                  currentTrack: payload.currentTrack,
                  queue: payload.queue,
                  updatedAt: payload.updatedAt,
                }
              : {
                  guildId: payload.guildId,
                  instanceId: payload.instanceId,
                  currentTrack: payload.currentTrack,
                  queue: payload.queue,
                  updatedAt: payload.updatedAt,
                  paused: false,
                  volume: 100,
                  position: 0,
                  repeatMode: "off",
                  voiceChannelId: null,
                  channelId: null,
                  textChannelId: null,
                  autoPlayRequester: null,
                  isAutoPlay: null,
                  is247: null,
                },
          );
        }

        if (
          payload.type === "COMMAND_ACK" &&
          payload.guildId === form.guildId.trim()
        ) {
          setCommandOutput(
            `commandId: ${payload.commandId}\ntype: ${payload.commandType}\nack: ${payload.status} (${new Date(payload.timestamp).toLocaleTimeString()})`,
          );
        }

        if (payload.type === "COMMAND_RESULT" && payload.guildId === form.guildId.trim()) {
          setCommandOutput(
            `commandId: ${payload.commandId}\ntype: ${payload.commandType}\nresult: ${payload.success ? "success" : "failed"}\nmessage: ${payload.message}`,
          );
        }
      } catch (_error) {
        // Ignore malformed websocket payloads.
      }
    });

    return () => {
      socket.close();
    };
  }, [form.guildId]);

  useEffect(() => {
    if (!player) {
      setDisplayPosition(0);
      setScrubValue(0);
      return;
    }

    setDisplayPosition(player.position ?? 0);
    if (!isScrubbing) {
      setScrubValue(player.position ?? 0);
    }
  }, [player, isScrubbing]);

  const persist = (nextState: DashboardState) => {
    window.localStorage.setItem(STORAGE_KEYS.guildId, nextState.guildId);
    window.localStorage.setItem(STORAGE_KEYS.userId, nextState.userId);
    window.localStorage.setItem(
      STORAGE_KEYS.memberVoiceChannelId,
      nextState.memberVoiceChannelId,
    );
  };

  const updateField = (field: keyof DashboardState, value: string) => {
    setForm((current) => {
      const nextState = { ...current, [field]: value };
      persist(nextState);
      return nextState;
    });
  };

  const refreshPlayerState = async (guildId = form.guildId.trim()) => {
    if (!guildId) return;

    try {
      const state = await apiJson<GuildPlayerState>(`/api/guilds/${guildId}/player`);
      setPlayer(state);
      setPlayerError(null);
    } catch (error) {
      setPlayer(null);
      setPlayerError(error instanceof Error ? error.message : "Unable to load player state");
    }
  };

  const applyOptimisticPlayerUpdate = (
    updater: (current: GuildPlayerState) => GuildPlayerState,
  ) => {
    setPlayer((current) => {
      if (!current) return current;
      return updater(current);
    });
  };

  const pollCommand = async (commandId: string) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const status = await apiJson<CommandStatus>(`/api/commands/${commandId}`);
      const lines = [
        `commandId: ${status.commandId}`,
        `type: ${status.commandType}`,
        `ack: ${
          status.ack
            ? `${status.ack.status} (${new Date(status.ack.timestamp).toLocaleTimeString()})`
            : "waiting"
        }`,
      ];

      if (status.result) {
        lines.push(`result: ${status.result.success ? "success" : "failed"}`);
        lines.push(`message: ${status.result.message}`);
        setCommandOutput(lines.join("\n"));
        return;
      }

      setCommandOutput(lines.join("\n"));
      await new Promise((resolve) => window.setTimeout(resolve, 900));
    }

    setCommandOutput((current) => `${current}\nresult: timed out waiting for final response`);
  };

  const sendCommand = async (
    type: "skip" | "pause" | "resume" | "stop" | "volume" | "seek",
    overrides?: Record<string, unknown>,
  ) => {
    if (!form.guildId.trim() || !form.userId.trim()) {
      setCommandOutput("guildId and userId are required.");
      return;
    }

    setIsBusy(true);

    const body: Record<string, unknown> = {
      userId: form.userId.trim(),
      memberVoiceChannelId: form.memberVoiceChannelId.trim() || null,
    };

    if (type === "volume") {
      body.volume = Number(form.volume);
    }

    if (type === "seek") {
      body.position = Number(form.seek);
    }

    Object.assign(body, overrides ?? {});

    if (type === "pause") {
      applyOptimisticPlayerUpdate((current) => ({
        ...current,
        paused: true,
        updatedAt: Date.now(),
      }));
    }

    if (type === "resume") {
      applyOptimisticPlayerUpdate((current) => ({
        ...current,
        paused: false,
        updatedAt: Date.now(),
      }));
    }

    if (type === "stop") {
      applyOptimisticPlayerUpdate((current) => ({
        ...current,
        currentTrack: null,
        queue: [],
        position: 0,
        paused: false,
        updatedAt: Date.now(),
      }));
    }

    if (type === "volume") {
      const volumeValue = Number(body.volume ?? form.volume);
      applyOptimisticPlayerUpdate((current) => ({
        ...current,
        volume: Number.isFinite(volumeValue) ? volumeValue : current.volume,
        updatedAt: Date.now(),
      }));
    }

    if (type === "seek") {
      const seekValue = Number(overrides?.position ?? body.position ?? form.seek);
      applyOptimisticPlayerUpdate((current) => ({
        ...current,
        position: Number.isFinite(seekValue) ? seekValue : current.position,
        updatedAt: Date.now(),
      }));
    }

    try {
      const accepted = await apiJson<AcceptedCommandResponse>(
        `/api/guilds/${form.guildId.trim()}/player/${type}`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      setCommandOutput(
        `accepted: true\ncommandId: ${accepted.commandId}\ninstanceId: ${accepted.instanceId}`,
      );

      await pollCommand(accepted.commandId);
    } catch (error) {
      setCommandOutput(
        error instanceof Error ? `request failed: ${error.message}` : "request failed",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const submitSliderSeek = async () => {
    const safePosition = Math.max(1000, Math.floor(scrubValue));
    setForm((current) => ({ ...current, seek: String(safePosition) }));
    setPlayer((current) =>
      current
        ? {
            ...current,
            position: safePosition,
            updatedAt: Date.now(),
          }
        : current,
    );
    setIsScrubbing(false);
    setDisplayPosition(safePosition);
    await sendCommand("seek", { position: safePosition });
  };

  const trackDuration = player?.currentTrack?.duration ?? 0;
  const artworkUrl = player?.currentTrack?.artworkUrl;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
      <section className="panel p-6">
        <div className="eyebrow">Command Envelope</div>
        <h2 className="font-headline text-3xl font-bold tracking-[-0.04em] text-white">
          Browser-to-bot controls
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Playback controls, live queue updates, and responsive session management from the web.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <label>
            <div className="field-label">Guild ID</div>
            <input
              className="field-input"
              onChange={(event) => updateField("guildId", event.target.value)}
              placeholder="1151434146456014861"
              value={form.guildId}
            />
          </label>
          <label>
            <div className="field-label">User ID</div>
            <input
              className="field-input"
              onChange={(event) => updateField("userId", event.target.value)}
              placeholder="337568120028004362"
              value={form.userId}
            />
          </label>
          <label className="md:col-span-2">
            <div className="field-label">Voice Channel ID</div>
            <input
              className="field-input"
              onChange={(event) => updateField("memberVoiceChannelId", event.target.value)}
              placeholder="1478125211110084678"
              value={form.memberVoiceChannelId}
            />
          </label>
          <label>
            <div className="field-label">Volume</div>
            <input
              className="field-input"
              onChange={(event) => updateField("volume", event.target.value)}
              type="number"
              value={form.volume}
            />
          </label>
          <label>
            <div className="field-label">Seek (ms)</div>
            <input
              className="field-input"
              onChange={(event) => updateField("seek", event.target.value)}
              type="number"
              value={form.seek}
            />
          </label>
        </div>

        <div className="mt-8 rounded-[1.6rem] border border-primary/15 bg-primary/5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="field-label">Current Track Scrubber</div>
              <div className="mt-2 text-sm text-muted">
                Drag the bar and release to send a seek command through the server.
              </div>
            </div>
            <div className="text-right text-sm font-bold text-white">
              {formatDuration(isScrubbing ? scrubValue : displayPosition)} / {formatDuration(trackDuration)}
            </div>
          </div>

          <div className="mt-5">
            <input
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
              max={Math.max(trackDuration, 1000)}
              min={0}
              onChange={(event) => {
                const next = Number(event.target.value);
                setScrubValue(next);
              }}
              onMouseDown={() => setIsScrubbing(true)}
              onMouseUp={() => void submitSliderSeek()}
              onTouchStart={() => setIsScrubbing(true)}
              onTouchEnd={() => void submitSliderSeek()}
              step={1000}
              type="range"
              value={Math.min(isScrubbing ? scrubValue : displayPosition, Math.max(trackDuration, 1000))}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button className="secondary-button" disabled={isBusy} onClick={() => void sendCommand("skip")}>
            Skip
          </button>
          <button className="secondary-button" disabled={isBusy} onClick={() => void sendCommand("pause")}>
            Pause
          </button>
          <button className="secondary-button" disabled={isBusy} onClick={() => void sendCommand("resume")}>
            Resume
          </button>
          <button className="secondary-button" disabled={isBusy} onClick={() => void sendCommand("stop")}>
            Stop
          </button>
          <button className="secondary-button" disabled={isBusy} onClick={() => void sendCommand("volume")}>
            Set Volume
          </button>
          <button className="secondary-button" disabled={isBusy} onClick={() => void sendCommand("seek")}>
            Seek
          </button>
        </div>

        <div className="mt-5">
          <button className="ghost-button w-full sm:w-auto" onClick={() => void refreshPlayerState()}>
            Refresh Player State
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/40 p-5 font-mono text-sm text-cyan-100 whitespace-pre-wrap">
          {commandOutput}
        </div>
      </section>

      <aside className="panel p-6">
        <div className="eyebrow">Player State</div>
        <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/30">
          <div className="relative aspect-square overflow-hidden">
            {artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={player?.currentTrack?.title ?? "Current track artwork"}
                className="h-full w-full object-cover"
                src={artworkUrl}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-transparent to-secondary/20">
                <div className="rounded-full border border-primary/20 bg-primary/10 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.24em] text-primary">
                  No Artwork
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-6">
              <div className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
                Now Playing
              </div>
              <h2 className="mt-2 font-headline text-3xl font-bold tracking-[-0.04em] text-white">
                {player?.currentTrack?.title ?? "No active player"}
              </h2>
              <p className="mt-2 text-sm text-white/70">
                {player?.currentTrack?.artist ??
                  playerError ??
                  "Connect a guild and refresh the player state."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
            <div className="metric-label">Progress</div>
            <div className="mt-3 font-headline text-2xl font-bold tracking-[-0.05em] text-white">
              {formatDuration(displayPosition)} / {formatDuration(player?.currentTrack?.duration)}
            </div>
          </article>
          <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
            <div className="metric-label">Volume</div>
            <div className="mt-3 font-headline text-2xl font-bold tracking-[-0.05em] text-white">
              {player?.volume ?? "--"}%
            </div>
          </article>
          <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 sm:col-span-2">
            <div className="metric-label">Mode</div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
                {player?.paused ? "Paused" : "Live"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-muted">
                repeat: {player?.repeatMode ?? "--"}
              </span>
            </div>
          </article>
        </div>

        <div className="mt-8">
          <div className="field-label">Queue Preview</div>
          <div className="mt-4 space-y-3">
            {player?.currentTrack ? (
              <div className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-4">
                <div className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
                  Now Playing
                </div>
                <div className="mt-2 font-bold text-white">{player.currentTrack.title}</div>
                <div className="mt-1 text-sm text-cyan-50/70">
                  {player.currentTrack.artist} | {formatDuration(displayPosition)}
                </div>
              </div>
            ) : null}

            {player?.queue?.length ? (
              player.queue.slice(0, 6).map((track, index) => (
                <div
                  className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4"
                  key={`${track.url}-${index}`}
                >
                  <div className="font-bold text-white">{track.title}</div>
                  <div className="mt-1 text-sm text-muted">
                    {track.artist} | {formatDuration(track.duration)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">
                No queued tracks are available yet.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
