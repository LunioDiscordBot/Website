import Link from "next/link";
import { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/commands", label: "Commands" },
  { href: "/status", label: "Status" },
  { href: "/login", label: "Login" },
  { href: "/servers", label: "Servers" },
  { href: "/dashboard", label: "Dashboard" },
];

type SiteShellProps = PropsWithChildren<{
  currentPath: string;
}>;

export function SiteShell({ currentPath, children }: SiteShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden font-body text-text">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/75 backdrop-blur-2xl">
        <div className="shell flex items-center justify-between gap-4 py-4">
          <Link className="font-headline text-3xl font-bold tracking-[-0.06em] text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.32)]" href="/">
            Lunio
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                className={cn("top-link", currentPath === item.href && "top-link-active")}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-muted">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,255,0.9)]" />
              Control plane live
            </div>
            <Link className="secondary-button px-4 py-2 text-sm" href="/dashboard">
              Open Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-white/10 bg-black/30">
        <div className="shell grid gap-10 py-12 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="font-headline text-3xl font-bold tracking-[-0.06em] text-primary">Lunio</div>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted">
              A proper Discord music bot website with a polished public presence, live status visibility, and a dashboard that talks to your server-side control plane.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-muted">
            <Link className="transition hover:text-white" href="/">
              Home
            </Link>
            <Link className="transition hover:text-white" href="/commands">
              Commands
            </Link>
            <Link className="transition hover:text-white" href="/status">
              Status
            </Link>
            <Link className="transition hover:text-white" href="/login">
              Login
            </Link>
            <Link className="transition hover:text-white" href="/servers">
              Servers
            </Link>
            <Link className="transition hover:text-white" href="/dashboard">
              Dashboard
            </Link>
            <Link className="transition hover:text-white" href="/privacy">
              Privacy
            </Link>
            <Link className="transition hover:text-white" href="/tos">
              Terms
            </Link>
          </div>
        </div>

        <div className="shell flex flex-col gap-2 border-t border-white/10 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>(c) 2026 Lunio.</span>
          <span>TOS and privacy stay visible on every page.</span>
        </div>
      </footer>

      <nav className="fixed bottom-4 left-1/2 z-40 flex w-[min(calc(100%-1rem),34rem)] -translate-x-1/2 rounded-full border border-white/10 bg-black/60 p-2 backdrop-blur-xl md:hidden">
        {navigation.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-muted transition",
              currentPath === item.href && "bg-primary/10 text-primary",
            )}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
