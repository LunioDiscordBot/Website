"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/site-language-provider";
import { SiteShell } from "@/components/site-shell";

const commandGroups = [
  {
    title: "Everyone",
    copy:
      "Core music commands for the people actually using the bot day to day.",
    items: [
      ["/play", "Search a track or playlist and queue it immediately."],
      ["/join", "Bring Lunio into your current voice channel."],
      ["/queue", "Show the current queue with track order and duration."],
      ["/playlist", "Create, save, load, delete, share, and reorder playlists."],
      ["/songinfo", "Inspect the active track in more detail."],
      ["/lyrics", "Fetch lyrics for the current song when available."],
      ["/voteskip", "Start a community skip if DJ controls are not required."],
      ["/premium", "See premium and voting-related feature access."],
    ],
  },
  {
    title: "DJ",
    copy:
      "The commands for active queue management once music is already running.",
    items: [
      ["/pause", "Pause the current track."],
      ["/resume", "Resume playback."],
      ["/skip", "Skip one or multiple songs."],
      ["/replay", "Go back to the previous track."],
      ["/seek", "Jump to a position in the current song."],
      ["/shuffle", "Randomize the queue order."],
      ["/loop", "Cycle repeat modes for track or queue."],
      ["/remove", "Delete a specific queued track."],
      ["/move", "Reorder queue entries."],
      ["/clear", "Clear the queue."],
      ["/stop", "Stop playback and reset the player."],
      ["/leave", "Disconnect Lunio from voice."],
    ],
  },
  {
    title: "Admin",
    copy:
      "Server-level controls for panel setup, request flow, restrictions, and moderation.",
    items: [
      ["/setup", "Create or rebuild the music request panel."],
      ["/announce", "Control now playing message behavior."],
      ["/ephemeral", "Toggle ephemeral admin replies."],
      ["/language", "Change guild language."],
      ["/limit", "Set non-DJ song and duration limits."],
      ["/requester", "Manage requester display behavior."],
      ["/player-controls", "Toggle control embed behavior."],
      ["/playlists", "Allow or restrict playlist usage in the guild."],
      ["/setdj", "Manage DJ roles."],
      ["/setvc", "Restrict allowed voice channels."],
      ["/voicestatus", "Toggle voice status updates."],
      ["/cleanup", "Remove Lunio setup/control leftovers."],
      ["/logs", "Configure logging destinations."],
      ["/fix", "Repair broken channel/setup states."],
      ["/ban", "Block a user from using Lunio in the guild."],
      ["/unban", "Remove a guild user ban."],
    ],
  },
  {
    title: "Premium",
    copy:
      "Higher-end playback features for servers and users with premium access.",
    items: [
      ["/24/7", "Keep Lunio connected to voice between sessions."],
      ["/autoplay", "Let Lunio continue from recommendations."],
      ["/volume", "Adjust live playback volume."],
      ["/bassboost", "Apply bassboost levels."],
      ["/speed", "Change playback speed."],
      ["/nightcore", "Toggle the nightcore effect."],
      ["/vaporwave", "Toggle vaporwave processing."],
      ["/demon", "Toggle demon mode."],
      ["/filter", "Manage premium filters from one command."],
    ],
  },
];

const dashboardGroups = [
  {
    title: "Player dashboard",
    copy:
      "The website mirrors the same broker-backed command path as Discord. You can switch bots, view live state, remove queued tracks, use previous, skip, pause, repeat, shuffle, and change volume directly from the player page.",
  },
  {
    title: "Guild settings dashboard",
    copy:
      "Managers can configure language, announcements, custom channel mode, embed mode, DJ roles, voice restrictions, default volume, 24/7, playlist access, requester behavior, and queue limits without leaving the browser.",
  },
  {
    title: "Custom channel workflow",
    copy:
      "The dashboard can create a fresh music panel channel or clear and reuse an existing one, then provision the request panel in either embed mode.",
  },
];

export default function CommandsPage() {
  const { messages } = useSiteLanguage();

  return (
    <SiteShell currentPath="/commands">
      <section className="py-16 sm:py-24">
        <div className="shell">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(260px,0.68fr)] lg:items-end">
            <div className="max-w-4xl">
              <div className="eyebrow">{messages.commands.eyebrow}</div>
              <h1 className="section-title">{messages.commands.title}</h1>
            </div>
            <p className="section-copy max-w-xl lg:justify-self-end">
              {messages.commands.intro}
            </p>
          </div>

          <div className="mt-12 grid gap-5 xl:grid-cols-2">
            {commandGroups.map((group) => (
              <article className="panel p-6 sm:p-7" key={group.title}>
                <div className="metric-label">{group.title}</div>
                <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-start">
                  <div>
                    <h2 className="font-headline text-3xl font-bold tracking-[-0.05em] text-white">
                      {group.title} commands
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-muted">{group.copy}</p>
                  </div>
                  <div className="text-left text-xs font-extrabold uppercase tracking-[0.24em] text-white/45 lg:text-right">
                    {group.items.length} commands
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {group.items.map(([name, copy]) => (
                    <div
                      className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4"
                      key={name}
                    >
                      <div className="font-bold text-white">{name}</div>
                      <div className="mt-1 max-w-xl text-sm leading-7 text-muted">{copy}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="panel mt-10 p-6 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
              <div className="max-w-4xl">
                <div className="metric-label">{messages.commands.dashboardEyebrow}</div>
                <h2 className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
                  {messages.commands.dashboardTitle}
                </h2>
              </div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {dashboardGroups.map((group) => (
                <div
                  className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5"
                  key={group.title}
                >
                  <div className="font-headline text-2xl font-bold tracking-[-0.05em] text-white">
                    {group.title}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted">{group.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel mt-10 p-6 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div className="max-w-4xl">
                <div className="metric-label">{messages.commands.getStartedEyebrow}</div>
                <h2 className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
                  {messages.commands.getStartedTitle}
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
                  {messages.commands.getStartedCopy}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 lg:justify-end">
                <Link className="primary-button" href="/servers">
                  {messages.home.openDashboard}
                </Link>
                <Link className="secondary-button" href="/">
                  {messages.commands.backToHomepage}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
