'use client';

import { useEffect, useRef, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const DASHBOARD_SITE_URL = process.env.NEXT_PUBLIC_DASHBOARD_BASE_URL?.replace(/\/$/, '') || 'https://dashboard.luniobot.com';
const MAIN_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=945030475779551415&scope=bot+applications.commands&permissions=8';
const SECONDARY_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=945474723846950944&scope=bot+applications.commands&permissions=8';

const heroStats = [
	{
		label: 'Live reach',
		value: '3K+',
		copy: 'Guilds already running Lunio across the live music network.',
		tone: 'text-primary',
	},
	{
		label: 'Realtime latency',
		value: '14ms',
		copy: 'Average response target across the current live playback stack.',
		tone: 'text-white',
	},
	{
		label: 'Dual production bots',
		value: '2',
		copy: 'Lunio and Lunio 2 sharing one connected dashboard ecosystem.',
		tone: 'text-secondary',
	},
];

const featureCards = [
	{
		eyebrow: 'Live player',
		title: 'Realtime control room',
		copy: 'Transport controls, queue management, repeat, volume, autoplay, and premium tuning all mirror the live bot session.',
	},
	{
		eyebrow: 'Custom channels',
		title: 'Dedicated request surfaces',
		copy: 'Give every server its own music panel with modern embed modes, clean queue entry, and proper setup handling.',
	},
	{
		eyebrow: 'Web dashboard',
		title: 'Server settings without the clutter',
		copy: 'Guild settings, account preferences, server picker, and future playlists all live in one focused workspace.',
	},
	{
		eyebrow: 'Premium',
		title: 'Studio controls when you need them',
		copy: 'Nightcore, vaporwave, bassboost, speed control, autoplay, 24/7 mode, and the premium workflow are already built into the platform.',
	},
];

export default function HomePage() {
	const [isInviteMenuOpen, setIsInviteMenuOpen] = useState(false);
	const inviteMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isInviteMenuOpen) return;

		const handlePointerDown = (event: MouseEvent) => {
			if (!inviteMenuRef.current?.contains(event.target as Node)) {
				setIsInviteMenuOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsInviteMenuOpen(false);
			}
		};

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isInviteMenuOpen]);

	return (
		<SiteShell currentPath="/" home>
			<section className="relative overflow-hidden border-b border-white/6">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.12),transparent_22%),radial-gradient(circle_at_72%_18%,rgba(255,91,189,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
				<div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:26px_26px]" />

				<div className="shell relative z-10 py-16 sm:py-20 lg:py-24">
					<div className="mx-auto max-w-5xl text-center">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-[0_0_40px_rgba(0,255,255,0.16)]">
							<svg
								aria-hidden="true"
								className="h-7 w-7"
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="1.8"
								viewBox="0 0 24 24"
							>
								<path d="M8 8v8" />
								<path d="M12 5v14" />
								<path d="M16 8v8" />
								<path d="M5 12h2" />
								<path d="M17 12h2" />
							</svg>
						</div>

						<h1 className="mx-auto mt-10 max-w-4xl font-headline text-6xl font-bold leading-[0.92] tracking-[-0.08em] text-white sm:text-7xl lg:text-[5.9rem]">
							Control the
							<span className="block bg-gradient-to-r from-primary via-cyan-100 to-white bg-clip-text text-transparent">Future of Discord Music.</span>
						</h1>

						<p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-white/58 sm:text-xl">
							Lunio brings the player, dashboard, custom channel setup, premium controls, and server management into one focused control room without the usual
							clutter.
						</p>

						<div className="mt-10 flex flex-wrap items-center justify-center gap-4">
							<div className="relative" ref={inviteMenuRef}>
								<button
									aria-expanded={isInviteMenuOpen}
									aria-haspopup="menu"
									className="primary-button min-w-[12rem] gap-3"
									onClick={() => setIsInviteMenuOpen((current) => !current)}
									type="button"
								>
									Invite
									<svg
										aria-hidden="true"
										className={`h-4 w-4 transition ${isInviteMenuOpen ? 'rotate-180' : ''}`}
										fill="none"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										viewBox="0 0 24 24"
									>
										<path d="m6 9 6 6 6-6" />
									</svg>
								</button>

								{isInviteMenuOpen ? (
									<div className="absolute left-1/2 top-[calc(100%+0.85rem)] z-30 w-[min(92vw,22rem)] -translate-x-1/2 rounded-[1.4rem] border border-white/10 bg-[rgba(12,13,16,0.96)] p-3 text-left shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
										<a
											className="block rounded-[1.1rem] border border-primary/15 bg-primary/10 px-4 py-4 transition hover:border-primary/25 hover:bg-primary/14"
											href={MAIN_INVITE_URL}
											rel="noreferrer"
											target="_blank"
										>
											<div className="text-sm font-bold text-white">Invite Lunio</div>
											<div className="mt-1 text-sm leading-6 text-white/52">Main production bot for most servers.</div>
										</a>
										<a
											className="mt-3 block rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-secondary/25 hover:bg-white/[0.05]"
											href={SECONDARY_INVITE_URL}
											rel="noreferrer"
											target="_blank"
										>
											<div className="text-sm font-bold text-white">Invite Lunio 2</div>
											<div className="mt-1 text-sm leading-6 text-white/52">Secondary instance when you want the alternate bot.</div>
										</a>
									</div>
								) : null}
							</div>
							<a className="ghost-button min-w-[12rem]" href={`${DASHBOARD_SITE_URL}/servers`}>
								Open Dashboard
							</a>
						</div>

						<div className="mt-14 text-[11px] font-extrabold uppercase tracking-[0.28em] text-white/28">Explore the platform</div>
						<div className="mt-3 text-white/28">
							<svg
								aria-hidden="true"
								className="mx-auto h-5 w-5"
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="1.8"
								viewBox="0 0 24 24"
							>
								<path d="m7 10 5 5 5-5" />
							</svg>
						</div>
					</div>

					<div className="mt-16 grid gap-4 lg:grid-cols-3">
						{heroStats.map((stat) => (
							<article className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.2)]" key={stat.label}>
								<div className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/35">{stat.label}</div>
								<div className={`mt-4 font-headline text-5xl font-bold tracking-[-0.08em] ${stat.tone}`}>{stat.value}</div>
								<p className="mt-4 max-w-xs text-sm leading-7 text-white/52">{stat.copy}</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section className="py-20 lg:py-24">
				<div className="shell">
					<div className="grid gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)] xl:items-start">
						<div className="max-w-xl">
							<div className="text-xs font-extrabold uppercase tracking-[0.24em] text-white/32">Why Lunio</div>
							<h2 className="mt-6 font-headline text-5xl font-bold tracking-[-0.07em] text-white sm:text-6xl">
								Precision for the
								<span className="block text-secondary">modern music server.</span>
							</h2>
							<p className="mt-6 text-base leading-8 text-white/55">
								Lunio is not trying to be every kind of Discord bot at once. The site, dashboard, music flow, and setup experience are all designed around one goal:
								making server music control feel polished, responsive, and easy to trust.
							</p>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							{featureCards.map((card, index) => (
								<article
									className={`rounded-[1.8rem] border border-white/8 p-6 shadow-[0_22px_60px_rgba(0,0,0,0.18)] ${
										index === 3
											? 'bg-[linear-gradient(180deg,rgba(35,9,26,0.92),rgba(19,15,24,0.9))]'
											: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))]'
									}`}
									key={card.title}
								>
									<div className={`text-xs font-extrabold uppercase tracking-[0.22em] ${index === 3 ? 'text-secondary' : 'text-primary'}`}>{card.eyebrow}</div>
									<h3 className="mt-5 font-headline text-3xl font-bold tracking-[-0.05em] text-white">{card.title}</h3>
									<p className="mt-4 text-sm leading-7 text-white/55">{card.copy}</p>
								</article>
							))}
						</div>
					</div>
				</div>
			</section>

			<section className="pb-20 lg:pb-24">
				<div className="shell">
					<div className="mx-auto max-w-5xl rounded-[2.25rem] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,91,189,0.06))] px-6 py-10 text-center shadow-[0_28px_90px_rgba(0,0,0,0.2)] sm:px-10 sm:py-14">
						<div className="text-xs font-extrabold uppercase tracking-[0.24em] text-white/32">Community</div>
						<h2 className="mt-6 font-headline text-5xl font-bold tracking-[-0.06em] text-white sm:text-6xl">
							Built with the
							<span className="text-secondary"> community.</span>
						</h2>
						<p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/58">
							Join the Lunio support server to get early access to improvements, follow dashboard updates, and help shape the next layer of the product.
						</p>
						<div className="mt-10 flex justify-center">
							<a className="ghost-button min-w-[15rem]" href="https://discord.gg/rrqEFukVUZ" rel="noreferrer" target="_blank">
								Join Official Support Server
							</a>
						</div>
					</div>
				</div>
			</section>
		</SiteShell>
	);
}
