import { SiteShell } from "@/components/site-shell";

const groups = [
  {
    title: "Playback",
    items: [
      ["/play", "Search and start playback."],
      ["/pause", "Pause the current track."],
      ["/resume", "Resume a paused player."],
      ["/skip", "Move to the next track."],
      ["/stop", "Stop playback and clear the queue."],
    ],
  },
  {
    title: "Queue",
    items: [
      ["/queue", "Inspect the upcoming tracks."],
      ["/remove", "Remove a queued song."],
      ["/shuffle", "Randomize the queue order."],
      ["/loop", "Repeat one track or the full queue."],
      ["/seek", "Jump to a specific moment in the current track."],
    ],
  },
  {
    title: "Dashboard",
    items: [
      ["Skip / Pause / Resume", "Already wired through the server broker."],
      ["Stop", "Clears playback through the same validated path."],
      ["Volume", "Accepts values between 1 and 200."],
      ["Seek", "Uses millisecond positions through the API."],
      ["Command Status", "ACK and RESULT are stored by commandId."],
    ],
  },
];

export default function CommandsPage() {
  return (
    <SiteShell currentPath="/commands">
      <section className="py-16 sm:py-24">
        <div className="shell">
          <div className="eyebrow">Command Guide</div>
          <h1 className="section-title">A commands page that feels like part of the product</h1>
          <p className="section-copy mt-5">
            Bot-facing and web-facing controls live in the same system now, so this page explains
            both without feeling stitched together.
          </p>

          <div className="mt-12 grid gap-5 xl:grid-cols-3">
            {groups.map((group) => (
              <article className="panel p-6" key={group.title}>
                <div className="metric-label">{group.title}</div>
                <h2 className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
                  {group.title} controls
                </h2>

                <div className="mt-6 space-y-4">
                  {group.items.map(([name, copy]) => (
                    <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4" key={name}>
                      <div className="font-bold text-white">{name}</div>
                      <div className="mt-1 text-sm leading-7 text-muted">{copy}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="panel mt-10 p-6">
            <div className="metric-label">API Shape</div>
            <h2 className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
              Dashboard requests stay very readable
            </h2>
            <pre className="mt-6 overflow-x-auto rounded-[1.5rem] border border-white/10 bg-black/40 p-5 text-sm text-cyan-100">
{`POST /api/guilds/:guildId/player/pause
{
  "userId": "337568120028004362",
  "memberVoiceChannelId": "1478125211110084678"
}

GET /api/commands/:commandId`}
            </pre>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
