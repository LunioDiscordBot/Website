'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SiteShell } from '@/components/site-shell';
import { useSiteLanguage } from '@/components/site-language-provider';
import { apiJson, type StatsResponse } from '@/lib/api';
import { LUNIO_LOGO_SRC } from '@/lib/brand';

const MAIN_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=945030475779551415&scope=bot+applications.commands&permissions=8';
const SECONDARY_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=945474723846950944&scope=bot+applications.commands&permissions=8';
const SUPPORT_SERVER_URL = 'https://discord.gg/rrqEFukVUZ';

type FeatureIconName = 'control' | 'channel' | 'playlist' | 'dashboard' | 'sound' | 'bots';
const FEATURE_ICONS: FeatureIconName[] = ['control', 'channel', 'playlist', 'dashboard', 'sound', 'bots'];

function FeatureIcon({ name }: { name: FeatureIconName }) {
	const shared = {
		className: 'h-5 w-5',
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 1.8,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		'aria-hidden': true,
	};

	switch (name) {
		case 'control':
			return (
				<svg {...shared}>
					<circle cx="12" cy="12" r="8.25" />
					<path d="m10.25 8.75 4.75 3.25-4.75 3.25v-6.5Z" />
				</svg>
			);
		case 'channel':
			return (
				<svg {...shared}>
					<path d="M5 9h14" />
					<path d="M5 15h14" />
					<path d="M10 4 8 20" />
					<path d="M16 4l-2 16" />
				</svg>
			);
		case 'playlist':
			return (
				<svg {...shared}>
					<path d="M4.5 6.5h11" />
					<path d="M4.5 11h11" />
					<path d="M4.5 15.5h6" />
					<path d="M18 9.5v7.25" />
					<circle cx="16.25" cy="16.75" r="1.75" />
				</svg>
			);
		case 'dashboard':
			return (
				<svg {...shared}>
					<rect x="3.5" y="4.5" width="17" height="15" rx="2" />
					<path d="M9 4.5v15" />
					<path d="M12.5 9h5" />
					<path d="M12.5 13h3" />
				</svg>
			);
		case 'sound':
			return (
				<svg {...shared}>
					<path d="M5 10v4" />
					<path d="M9 7v10" />
					<path d="M13 4.5v15" />
					<path d="M17 8v8" />
					<path d="M21 11v2" />
				</svg>
			);
		case 'bots':
			return (
				<svg {...shared}>
					<rect x="4" y="8" width="11" height="10" rx="2.5" />
					<path d="M9 8V5.5" />
					<path d="M8 13h.01" />
					<path d="M11 13h.01" />
					<path d="M18 11h1.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H18" />
				</svg>
			);
	}
}

function formatStat(value: number, locale: string) {
	return new Intl.NumberFormat(locale, { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

/** Static, decorative preview of the Overview page. Hidden from assistive tech via role="img". */
function DashboardPreview({ label }: { label: string }) {
	const queue = [
		['Afterglow', 'Signal Bloom', '4:05'],
		['Glass City', 'Northbound', '3:18'],
		['Night Swim', 'Low Tide', '3:51'],
	];

	return (
		<div aria-label={label} className="site-preview dash-card overflow-hidden" role="img">
			<div className="grid md:grid-cols-[13rem_minmax(0,1fr)]">
				<div className="dash-sidebar hidden flex-col gap-1 p-3 md:flex">
					<div className="flex items-center gap-2 px-2 py-2">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img alt="" className="h-6 w-6 rounded-full" height={24} src={LUNIO_LOGO_SRC} width={24} />
						<span className="text-sm font-bold">Lunio</span>
					</div>
					<div className="dash-inset mb-3 mt-1 flex items-center gap-2 px-2 py-1.5">
						<span className="h-6 w-6 rounded-md bg-secondary/30" />
						<span className="text-xs font-semibold">Night Owls</span>
					</div>
					{['Overview', 'Playlists', 'Server Settings', 'Premium'].map((item, index) => (
						<span className={`dash-nav-item h-8 text-xs ${index === 0 ? 'site-preview-active' : ''}`} key={item}>
							<span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted/50'}`} />
							{item}
						</span>
					))}
				</div>

				<div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_14rem]">
					<div className="grid gap-4">
						<div className="dash-inset p-4">
							<div className="flex gap-4">
								<div className="site-preview-art h-20 w-20 shrink-0 rounded-lg sm:h-24 sm:w-24" />
								<div className="min-w-0 flex-1">
									<span className="dash-badge">
										<span className="h-1.5 w-1.5 rounded-full bg-success" />
										Playing
									</span>
									<div className="mt-2 truncate text-lg font-semibold">Midnight Drive</div>
									<div className="truncate text-sm text-muted">Neon Arcade</div>
									<div className="mt-4 h-1.5 rounded-full bg-[var(--dash-track)]">
										<div className="h-full w-[42%] rounded-full bg-primary" />
									</div>
									<div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted">
										<span>1:34</span>
										<span>3:42</span>
									</div>
								</div>
							</div>
							<div className="dash-divider mt-4 flex items-center justify-center gap-3 border-t pt-4">
								<span className="h-7 w-7 rounded-md bg-[var(--dash-active)]" />
								<span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
									<span className="flex gap-[3px]">
										<span className="h-3 w-[3px] rounded-sm bg-[rgb(var(--dash-on-primary))]" />
										<span className="h-3 w-[3px] rounded-sm bg-[rgb(var(--dash-on-primary))]" />
									</span>
								</span>
								<span className="h-7 w-7 rounded-md bg-[var(--dash-active)]" />
							</div>
						</div>
						<div className="dash-inset">
							<div className="px-4 py-2.5 text-xs font-semibold">Up Next</div>
							{queue.map(([title, artist, duration], index) => (
								<div className="dash-divider flex items-center gap-3 border-t px-4 py-2" key={title}>
									<span className="w-3 text-[11px] tabular-nums text-muted">{index + 1}</span>
									<span className="h-7 w-7 rounded bg-[var(--dash-active)]" />
									<span className="min-w-0 flex-1">
										<span className="block truncate text-xs font-medium">{title}</span>
										<span className="block truncate text-[11px] text-muted">{artist}</span>
									</span>
									<span className="text-[11px] tabular-nums text-muted">{duration}</span>
								</div>
							))}
						</div>
					</div>
					<div className="dash-inset hidden p-4 lg:block">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold">Sound</span>
							<span className="dash-badge dash-badge-secondary h-5 text-[10px]">Premium</span>
						</div>
						{[
							['Bass Boost', '62%'],
							['Speed', '50%'],
						].map(([name, width]) => (
							<div className="mt-4" key={name}>
								<div className="text-[11px] font-medium">{name}</div>
								<div className="mt-2 h-1.5 rounded-full bg-[var(--dash-track)]">
									<div className="h-full rounded-full bg-primary" style={{ width }} />
								</div>
							</div>
						))}
						<div className="mt-4 grid grid-cols-2 gap-1.5">
							{['Nightcore', 'Vaporwave'].map((filter, index) => (
								<span
									className={`rounded-md border px-2 py-1.5 text-center text-[10px] font-semibold ${
										index === 0 ? 'border-primary/40 bg-primary/10 text-primary' : 'border-[var(--dash-border)]'
									}`}
									key={filter}
								>
									{filter}
								</span>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function HomePage() {
	const { language, messages } = useSiteLanguage();
	const home = messages.home;
	const [isInviteMenuOpen, setIsInviteMenuOpen] = useState(false);
	const [stats, setStats] = useState<StatsResponse | null>(null);
	const [statsState, setStatsState] = useState<'loading' | 'ready' | 'error'>('loading');
	const inviteMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		let active = true;
		void apiJson<StatsResponse>('/api/stats')
			.then((response) => {
				if (!active) return;
				setStats(response);
				setStatsState('ready');
			})
			.catch(() => {
				if (active) setStatsState('error');
			});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!isInviteMenuOpen) return;

		const handlePointerDown = (event: MouseEvent) => {
			if (!inviteMenuRef.current?.contains(event.target as Node)) setIsInviteMenuOpen(false);
		};
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setIsInviteMenuOpen(false);
		};

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isInviteMenuOpen]);

	const statItems = stats
		? [
				{ label: home.statServers, value: stats.totalGuilds },
				{ label: home.statUsers, value: stats.totalUsers },
				{ label: home.statPlayers, value: stats.totalPlayers },
			]
		: [];
	const features = [...home.featureCards, ...home.moreFeatures];

	return (
		<SiteShell currentPath="/">
			<section className="site-hero relative overflow-hidden">
				<div className="shell relative pb-16 pt-16 text-center sm:pt-24">
					<p className="dash-badge mx-auto h-7 px-3 text-xs">{home.eyebrow}</p>
					<h1 className="mx-auto mt-6 max-w-4xl font-headline text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
						{home.heroLead} <span className="text-primary">{home.heroHighlight}</span> {home.heroTail}
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">{home.heroCopy}</p>

					<div className="mt-9 flex flex-wrap items-center justify-center gap-3">
						<div className="relative" ref={inviteMenuRef}>
							<button
								aria-controls="invite-menu"
								aria-expanded={isInviteMenuOpen}
								aria-haspopup="menu"
								className="dash-btn dash-btn-primary h-11 px-5 text-[0.9375rem]"
								onClick={() => setIsInviteMenuOpen((current) => !current)}
								type="button"
							>
								{home.inviteLunio}
								<svg
									aria-hidden="true"
									className={`h-4 w-4 transition-transform duration-150 ${isInviteMenuOpen ? 'rotate-180' : ''}`}
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									viewBox="0 0 24 24"
								>
									<path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</button>

							{isInviteMenuOpen ? (
								<div className="account-menu absolute left-1/2 top-[calc(100%+0.5rem)] z-30 w-72 -translate-x-1/2 p-1.5 text-left" id="invite-menu" role="menu">
									{[
										{ href: MAIN_INVITE_URL, title: 'Lunio', copy: home.inviteMainCopy },
										{ href: SECONDARY_INVITE_URL, title: 'Lunio 2', copy: home.inviteSecondaryCopy },
									].map((bot) => (
										<a
											className="account-menu-action grid h-auto gap-0.5 py-2.5"
											href={bot.href}
											key={bot.title}
											rel="noreferrer"
											role="menuitem"
											target="_blank"
										>
											<span className="font-semibold" translate="no">
												{bot.title}
											</span>
											<span className="text-xs font-normal text-muted">{bot.copy}</span>
										</a>
									))}
								</div>
							) : null}
						</div>

						<Link className="dash-btn h-11 px-5 text-[0.9375rem]" href="/servers" prefetch={false}>
							{home.openDashboard}
						</Link>
					</div>

					<div aria-busy={statsState === 'loading'} className="mx-auto mt-12 min-h-[4.5rem] max-w-2xl">
						{statsState === 'loading' ? (
							<div aria-hidden="true" className="grid grid-cols-3 gap-6">
								{[0, 1, 2].map((index) => (
									<div className="grid justify-items-center gap-2" key={index}>
										<div className="skeleton h-8 w-20" />
										<div className="skeleton h-3.5 w-24" />
									</div>
								))}
							</div>
						) : statItems.length ? (
							<dl className="grid grid-cols-3 gap-6">
								{statItems.map((item) => (
									<div className="grid" key={item.label}>
										<dt className="order-2 mt-1 text-sm text-muted">{item.label}</dt>
										<dd className="order-1 font-headline text-2xl font-bold tabular-nums sm:text-3xl">{formatStat(item.value, language)}</dd>
									</div>
								))}
							</dl>
						) : null}
					</div>

					<div className="mx-auto mt-14 max-w-5xl text-left">
						<DashboardPreview label={home.previewLabel} />
					</div>
				</div>
			</section>

			<section aria-labelledby="features-heading" className="shell py-20">
				<div className="max-w-2xl">
					<p className="text-sm font-semibold text-primary">{home.whatCovers}</p>
					<h2 className="mt-3 font-headline text-3xl font-bold tracking-tight sm:text-4xl" id="features-heading">
						{home.coversHeading}
					</h2>
					<p className="mt-4 text-base leading-7 text-muted">{home.coversCopy}</p>
				</div>

				<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{features.map((feature, index) => (
						<article className="dash-card p-6" key={feature.title}>
							<span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<FeatureIcon name={FEATURE_ICONS[index] ?? 'control'} />
							</span>
							<h3 className="mt-5 text-base font-semibold">{feature.title}</h3>
							<p className="mt-2 text-sm leading-6 text-muted">{feature.copy}</p>
						</article>
					))}
				</div>
			</section>

			<section aria-labelledby="steps-heading" className="shell py-20">
				<div className="max-w-2xl">
					<p className="text-sm font-semibold text-primary">{home.stepsEyebrow}</p>
					<h2 className="mt-3 font-headline text-3xl font-bold tracking-tight sm:text-4xl" id="steps-heading">
						{home.stepsHeading}
					</h2>
				</div>
				<ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{home.steps.map((step, index) => (
						<li className="dash-card p-6" key={step.title}>
							<span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--dash-border-strong)] text-sm font-semibold tabular-nums">
								{index + 1}
							</span>
							<h3 className="mt-5 text-base font-semibold">{step.title}</h3>
							<p className="mt-2 text-sm leading-6 text-muted">{step.copy}</p>
						</li>
					))}
				</ol>
			</section>

			<section className="shell pt-8">
				<div className="dash-card site-cta flex flex-col items-start justify-between gap-6 p-8 sm:p-10 lg:flex-row lg:items-center">
					<div className="max-w-xl">
						<h2 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">{home.ctaHeading}</h2>
						<p className="mt-3 text-base leading-7 text-muted">{home.ctaCopy}</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Link className="dash-btn dash-btn-primary h-11 px-5" href="/servers" prefetch={false}>
							{home.openDashboard}
						</Link>
						<a className="dash-btn h-11 px-5" href={SUPPORT_SERVER_URL} rel="noreferrer" target="_blank">
							{home.joinSupport}
						</a>
					</div>
				</div>
			</section>
		</SiteShell>
	);
}
