'use client';

import { useEffect, useRef, useState } from 'react';
import { LandingShader } from '@/components/landing-shader';
import { SiteShell } from '@/components/site-shell';

const MAIN_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=945030475779551415&scope=bot+applications.commands&permissions=8';
const SECONDARY_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=945474723846950944&scope=bot+applications.commands&permissions=8';

const heroStats = [
	{ label: 'Servers', value: '3K+', detail: 'connected across the live network' },
	{ label: 'Latency', value: '14ms', detail: 'target for realtime playback updates' },
	{ label: 'Bots', value: '2', detail: 'production instances in one dashboard' },
];

const featureCards = [
	{
		eyebrow: 'Live room',
		title: 'Playback that feels immediate',
		copy: 'Control queue, repeat, volume, autoplay, filters, and player state from a dashboard surface that mirrors the bot.',
	},
	{
		eyebrow: 'Setup',
		title: 'Server tools without the maze',
		copy: 'Pick a server, configure request channels, tune defaults, and hand off permissions without leaving the workspace.',
	},
	{
		eyebrow: 'Premium',
		title: 'Studio controls stay close',
		copy: 'Bassboost, speed, nightcore, vaporwave, 24/7 mode, and premium checks are surfaced where admins already work.',
	},
];

const timelineItems = [
	['01', 'Authorize with Discord'],
	['02', 'Choose a shared server'],
	['03', 'Open the live control room'],
	['04', 'Tune playback and settings'],
];

function Equalizer() {
	return (
		<div aria-hidden="true" className="landing-eq">
			{Array.from({ length: 18 }).map((_, index) => (
				<span key={index} style={{ animationDelay: `${index * -80}ms` }} />
			))}
		</div>
	);
}

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
			<div className="landing-stage">
				<LandingShader />
				<div className="landing-noise" />
				<nav aria-label="Landing sections" className="landing-section-rail">
					<a href="#overview">01</a>
					<a href="#experience">02</a>
					<a href="#flow">03</a>
				</nav>

				<section className="landing-section landing-hero" id="overview">
					<div className="shell grid min-h-[calc(100svh-5rem)] gap-10 py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(24rem,1.08fr)] lg:items-center lg:py-14">
						<div className="relative z-10 max-w-3xl">
							<div className="landing-kicker">
								<span className="landing-kicker-dot" />
								Realtime Discord music control
							</div>

							<h1 className="mt-7 max-w-4xl font-headline text-5xl font-bold leading-[0.94] tracking-[-0.055em] text-white sm:text-7xl lg:text-[5.7rem]">
								Lunio feels like a control room, not a command list.
							</h1>

							<p className="mt-7 max-w-2xl text-base leading-8 text-white/64 sm:text-lg">
								A polished dashboard for music playback, server setup, premium controls, and live state. Fast enough for admins, clear enough for everyone else.
							</p>

							<div className="mt-9 flex flex-wrap items-center gap-3">
								<div className="relative" ref={inviteMenuRef}>
									<button
										aria-expanded={isInviteMenuOpen}
										aria-haspopup="menu"
										className="landing-primary-action"
										onClick={() => setIsInviteMenuOpen((current) => !current)}
										type="button"
									>
										Invite Lunio
										<span aria-hidden="true" className={isInviteMenuOpen ? 'rotate-180 transition' : 'transition'}>
											v
										</span>
									</button>

									{isInviteMenuOpen ? (
										<div className="landing-invite-menu" role="menu">
											<a href={MAIN_INVITE_URL} rel="noreferrer" role="menuitem" target="_blank">
												<strong>Invite Lunio</strong>
												<span>Main production bot for most servers.</span>
											</a>
											<a href={SECONDARY_INVITE_URL} rel="noreferrer" role="menuitem" target="_blank">
												<strong>Invite Lunio 2</strong>
												<span>Secondary instance when you want the alternate bot.</span>
											</a>
										</div>
									) : null}
								</div>

								<a className="landing-secondary-action" href="/servers">
									Open Dashboard
								</a>
							</div>

							<div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
								{heroStats.map((stat) => (
									<div className="landing-stat" key={stat.label}>
										<div>{stat.label}</div>
										<strong>{stat.value}</strong>
										<span>{stat.detail}</span>
									</div>
								))}
							</div>
						</div>

						<div className="landing-app-wrap" aria-label="Animated preview of the Lunio dashboard">
							<div className="landing-app-window">
								<div className="landing-app-topbar">
									<div className="flex items-center gap-2">
										<span />
										<span />
										<span />
									</div>
									<div className="landing-app-address">dashboard.luniobot.com/servers</div>
								</div>

								<div className="landing-app-grid">
									<aside className="landing-app-sidebar">
										<div className="flex items-center gap-3">
											<img alt="Lunio" className="h-9 w-9 rounded-full object-cover" src="/lunio-logo.png" />
											<div>
												<div className="text-sm font-bold text-white">Lunio</div>
												<div className="text-xs text-white/46">Live workspace</div>
											</div>
										</div>
										<div className="mt-8 grid gap-2">
											{['Player', 'Servers', 'Settings', 'Premium'].map((item, index) => (
												<div className={index === 0 ? 'landing-nav-row landing-nav-row-active' : 'landing-nav-row'} key={item}>
													<span />
													{item}
												</div>
											))}
										</div>
									</aside>

									<div className="landing-player-surface">
										<div className="landing-player-header">
											<div>
												<div className="landing-micro-label">Now playing</div>
												<h2>Neon Skyline Radio</h2>
											</div>
											<div className="landing-live-pill">Live</div>
										</div>

										<div className="landing-track-art">
											<Equalizer />
										</div>

										<div className="landing-progress">
											<span />
										</div>

										<div className="landing-controls" aria-hidden="true">
											<span>II</span>
											<span>+</span>
											<span>Next</span>
											<span>74%</span>
										</div>
									</div>

									<div className="landing-queue-surface">
										<div className="landing-micro-label">Queue</div>
										{['Signal Bloom', 'Afterhours Relay', 'Glass Arcade'].map((track, index) => (
											<div className="landing-queue-row" key={track}>
												<span>{String(index + 1).padStart(2, '0')}</span>
												<strong>{track}</strong>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className="landing-section" id="experience">
					<div className="shell grid min-h-[82svh] gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-20">
						<div>
							<div className="landing-kicker">Why it feels different</div>
							<h2 className="mt-5 max-w-2xl font-headline text-5xl font-bold leading-[0.96] tracking-[-0.05em] text-white sm:text-6xl">
								More motion where the user needs confidence.
							</h2>
							<p className="mt-6 max-w-xl text-base leading-8 text-white/58">
								The landing page now borrows the product language: live meters, glass surfaces, compact controls, focused transitions, and a shader backdrop that reacts
								to pointer movement.
							</p>
						</div>

						<div className="grid gap-4 md:grid-cols-3">
							{featureCards.map((card, index) => (
								<article className="landing-feature" key={card.title} style={{ animationDelay: `${index * 120}ms` }}>
									<div className="landing-micro-label">{card.eyebrow}</div>
									<h3>{card.title}</h3>
									<p>{card.copy}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				<section className="landing-section" id="flow">
					<div className="shell grid min-h-[76svh] gap-10 py-16 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:py-20">
						<div className="landing-flow-board">
							{timelineItems.map(([number, label]) => (
								<div className="landing-flow-row" key={label}>
									<span>{number}</span>
									<strong>{label}</strong>
									<i />
								</div>
							))}
						</div>

						<div>
							<div className="landing-kicker">From invite to playback</div>
							<h2 className="mt-5 font-headline text-5xl font-bold leading-[0.98] tracking-[-0.05em] text-white sm:text-6xl">A website that behaves like an app.</h2>
							<p className="mt-6 text-base leading-8 text-white/58">
								Full-height sections reduce the scroll-page feeling while keeping the content crawlable and accessible. The rail gives orientation, the shader gives
								depth, and the product preview makes the dashboard the first signal.
							</p>
							<div className="mt-9 flex flex-wrap gap-3">
								<a className="landing-primary-action" href="/servers">
									Try the Dashboard
								</a>
								<a className="landing-secondary-action" href="https://discord.gg/rrqEFukVUZ" rel="noreferrer" target="_blank">
									Join Support
								</a>
							</div>
						</div>
					</div>
				</section>
			</div>
		</SiteShell>
	);
}
