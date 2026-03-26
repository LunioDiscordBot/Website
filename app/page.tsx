import Link from "next/link";
import { HeroOrb } from "@/components/hero-orb";
import { SiteShell } from "@/components/site-shell";

export default function HomePage() {
  return (
    <SiteShell currentPath="/">
      <section className="relative overflow-hidden py-16 sm:py-24">
        <HeroOrb className="right-[-3rem] top-8 h-56 w-56" color="cyan" />
        <HeroOrb className="bottom-4 left-[-4rem] h-72 w-72" color="pink" />

        <div className="shell grid gap-10 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative">
            <div className="eyebrow">
              <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(0,255,255,0.9)]" />
              Lunio Web Control
            </div>
            <h1 className="max-w-4xl font-headline text-6xl font-bold leading-[0.9] tracking-[-0.07em] text-white sm:text-7xl xl:text-8xl">
              Sound control for your
              <span className="block bg-gradient-to-r from-primary via-cyan-100 to-primary bg-clip-text text-transparent">
                Discord music bot
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-muted">
              Public pages, live infrastructure status, and a polished dashboard for managing
              playback, sessions, and server activity.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link className="primary-button" href="/servers">
                Open Server Picker
              </Link>
              <Link className="secondary-button" href="/dashboard">
                Launch Dashboard
              </Link>
              <Link className="ghost-button" href="/status">
                View Status
              </Link>
            </div>
          </div>

          <div className="panel relative overflow-hidden p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="grid h-full gap-6">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.26em] text-muted">
                  Live Command Plane
                </div>
                <h2 className="mt-3 font-headline text-4xl font-bold tracking-[-0.05em] text-white">
                  Precision, presence, and control
                </h2>
              </div>

              <div className="grid h-48 grid-cols-7 items-end gap-3">
                {[38, 57, 82, 61, 94, 73, 48].map((height, index) => (
                  <div
                    className="rounded-t-full bg-gradient-to-t from-primary/15 to-primary shadow-cyan"
                    key={index}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
                  <div className="metric-label">Public Website</div>
                  <div className="mt-3 font-headline text-2xl font-bold tracking-[-0.05em] text-white">
                    Home + Commands + Legal
                  </div>
                </article>
                <article className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-5">
                  <div className="metric-label text-cyan-100/70">Dashboard</div>
                  <div className="mt-3 font-headline text-2xl font-bold tracking-[-0.05em] text-white">
                    Real server-backed controls
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="shell">
          <div className="grid gap-5 lg:grid-cols-3">
            <article className="panel p-6">
              <div className="metric-label">Public Presence</div>
              <h2 className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
                Homepage that looks intentional
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                A sharper visual identity, stronger hierarchy, and a cleaner experience across
                every page.
              </p>
            </article>

            <article className="panel p-6">
              <div className="metric-label">System Visibility</div>
              <h2 className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
                Status page wired to real data
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                Live node visibility, playback metrics, and a clear view into service health.
              </p>
            </article>

            <article className="panel p-6">
              <div className="metric-label">Control Surface</div>
              <h2 className="mt-3 font-headline text-3xl font-bold tracking-[-0.05em] text-white">
                Dashboard built around your command bus
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                Fast playback actions, queue handling, and responsive controls built for active
                listening sessions.
              </p>
            </article>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
