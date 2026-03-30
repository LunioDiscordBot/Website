"use client";

import Link from "next/link";
import { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";
import { HeaderAccount } from "@/components/header-account";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSiteLanguage } from "@/components/site-language-provider";

type NavigationItem = {
  href: string;
  label: string;
  activePaths?: string[];
};

const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://luniobot.com";
const DASHBOARD_SITE_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BASE_URL?.replace(/\/$/, "") ||
  "https://dashboard.luniobot.com";

function DiscordIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.68 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.8 13.8 0 0 0 1.226-1.994.076.076 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.794 8.18 1.794 12.061 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.291a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.04.106c.36.698.774 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.673-3.549-13.66a.062.062 0 0 0-.031-.028ZM8.02 15.332c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.955 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.947 2.419-2.157 2.419Z" />
    </svg>
  );
}

type SiteShellProps = PropsWithChildren<{
  currentPath: string;
  home?: boolean;
}>;

export function SiteShell({ currentPath, children, home = false }: SiteShellProps) {
  const { messages } = useSiteLanguage();
  const navigation = [
    { href: `${PUBLIC_SITE_URL}/`, label: messages.nav.home },
    { href: `${PUBLIC_SITE_URL}/commands`, label: messages.nav.commands },
    { href: `${PUBLIC_SITE_URL}/status`, label: messages.nav.status },
    {
      href: `${DASHBOARD_SITE_URL}/servers`,
      label: messages.nav.dashboard,
      activePaths: ["/servers", "/dashboard"],
    },
  ] satisfies NavigationItem[];

  return (
    <div className="relative min-h-screen overflow-hidden font-body text-text">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/75 backdrop-blur-2xl">
        <div className="shell flex items-center justify-between gap-4 py-4">
          <Link className="flex items-center gap-3" href={`${PUBLIC_SITE_URL}/`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Lunio"
              className="h-11 w-11 rounded-full object-cover"
              src="/lunio-logo.png"
            />
            <span className="font-headline text-3xl font-bold tracking-[-0.06em] text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.32)]">
              Lunio
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                className={cn(
                  "top-link",
                  (item.activePaths?.includes(currentPath) || currentPath === item.href) &&
                    "top-link-active",
                )}
                href={item.href}
                prefetch={false}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <ThemeToggle />
            <HeaderAccount />
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-white/10 bg-black/25">
        <div className="shell py-14">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1.05fr_1.2fr] lg:items-start">
            <div className="text-center lg:text-left">
              <Link className="inline-flex items-center gap-4" href={`${PUBLIC_SITE_URL}/`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Lunio"
                  className="h-14 w-14 rounded-full object-cover"
                  src="/lunio-logo.png"
                />
                <span className="font-headline text-4xl font-bold tracking-[-0.06em] text-white">
                  Lunio
                </span>
              </Link>

              <p className="mt-5 max-w-xl text-base leading-8 text-muted lg:max-w-md">
                {messages.footer.summary}
              </p>
            </div>

            <div className="grid gap-10 text-center sm:grid-cols-3 lg:text-left">
              <div>
                <div className="metric-label">{messages.footer.navigation}</div>
                <div className="mt-4 grid gap-2 text-sm text-muted">
                  <Link className="transition hover:text-white" href={`${PUBLIC_SITE_URL}/`} prefetch={false}>
                    {messages.nav.home}
                  </Link>
                  <Link className="transition hover:text-white" href={`${PUBLIC_SITE_URL}/commands`} prefetch={false}>
                    {messages.nav.commands}
                  </Link>
                  <Link className="transition hover:text-white" href={`${PUBLIC_SITE_URL}/status`} prefetch={false}>
                    {messages.nav.status}
                  </Link>
                  <Link className="transition hover:text-white" href={`${DASHBOARD_SITE_URL}/servers`} prefetch={false}>
                    {messages.nav.dashboard}
                  </Link>
                </div>
              </div>

              <div>
                <div className="metric-label">{messages.footer.product}</div>
                <div className="mt-4 grid gap-2 text-sm text-muted">
                  <Link className="transition hover:text-white" href={`${DASHBOARD_SITE_URL}/servers`} prefetch={false}>
                    {messages.footer.inviteBot}
                  </Link>
                  <Link className="transition hover:text-white" href={`${PUBLIC_SITE_URL}/commands`} prefetch={false}>
                    {messages.footer.exploreFeatures}
                  </Link>
                </div>
              </div>

              <div>
                <div className="metric-label">{messages.footer.legal}</div>
                <div className="mt-4 grid gap-2 text-sm text-muted">
                  <Link className="transition hover:text-white" href={`${PUBLIC_SITE_URL}/tos`} prefetch={false}>
                    {messages.footer.tos}
                  </Link>
                  <Link className="transition hover:text-white" href={`${PUBLIC_SITE_URL}/privacy`} prefetch={false}>
                    {messages.footer.privacy}
                  </Link>
                  <Link className="transition hover:text-white" href={`${PUBLIC_SITE_URL}/withdrawal`} prefetch={false}>
                    {messages.footer.withdrawal}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-5xl border-t border-white/10 pt-5 text-sm text-muted">
            <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <span>{messages.footer.copyright}</span>
              <a
                aria-label="Join the Lunio support server"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] p-2 text-secondary transition hover:border-secondary/30 hover:bg-secondary/10 hover:text-white"
                href="https://discord.gg/rrqEFukVUZ"
                rel="noreferrer"
                target="_blank"
              >
                <DiscordIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      <nav className="fixed bottom-4 left-1/2 z-40 flex w-[min(calc(100%-1rem),34rem)] -translate-x-1/2 rounded-full border border-white/10 bg-black/60 p-2 backdrop-blur-xl md:hidden">
        {navigation.map((item) => (
          <Link
            key={item.href}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-muted transition",
              (item.activePaths?.includes(currentPath) || currentPath === item.href) &&
                "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(112,0,255,0.14)]",
            )}
            href={item.href}
            prefetch={false}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
