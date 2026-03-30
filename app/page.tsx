"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/site-language-provider";
import { HeroOrb } from "@/components/hero-orb";
import { SiteShell } from "@/components/site-shell";

const capabilityRows = [
  {
    eyebrow: "Playback",
    title: "Built around real music usage",
    copy:
      "Lunio is not just a slash-command wrapper. It handles live queue control, previous-track replay, autoplay, premium filters, 24/7 voice presence, and custom channel playback surfaces that still feel clean.",
    tags: ["Play", "Queue", "Replay", "Autoplay", "24/7", "Filters"],
  },
  {
    eyebrow: "Dashboard",
    title: "Discord control, but on the web",
    copy:
      "Open a guild, switch between connected bots, inspect the queue, control transport, remove queued tracks, change repeat mode, and keep the player feeling live and responsive.",
    tags: ["Multi-bot", "Live queue", "Repeat", "Volume", "Broker-backed", "Server aware"],
  },
  {
    eyebrow: "Guild setup",
    title: "Server settings that mirror the bot",
    copy:
      "Language, request mode, announcement behavior, playlist access, DJ roles, VC restrictions, voice status, custom channel mode, embed mode, default volume, and non-DJ queue limits all live in one place.",
    tags: ["Language", "DJ roles", "VC rules", "Custom channel", "Embed mode", "Limits"],
  },
];

const stats = [
  ["Multi-bot", "Run Lunio, Lunio2, and test bots side by side in the same dashboard."],
  ["Spotify-style player", "Cleaner web controls with previous, play, skip, repeat, shuffle, queue remove, and volume."],
  ["Broker connected", "Dashboard actions go through the same broker and validation path as the live bot."],
  ["Playlist heavy", "Playlist creation, loading, sharing, and track management are first-class features."],
];

export default function HomePage() {
  const { messages } = useSiteLanguage();

  return (
    <SiteShell currentPath="/" home>
      <section className="relative overflow-hidden border-b border-white/6 py-14 sm:py-20">
        <HeroOrb className="right-[-5rem] top-4 h-64 w-64" color="cyan" />
        <HeroOrb className="bottom-[-3rem] left-[-5rem] h-80 w-80" color="pink" />

        <div className="shell grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <div className="home-hero panel relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="eyebrow">
              <span className="inline-block h-2 w-2 rounded-full bg-secondary shadow-[0_0_12px_rgba(255,91,189,0.9)]" />
              {messages.home.eyebrow}
            </div>

            <h1 className="max-w-4xl font-headline text-6xl font-bold leading-[0.88] tracking-[-0.08em] text-white sm:text-7xl xl:text-[5.75rem]">
              {messages.home.heroLead}
              <span className="block bg-gradient-to-r from-primary via-cyan-100 to-primary bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(0,255,255,0.24)]">
                {messages.home.heroHighlight}
              </span>
              {messages.home.heroTail}
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              {messages.home.heroCopy}
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link className="primary-button min-w-[11rem]" href="/servers">
                {messages.home.openDashboard}
              </Link>
              <Link className="secondary-button min-w-[11rem]" href="/commands">
                {messages.home.exploreCommands}
              </Link>
            </div>

            <div className="mt-12 grid gap-4 border-t border-white/8 pt-8 lg:grid-cols-3">
              {messages.home.featureCards.map((card) => (
                <article
                  className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5"
                  key={card.title}
                >
                  <h2 className="font-headline text-2xl font-bold tracking-[-0.05em] text-white">
                    {card.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted">{card.copy}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="grid gap-5">
            <article className="panel relative overflow-hidden p-5 sm:p-6">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/70 to-transparent" />
              <div className="metric-label">{messages.home.nowPlaying}</div>
              <div className="mt-4 overflow-hidden rounded-[2rem] border border-white/8 bg-[#111] p-4">
                <div className="relative aspect-[0.92] rounded-[1.6rem] border border-white/8 bg-[radial-gradient(circle_at_50%_35%,rgba(0,255,255,0.14),transparent_38%),linear-gradient(180deg,#060707_0%,#0f1111_100%)] p-5">
                  <div className="absolute inset-x-6 top-6 flex items-center justify-between text-[0.65rem] font-extrabold uppercase tracking-[0.28em] text-white/70">
                    <span>{messages.home.customPanel}</span>
                    <span>V2 mode</span>
                  </div>
                  <div className="absolute inset-x-6 bottom-8 rounded-[1.4rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.01)_100%)] p-4">
                    <div className="font-headline text-2xl font-bold tracking-[-0.05em] text-white">
                      Midnight City
                    </div>
                    <div className="mt-2 text-sm text-muted">M83 - Requested in #music</div>
                    <div className="mt-5 flex items-center gap-2">
                      <span className="h-1.5 flex-1 rounded-full bg-white/10">
                        <span className="block h-full w-[38%] rounded-full bg-gradient-to-r from-primary to-secondary" />
                      </span>
                      <span className="text-xs font-bold text-white/80">01:42</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <p className="font-headline text-2xl font-bold tracking-[-0.05em] text-white">
                  {messages.home.customRequestSurfaces}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {messages.home.customRequestSurfacesCopy}
                </p>
              </div>
            </article>

            <article className="panel grid gap-4 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="metric-label">{messages.home.premiumLayer}</div>
                  <h2 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
                    {messages.home.filtersHeading}
                  </h2>
                </div>
                <div className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.24em] text-secondary">
                  Live
                </div>
              </div>
              <p className="text-sm leading-7 text-muted">
                Bassboost, speed, nightcore, vaporwave, demon, autoplay, and persistent 24/7 voice presence are already part of Lunio's real command set.
              </p>
              <Link className="primary-button w-full justify-center" href="/commands">
                {messages.home.seeCommands}
              </Link>
            </article>
          </aside>
        </div>
      </section>

      <section className="py-20">
        <div className="shell">
          <div className="mb-10 max-w-5xl">
            <div className="metric-label">{messages.home.whatCovers}</div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.7fr)] lg:items-end">
              <div>
                <h2 className="mt-3 max-w-4xl font-headline text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
                  {messages.home.coversHeading}
                </h2>
              </div>
              <p className="text-base leading-8 text-muted lg:justify-self-end">
                {messages.home.coversCopy}
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            {capabilityRows.map((row, index) => (
              <article
                className={`feature-card ${index === 0 ? "feature-card-wide" : ""}`}
                key={row.title}
              >
                <div className="metric-label text-primary/80">{row.eyebrow}</div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                  <div>
                    <h3 className="mt-4 max-w-4xl font-headline text-4xl font-bold tracking-[-0.06em] text-white">
                      {row.title}
                    </h3>
                    <p className="mt-4 max-w-4xl text-sm leading-7 text-muted">{row.copy}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 lg:justify-end">
                    {row.tags.map((tag) => (
                      <span
                        className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-white/80"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/6 py-14">
        <div className="shell grid gap-8 text-left sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([value, label], index) => (
            <article key={value}>
              <div
                className={
                  index === 1
                    ? "font-headline text-5xl font-bold tracking-[-0.07em] text-primary"
                    : index === 3
                      ? "font-headline text-5xl font-bold tracking-[-0.07em] text-secondary"
                      : "font-headline text-5xl font-bold tracking-[-0.07em] text-white"
                }
              >
                {value}
              </div>
              <div className="mt-2 max-w-xs text-sm leading-7 text-muted">{label}</div>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
