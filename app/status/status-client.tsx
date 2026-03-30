"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apiJson,
  formatCompactNumber,
  formatUptime,
  withBotQuery,
  type BotInstance,
  type BotsResponse,
  type FrontendEvent,
  type NodesResponse,
  type StatsResponse,
} from "@/lib/api";

type StatusState = {
  stats: StatsResponse | null;
  instances: BotInstance[];
  error: string | null;
};

type FeedItem = {
  id: string;
  label: string;
  title: string;
  body: string;
};

const BOT_STORAGE_KEY = "lunio:web:botId";

const getShardTone = (status: BotInstance["shards"][number]["status"]) => {
  if (status === "ready") return "status-shard-ready";
  if (
    status === "connecting" ||
    status === "identifying" ||
    status === "resuming" ||
    status === "waiting_for_guilds" ||
    status === "reconnecting" ||
    status === "nearly"
  ) {
    return "status-shard-warn";
  }

  return "status-shard-danger";
};

const getInstanceHealth = (instance: BotInstance) => {
  const hasDanger = instance.shards.some(
    (shard) => shard.status === "disconnected" || shard.status === "idle",
  );
  if (hasDanger) return "Degraded";

  const hasWarning = instance.shards.some(
    (shard) =>
      shard.status === "connecting" ||
      shard.status === "identifying" ||
      shard.status === "resuming" ||
      shard.status === "waiting_for_guilds" ||
      shard.status === "reconnecting" ||
      shard.status === "nearly",
  );
  if (hasWarning) return "Recovering";

  return "Operational";
};

const getHealthTone = (label: string) => {
  if (label === "Operational") return "status-badge-operational";
  if (label === "Recovering") return "status-badge-recovering";
  return "status-badge-degraded";
};

export function StatusClient() {
  const [state, setState] = useState<StatusState>({
    stats: null,
    instances: [],
    error: null,
  });
  const [botOptions, setBotOptions] = useState<Array<{ botId: string; label: string }>>([]);
  const [selectedBotId, setSelectedBotId] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [realtimeFeed, setRealtimeFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    const savedBotId = window.localStorage.getItem(BOT_STORAGE_KEY) || "";
    setSelectedBotId(savedBotId);

    let active = true;
    void apiJson<BotsResponse>("/api/bots")
      .then((response) => {
        if (!active) return;
        setBotOptions(response.bots ?? []);
      })
      .catch(() => {
        if (!active) return;
        setBotOptions([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [stats, nodes] = await Promise.all([
          apiJson<StatsResponse>(withBotQuery("/api/stats", selectedBotId || null)),
          apiJson<NodesResponse>(withBotQuery("/api/nodes", selectedBotId || null)),
        ]);

        if (!active) return;

        setState({
          stats,
          instances: nodes.instances ?? [],
          error: null,
        });
      } catch (error) {
        if (!active) return;
        setState({
          stats: null,
          instances: [],
          error: error instanceof Error ? error.message : "Unable to load status",
        });
      }
    };

    void load();
    const interval = window.setInterval(load, 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedBotId]);

  useEffect(() => {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";
    const socket = new WebSocket(apiBaseUrl.replace(/^http/i, "ws"));

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data) as FrontendEvent;
        if ("botId" in payload && selectedBotId && payload.botId !== selectedBotId) return;

        if (payload.type === "STATS_UPDATE") {
          setState((current) => {
            const nextInstances = current.instances.map((instance) =>
              instance.botId === payload.botId && instance.instanceId === payload.instanceId
                ? {
                    ...instance,
                    userCount: payload.userCount,
                    uptimeMs: payload.uptimeMs,
                    memoryMB: payload.memoryMB,
                    guildCount: payload.guildCount,
                    playerCount: payload.playerCount,
                  }
                : instance,
            );

            const totalGuilds = nextInstances.reduce((sum, instance) => sum + (instance.guildCount ?? 0), 0);
            const totalUsers = nextInstances.reduce((sum, instance) => sum + (instance.userCount ?? 0), 0);
            const totalPlayers = nextInstances.reduce((sum, instance) => sum + (instance.playerCount ?? 0), 0);
            const totalShards = nextInstances.reduce((sum, instance) => sum + (instance.shards?.length ?? 0), 0);

            return {
              ...current,
              instances: nextInstances,
              stats: current.stats
                ? {
                    ...current.stats,
                    totalGuilds,
                    totalUsers,
                    totalPlayers,
                    totalInstances: nextInstances.length,
                    totalShards,
                  }
                : current.stats,
            };
          });
          return;
        }

        if (payload.type === "SHARD_STATE_UPDATE") {
          setState((current) => {
            const nextInstances = current.instances.map((instance) =>
              instance.botId === payload.botId && instance.instanceId === payload.instanceId
                ? {
                    ...instance,
                    shards: instance.shards.some((shard) => shard.shardId === payload.shard.shardId)
                      ? instance.shards.map((shard) =>
                          shard.shardId === payload.shard.shardId ? payload.shard : shard,
                        )
                      : [...instance.shards, payload.shard].sort(
                          (left, right) => left.shardId - right.shardId,
                        ),
                  }
                : instance,
            );

            return {
              ...current,
              instances: nextInstances,
            };
          });

          const eventLabel =
            payload.event === "disconnect" || payload.event === "death"
              ? "Alert"
              : payload.event === "resume" || payload.event === "ready"
                ? "Recovery"
                : "Shard";
          const eventTitle = `Shard ${payload.shard.shardId} ${payload.event}`;
          const eventBody = `${payload.instanceId} is now ${payload.shard.status} at ${payload.shard.latency}ms latency.`;
          setRealtimeFeed((current) => [
            {
              id: `${payload.botId}:${payload.instanceId}:${payload.shard.shardId}:${payload.timestamp}`,
              label: eventLabel,
              title: eventTitle,
              body: eventBody,
            },
            ...current,
          ].slice(0, 5));
        }
      } catch {}
    });

    return () => socket.close();
  }, [selectedBotId]);

  useEffect(() => {
    if (!state.instances.length) {
      setSelectedInstanceId("");
      return;
    }

    const stillExists = state.instances.some(
      (instance) => `${instance.botId}:${instance.instanceId}` === selectedInstanceId,
    );
    if (!stillExists) {
      setSelectedInstanceId(`${state.instances[0].botId}:${state.instances[0].instanceId}`);
    }
  }, [state.instances, selectedInstanceId]);

  const selectedInstance = useMemo(
    () =>
      state.instances.find(
        (instance) => `${instance.botId}:${instance.instanceId}` === selectedInstanceId,
      ) ?? state.instances[0] ?? null,
    [state.instances, selectedInstanceId],
  );

  const averageLatency = useMemo(() => {
    if (!state.instances.length) return null;
    const total = state.instances.reduce((sum, instance) => sum + instance.latency, 0);
    return Math.round(total / state.instances.length);
  }, [state.instances]);

  const globalHealth = useMemo(() => {
    if (state.error) return "Degraded";
    if (!state.instances.length) return "Waiting";
    const hasDanger = state.instances.some((instance) => getInstanceHealth(instance) === "Degraded");
    if (hasDanger) return "Degraded";
    const hasWarning = state.instances.some((instance) => getInstanceHealth(instance) === "Recovering");
    if (hasWarning) return "Recovering";
    return "Operational";
  }, [state.error, state.instances]);

  const liveFeedItems = useMemo(() => {
    if (realtimeFeed.length) return realtimeFeed;
    if (!state.instances.length) return [];
    return state.instances.flatMap((instance) => {
      const health = getInstanceHealth(instance);
      const reconnecting = instance.shards.filter(
        (shard) =>
          shard.status === "reconnecting" ||
          shard.status === "identifying" ||
          shard.status === "resuming" ||
          shard.status === "waiting_for_guilds",
      );
      const disconnected = instance.shards.filter(
        (shard) => shard.status === "disconnected" || shard.status === "idle",
      );

      return [
        {
          id: `${instance.botId}:${instance.instanceId}:health`,
          label: health,
          title: `${instance.instanceId} ${health.toLowerCase()}`,
          body: `${formatCompactNumber(instance.guildCount)} guilds, ${formatCompactNumber(instance.userCount)} users, ${instance.latency}ms latency.`,
        },
        ...(reconnecting.length
          ? [
              {
                id: `${instance.botId}:${instance.instanceId}:recovering`,
                label: "Recovery",
                title: `${reconnecting.length} shard${reconnecting.length === 1 ? "" : "s"} recovering`,
                body: `${instance.instanceId} is actively resuming shard sessions.`,
              },
            ]
          : []),
        ...(disconnected.length
          ? [
              {
                id: `${instance.botId}:${instance.instanceId}:degraded`,
                label: "Alert",
                title: `${disconnected.length} shard${disconnected.length === 1 ? "" : "s"} offline`,
                body: `${instance.instanceId} has shard loss and should be watched closely.`,
              },
            ]
          : []),
      ];
    });
  }, [realtimeFeed, state.instances]);

  return (
    <div className="space-y-8">
      <section className="status-hero-card">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="eyebrow">Network operations</div>
            <h2 className="font-headline text-4xl font-bold tracking-[-0.06em] text-white sm:text-5xl">
              Live health across the Lunio runtime
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
              Real infrastructure visibility for guild load, shard recovery, latency, and active
              player traffic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`status-badge ${getHealthTone(globalHealth)}`}>{globalHealth}</div>
            <div className="status-badge status-badge-neutral">
              telemetry 30s
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            className={`status-filter-pill ${
              !selectedBotId ? "status-filter-pill-active" : "status-filter-pill-idle"
            }`}
            onClick={() => {
              window.localStorage.removeItem(BOT_STORAGE_KEY);
              setSelectedBotId("");
            }}
            type="button"
          >
            All Bots
          </button>
          {botOptions.map((bot) => (
            <button
              className={`status-filter-pill ${
                selectedBotId === bot.botId
                  ? "status-filter-pill-active"
                  : "status-filter-pill-idle"
              }`}
              key={bot.botId}
              onClick={() => {
                window.localStorage.setItem(BOT_STORAGE_KEY, bot.botId);
                setSelectedBotId(bot.botId);
              }}
              type="button"
            >
              {bot.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="status-summary-card">
            <div className="metric-label">Global status</div>
            <div className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              {globalHealth}
            </div>
          </article>
          <article className="status-summary-card">
            <div className="metric-label">Total guilds</div>
            <div className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              {formatCompactNumber(state.stats?.totalGuilds)}
            </div>
          </article>
          <article className="status-summary-card">
            <div className="metric-label">Total users</div>
            <div className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-primary">
              {formatCompactNumber(state.stats?.totalUsers)}
            </div>
          </article>
          <article className="status-summary-card">
            <div className="metric-label">Active players</div>
            <div className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-secondary">
              {formatCompactNumber(state.stats?.totalPlayers)}
            </div>
          </article>
          <article className="status-summary-card">
            <div className="metric-label">Average latency</div>
            <div className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              {typeof averageLatency === "number" ? `${averageLatency}ms` : "--"}
            </div>
          </article>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="status-panel-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="metric-label">Cluster fabric</div>
              <h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
                Cluster overview
              </h3>
            </div>
            <div className="text-sm text-muted">
              Select a cluster to inspect shard topology.
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {state.error ? (
              <div className="rounded-[1.6rem] border border-danger/30 bg-danger/10 p-5 text-sm text-red-100">
                {state.error}
              </div>
            ) : null}

            {!state.error && state.instances.length === 0 ? (
              <div className="status-empty-card">
                No active instances are reporting yet.
              </div>
            ) : null}

            {state.instances.map((instance) => {
              const instanceKey = `${instance.botId}:${instance.instanceId}`;
              const health = getInstanceHealth(instance);
              const selected = selectedInstanceId === instanceKey;
              const warningCount = instance.shards.filter(
                (shard) =>
                  shard.status === "reconnecting" ||
                  shard.status === "identifying" ||
                  shard.status === "resuming" ||
                  shard.status === "waiting_for_guilds" ||
                  shard.status === "nearly",
              ).length;
              const dangerCount = instance.shards.filter(
                (shard) => shard.status === "disconnected" || shard.status === "idle",
              ).length;

              return (
                <button
                  className={`status-cluster-card ${selected ? "status-cluster-card-active" : ""}`}
                  key={instanceKey}
                  onClick={() => setSelectedInstanceId(instanceKey)}
                  type="button"
                >
                  <div className="flex flex-col gap-5 text-left">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">
                          {instance.botId}
                        </div>
                        <h4 className="mt-2 font-headline text-3xl font-bold tracking-[-0.06em] text-white">
                          {instance.instanceId}
                        </h4>
                        <p className="mt-2 text-sm text-muted">{instance.region}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div className={`status-badge ${getHealthTone(health)}`}>{health}</div>
                        <div className="status-badge status-badge-neutral">
                          {instance.latency}ms
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="status-mini-stat">
                        <span>Guilds</span>
                        <strong>{formatCompactNumber(instance.guildCount)}</strong>
                      </div>
                      <div className="status-mini-stat">
                        <span>Users</span>
                        <strong>{formatCompactNumber(instance.userCount)}</strong>
                      </div>
                      <div className="status-mini-stat">
                        <span>Players</span>
                        <strong>{formatCompactNumber(instance.playerCount)}</strong>
                      </div>
                      <div className="status-mini-stat">
                        <span>Memory</span>
                        <strong>{formatCompactNumber(instance.memoryMB)} MB</strong>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="status-inline-stat">
                        <span>Shards</span>
                        <strong>{instance.shards.length}</strong>
                      </div>
                      <div className="status-inline-stat">
                        <span>Recovering</span>
                        <strong>{warningCount}</strong>
                      </div>
                      <div className="status-inline-stat">
                        <span>Offline</span>
                        <strong>{dangerCount}</strong>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="status-panel-card">
          <div className="metric-label">Live signal</div>
          <h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
            Event feed
          </h3>
          <p className="mt-3 text-sm leading-7 text-muted">
            Operational snapshots focused on health shifts, recovery, and active runtime load.
          </p>

          <div className="mt-6 space-y-3">
            {liveFeedItems.length ? (
              liveFeedItems.slice(0, 5).map((item) => (
                <article className="status-feed-card" key={item.id}>
                  <div className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
                    {item.label}
                  </div>
                  <div className="mt-2 text-base font-bold text-white">{item.title}</div>
                  <p className="mt-1 text-sm leading-7 text-muted">{item.body}</p>
                </article>
              ))
            ) : (
              <div className="status-empty-card">Waiting for instances to identify with the broker.</div>
            )}
          </div>
        </aside>
      </div>

      <section className="status-panel-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="metric-label">Shard topology</div>
            <h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              {selectedInstance ? `${selectedInstance.instanceId} shard view` : "Select a cluster"}
            </h3>
          </div>
          {selectedInstance ? (
            <div className="text-sm text-muted">
              {formatCompactNumber(selectedInstance.guildCount)} guilds,{" "}
              {formatCompactNumber(selectedInstance.userCount)} users,{" "}
              {formatUptime(selectedInstance.uptimeMs)}
            </div>
          ) : null}
        </div>

        {!selectedInstance ? (
          <div className="mt-6 status-empty-card">
            Choose a cluster above to inspect its shard layout.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {selectedInstance.shards.map((shard) => (
              <article className={`status-shard-card ${getShardTone(shard.status)}`} key={shard.shardId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/60">
                      Shard {shard.shardId}
                    </div>
                    <div className="mt-2 font-headline text-2xl font-bold tracking-[-0.05em] text-white">
                      {shard.status}
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-white/70">
                    {shard.latency}ms
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="status-inline-stat">
                    <span>Guilds</span>
                    <strong>{formatCompactNumber(shard.guildCount)}</strong>
                  </div>
                  <div className="status-inline-stat">
                    <span>Users</span>
                    <strong>{formatCompactNumber(shard.userCount)}</strong>
                  </div>
                  <div className="status-inline-stat">
                    <span>Uptime</span>
                    <strong>{formatUptime(shard.uptimeMs)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
