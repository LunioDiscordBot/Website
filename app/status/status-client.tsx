"use client";

import { useEffect, useState } from "react";
import { apiJson, type BotInstance, type NodesResponse, type StatsResponse } from "@/lib/api";

type StatusState = {
  stats: StatsResponse | null;
  instances: BotInstance[];
  error: string | null;
};

export function StatusClient() {
  const [state, setState] = useState<StatusState>({
    stats: null,
    instances: [],
    error: null,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [stats, nodes] = await Promise.all([
          apiJson<StatsResponse>("/api/stats"),
          apiJson<NodesResponse>("/api/nodes"),
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
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <article className="metric-card">
          <div className="metric-label">Total Guilds</div>
          <div className="metric-value">{state.stats?.totalGuilds ?? "--"}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Active Players</div>
          <div className="metric-value text-secondary">{state.stats?.totalPlayers ?? "--"}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Instances</div>
          <div className="metric-value text-primary">{state.stats?.totalInstances ?? "--"}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Shards</div>
          <div className="metric-value text-tertiary">{state.stats?.totalShards ?? "--"}</div>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="panel p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow mb-3">Cluster View</div>
              <h2 className="font-headline text-3xl font-bold tracking-[-0.04em]">
                Real infrastructure telemetry
              </h2>
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
              Auto refresh
            </div>
          </div>

          <div className="space-y-4">
            {state.error ? (
              <div className="rounded-3xl border border-danger/30 bg-danger/10 p-5 text-sm text-red-100">
                {state.error}
              </div>
            ) : null}

            {!state.error && state.instances.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-muted">
                No active instances are reporting yet. Start Lunio and the broker stream will begin filling this page.
              </div>
            ) : null}

            {state.instances.map((instance) => {
              const health = Math.max(8, Math.min(100, 100 - Math.floor(instance.latency / 3)));

              return (
                <article
                  className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5"
                  key={instance.instanceId}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-headline text-2xl font-bold tracking-[-0.05em] text-white">
                        {instance.instanceId}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {instance.region} | {instance.guildCount} guilds | {instance.playerCount} players |{" "}
                        {instance.shards.length} shards
                      </p>
                    </div>
                    <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                      {instance.latency}ms
                    </div>
                  </div>

                  <div className="mt-5 h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary via-secondary to-tertiary"
                      style={{ width: `${health}%` }}
                    />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {instance.shards.slice(0, 6).map((shard) => (
                      <div
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                        key={shard.shardId}
                      >
                        <div className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted">
                          Shard {shard.shardId}
                        </div>
                        <div className="mt-2 text-lg font-bold text-white">{shard.status}</div>
                        <div className="mt-1 text-sm text-muted">
                          {shard.guildCount} guilds | {shard.latency}ms | {shard.memoryMB}MB
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="panel p-6">
          <div className="eyebrow mb-3">Live Feed</div>
          <h2 className="font-headline text-3xl font-bold tracking-[-0.04em]">Telemetry Feed</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Activity snapshots from the live network, focused on instance health and session flow.
          </p>

          <div className="mt-8 space-y-4">
            {state.instances.map((instance) => (
              <div
                className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4"
                key={`${instance.instanceId}-log`}
              >
                <div className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="mt-2 text-base font-bold text-white">
                  {instance.instanceId} heartbeat stable
                </div>
                <p className="mt-1 text-sm text-muted">
                  {instance.guildCount} guilds synchronized across {instance.shards.length} shard
                  {instance.shards.length === 1 ? "" : "s"}.
                </p>
              </div>
            ))}

            {state.instances.length === 0 && !state.error ? (
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">
                Waiting for nodes to identify with the broker.
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
