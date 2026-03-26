"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiJson, type StatsResponse } from "@/lib/api";

const previewGuilds = [
  {
    name: "Late Night Coding",
    guildId: "1151434146456014861",
    members: 1240,
    tag: "Productive",
  },
  {
    name: "Synthwave Society",
    guildId: "998877665544332211",
    members: 860,
    tag: "Music-first",
  },
  {
    name: "Focus Frequency",
    guildId: "887766554433221100",
    members: 412,
    tag: "Study hub",
  },
];

export function ServersClient() {
  const [copy, setCopy] = useState(
    "Browse your Lunio-enabled servers and jump directly into the dashboard.",
  );

  useEffect(() => {
    let active = true;

    void apiJson<StatsResponse>("/api/stats")
      .then((stats) => {
        if (!active) return;
        setCopy(
          `${stats.totalGuilds} guilds are connected across the network.`,
        );
      })
      .catch(() => {
        if (!active) return;
        setCopy(
          "Browse active servers and move directly into playback control.",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <p className="section-copy">{copy}</p>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {previewGuilds.map((guild) => (
          <article className="panel p-6" key={guild.guildId}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-primary/10 font-headline text-xl font-bold text-primary">
                {guild.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                Lunio Active
              </div>
            </div>

            <h2 className="mt-5 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              {guild.name}
            </h2>
            <p className="mt-2 text-sm text-muted">{guild.members} members</p>
            <p className="mt-1 text-sm text-muted">Guild ID: {guild.guildId}</p>

            <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-secondary">
              {guild.tag}
            </div>

            <div className="mt-6">
              <Link className="secondary-button w-full" href={`/dashboard?guildId=${guild.guildId}`}>
                Open Dashboard
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
