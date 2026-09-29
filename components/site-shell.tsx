'use client';

import Link from 'next/link';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';
import { HeaderAccount } from '@/components/header-account';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSiteLanguage } from '@/components/site-language-provider';
import { LUNIO_LOGO_SRC } from '@/lib/brand';

type NavigationItem = {
	href: string;
	label: string;
	activePaths?: string[];
};

const SUPPORT_SERVER_URL = 'https://discord.gg/rrqEFukVUZ';

function DiscordIcon({ className = 'h-5 w-5' }: { className?: string }) {
	return (
		<svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
			<path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.68 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.8 13.8 0 0 0 1.226-1.994.076.076 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.794 8.18 1.794 12.061 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.291a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.04.106c.36.698.774 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.673-3.549-13.66a.062.062 0 0 0-.031-.028ZM8.02 15.332c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.955 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.947 2.419-2.157 2.419Z" />
		</svg>
	);
}

function MenuIcon({ open }: { open: boolean }) {
	return (
		<svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={1.8} viewBox="0 0 24 24">
			{open ? (
				<>
					<path d="M6 6l12 12" />
					<path d="M18 6 6 18" />
				</>
			) : (
				<>
					<path d="M4.5 7h15" />
					<path d="M4.5 12h15" />
					<path d="M4.5 17h15" />
				</>
			)}
		</svg>
	);
}

type SiteShellProps = PropsWithChildren<{
	currentPath: string;
	/** Kept for compatibility with existing pages; the landing page no longer needs special chrome. */
	home?: boolean;
}>;

export function SiteShell({ currentPath, children }: SiteShellProps) {
	const { messages } = useSiteLanguage();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const navigation = [
		{ href: '/', label: messages.nav.home },
		{ href: '/commands', label: messages.nav.commands },
		{ href: '/status', label: messages.nav.status },
		{ href: '/servers', label: messages.nav.dashboard, activePaths: ['/servers', '/dashboard'] },
	] satisfies NavigationItem[];
	const normalizedCurrentPath = currentPath || '/';
	const isActive = (item: NavigationItem) => item.activePaths?.includes(normalizedCurrentPath) || normalizedCurrentPath === item.href;

	useEffect(() => {
		if (!isMenuOpen) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setIsMenuOpen(false);
		};
		const onResize = () => {
			if (window.innerWidth >= 768) setIsMenuOpen(false);
		};
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('resize', onResize);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('resize', onResize);
		};
	}, [isMenuOpen]);

	return (
		<div className="site-app relative flex min-h-screen flex-col font-body text-text">
			<header className="site-header sticky top-0 z-40">
				<div className="shell flex h-16 items-center gap-6">
					<Link className="flex shrink-0 items-center gap-2.5 rounded-lg" href="/" prefetch={false}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img alt="" className="h-8 w-8 rounded-full object-cover" height={32} src={LUNIO_LOGO_SRC} width={32} />
						<span className="font-headline text-xl font-bold tracking-tight" translate="no">
							Lunio
						</span>
					</Link>

					<nav aria-label={messages.nav.primary} className="hidden items-center gap-1 md:flex">
						{navigation.map((item) => (
							<Link
								aria-current={isActive(item) ? 'page' : undefined}
								className={cn('site-nav-link', isActive(item) && 'site-nav-link-active')}
								href={item.href}
								key={item.href}
								prefetch={false}
							>
								{item.label}
							</Link>
						))}
					</nav>

					<div className="ml-auto flex items-center gap-2">
						<div className="hidden items-center gap-2 sm:flex">
							<ThemeToggle />
							<HeaderAccount />
						</div>
						<button
							aria-controls="site-mobile-menu"
							aria-expanded={isMenuOpen}
							aria-label={isMenuOpen ? messages.nav.closeMenu : messages.nav.openMenu}
							className="dash-btn dash-btn-icon md:hidden"
							onClick={() => setIsMenuOpen((current) => !current)}
							type="button"
						>
							<MenuIcon open={isMenuOpen} />
						</button>
					</div>
				</div>

				{isMenuOpen ? (
					<div className="site-mobile-menu md:hidden" id="site-mobile-menu">
						<nav aria-label={messages.nav.primary} className="shell grid gap-1 py-3">
							{navigation.map((item) => (
								<Link
									aria-current={isActive(item) ? 'page' : undefined}
									className={cn('site-nav-link h-11 text-base', isActive(item) && 'site-nav-link-active')}
									href={item.href}
									key={item.href}
									onClick={() => setIsMenuOpen(false)}
									prefetch={false}
								>
									{item.label}
								</Link>
							))}
						</nav>
						<div className="shell dash-divider flex items-center gap-2 border-t py-3 sm:hidden">
							<ThemeToggle />
							<HeaderAccount />
						</div>
					</div>
				) : null}
			</header>

			<main className="flex-1" id="main-content" tabIndex={-1}>
				{children}
			</main>

			<footer className="dash-divider mt-24 border-t">
				<div className="shell grid gap-10 py-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
					<div>
						<Link className="inline-flex items-center gap-2.5 rounded-lg" href="/" prefetch={false}>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img alt="" className="h-8 w-8 rounded-full object-cover" height={32} src={LUNIO_LOGO_SRC} width={32} />
							<span className="font-headline text-xl font-bold tracking-tight" translate="no">
								Lunio
							</span>
						</Link>
						<p className="mt-4 max-w-sm text-sm leading-6 text-muted">{messages.footer.summary}</p>
					</div>

					{[
						{
							title: messages.footer.navigation,
							links: navigation.map((item) => ({ href: item.href, label: item.label })),
						},
						{
							title: messages.footer.product,
							links: [
								{ href: '/servers', label: messages.footer.inviteBot },
								{ href: '/commands', label: messages.footer.exploreFeatures },
							],
						},
						{
							title: messages.footer.legal,
							links: [
								{ href: '/tos', label: messages.footer.tos },
								{ href: '/privacy', label: messages.footer.privacy },
								{ href: '/withdrawal', label: messages.footer.withdrawal },
							],
						},
					].map((column) => (
						<div key={column.title}>
							<h2 className="text-sm font-semibold">{column.title}</h2>
							<ul className="mt-3 grid gap-2">
								{column.links.map((link) => (
									<li key={link.href + link.label}>
										<Link className="text-sm text-muted transition-colors duration-150 hover:text-text" href={link.href} prefetch={false}>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<div className="shell dash-divider flex flex-col items-center justify-between gap-4 border-t py-6 text-sm text-muted sm:flex-row">
					<span>{messages.footer.copyright}</span>
					<a
						aria-label="Join the Lunio support server (opens in a new tab)"
						className="dash-btn dash-btn-icon border-transparent bg-transparent text-muted hover:text-text"
						href={SUPPORT_SERVER_URL}
						rel="noreferrer"
						target="_blank"
					>
						<DiscordIcon />
					</a>
				</div>
			</footer>
		</div>
	);
}
