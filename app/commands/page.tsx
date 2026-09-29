'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSiteLanguage } from '@/components/site-language-provider';
import { SiteShell } from '@/components/site-shell';

const commandGroups = [
	{
		title: 'Everyone',
		copy: 'Core music commands for the people actually using the bot day to day.',
		items: [
			['/play', 'Search a track or playlist and queue it immediately.'],
			['/join', 'Bring Lunio into your current voice channel.'],
			['/queue', 'Show the current queue with track order and duration.'],
			['/playlist', 'Create, save, load, delete, share, and reorder playlists.'],
			['/songinfo', 'Inspect the active track in more detail.'],
			['/lyrics', 'Fetch lyrics for the current song when available.'],
			['/voteskip', 'Start a community skip if DJ controls are not required.'],
			['/premium', 'See premium and voting-related feature access.'],
		],
	},
	{
		title: 'DJ',
		copy: 'The commands for active queue management once music is already running.',
		items: [
			['/pause', 'Pause the current track.'],
			['/resume', 'Resume playback.'],
			['/skip', 'Skip one or multiple songs.'],
			['/replay', 'Go back to the previous track.'],
			['/seek', 'Jump to a position in the current song.'],
			['/shuffle', 'Randomize the queue order.'],
			['/loop', 'Cycle repeat modes for track or queue.'],
			['/remove', 'Delete a specific queued track.'],
			['/move', 'Reorder queue entries.'],
			['/clear', 'Clear the queue.'],
			['/stop', 'Stop playback and reset the player.'],
			['/leave', 'Disconnect Lunio from voice.'],
		],
	},
	{
		title: 'Admin',
		copy: 'Server-level controls for panel setup, request flow, restrictions, and moderation.',
		items: [
			['/setup', 'Create or rebuild the music request panel.'],
			['/announce', 'Control now playing message behavior.'],
			['/ephemeral', 'Toggle ephemeral admin replies.'],
			['/language', 'Change guild language.'],
			['/limit', 'Set non-DJ song and duration limits.'],
			['/requester', 'Manage requester display behavior.'],
			['/player-controls', 'Toggle control embed behavior.'],
			['/playlists', 'Allow or restrict playlist usage in the guild.'],
			['/setdj', 'Manage DJ roles.'],
			['/setvc', 'Restrict allowed voice channels.'],
			['/voicestatus', 'Toggle voice status updates.'],
			['/cleanup', 'Remove Lunio setup/control leftovers.'],
			['/logs', 'Configure logging destinations.'],
			['/fix', 'Repair broken channel/setup states.'],
			['/ban', 'Block a user from using Lunio in the guild.'],
			['/unban', 'Remove a guild user ban.'],
		],
	},
	{
		title: 'Premium',
		copy: 'Higher-end playback features for servers and users with premium access.',
		items: [
			['/24/7', 'Keep Lunio connected to voice between sessions.'],
			['/autoplay', 'Let Lunio continue from recommendations.'],
			['/volume', 'Adjust live playback volume.'],
			['/bassboost', 'Apply bassboost levels.'],
			['/speed', 'Change playback speed.'],
			['/nightcore', 'Toggle the nightcore effect.'],
			['/vaporwave', 'Toggle vaporwave processing.'],
			['/demon', 'Toggle demon mode.'],
			['/filter', 'Manage premium filters from one command.'],
		],
	},
];

const dashboardGroups = [
	{
		title: 'Player dashboard',
		copy: 'The website mirrors the same broker-backed command path as Discord. You can switch bots, view live state, remove queued tracks, use previous, skip, pause, repeat, shuffle, and change volume directly from the player page.',
	},
	{
		title: 'Guild settings dashboard',
		copy: 'Managers can configure language, announcements, custom channel mode, embed mode, DJ roles, voice restrictions, default volume, 24/7, playlist access, requester behavior, and queue limits without leaving the browser.',
	},
	{
		title: 'Custom channel workflow',
		copy: 'The dashboard can create a fresh music panel channel or clear and reuse an existing one, then provision the request panel in either embed mode.',
	},
];

function slugify(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export default function CommandsPage() {
	const { messages } = useSiteLanguage();
	const [query, setQuery] = useState('');
	const [activeGroup, setActiveGroup] = useState('all');

	// Restore and persist the filter in the URL so a filtered view can be shared.
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setQuery(params.get('q') ?? '');
		const group = params.get('group');
		if (group && commandGroups.some((entry) => slugify(entry.title) === group)) setActiveGroup(group);
	}, []);

	useEffect(() => {
		const url = new URL(window.location.href);
		if (query.trim()) url.searchParams.set('q', query.trim());
		else url.searchParams.delete('q');
		if (activeGroup !== 'all') url.searchParams.set('group', activeGroup);
		else url.searchParams.delete('group');
		window.history.replaceState(null, '', url);
	}, [query, activeGroup]);

	const normalizedQuery = query.trim().toLowerCase().replace(/^\//, '');
	const visibleGroups = useMemo(
		() =>
			commandGroups
				.filter((group) => activeGroup === 'all' || slugify(group.title) === activeGroup)
				.map((group) => ({
					...group,
					items: normalizedQuery
						? group.items.filter(([name, copy]) => name.toLowerCase().includes(normalizedQuery) || copy.toLowerCase().includes(normalizedQuery))
						: group.items,
				}))
				.filter((group) => group.items.length > 0),
		[activeGroup, normalizedQuery]
	);
	const totalCommands = commandGroups.reduce((sum, group) => sum + group.items.length, 0);
	const visibleCount = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);

	return (
		<SiteShell currentPath="/commands">
			<section className="shell pb-8 pt-14 sm:pt-20">
				<p className="text-sm font-semibold text-primary">{messages.commands.eyebrow}</p>
				<h1 className="mt-3 max-w-3xl font-headline text-4xl font-bold tracking-tight sm:text-5xl">{messages.commands.title}</h1>
				<p className="mt-4 max-w-3xl text-base leading-7 text-muted">{messages.commands.intro}</p>
			</section>

			<section aria-label="Command list" className="shell">
				<div className="site-toolbar sticky top-16 z-20 -mx-4 flex flex-col gap-3 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:flex-row lg:items-center lg:px-8">
					<div className="relative lg:w-80">
						<svg
							aria-hidden="true"
							className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							viewBox="0 0 24 24"
						>
							<circle cx="11" cy="11" r="6.5" />
							<path d="m20 20-4.35-4.35" strokeLinecap="round" />
						</svg>
						<label className="sr-only" htmlFor="command-search">
							Search commands
						</label>
						<input
							autoComplete="off"
							className="dash-input pl-9"
							id="command-search"
							name="q"
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search commands, e.g. /play…"
							spellCheck={false}
							type="search"
							value={query}
						/>
					</div>
					<div aria-label="Command category" className="flex flex-wrap gap-1.5" role="group">
						{[
							{ title: 'All', slug: 'all', count: totalCommands },
							...commandGroups.map((group) => ({ title: group.title, slug: slugify(group.title), count: group.items.length })),
						].map((tab) => (
							<button aria-pressed={activeGroup === tab.slug} className="dash-btn h-8 px-3" key={tab.slug} onClick={() => setActiveGroup(tab.slug)} type="button">
								{tab.title}
								<span className="text-xs font-medium tabular-nums opacity-60">{tab.count}</span>
							</button>
						))}
					</div>
					<p aria-live="polite" className="text-sm text-muted lg:ml-auto">
						{visibleCount} {visibleCount === 1 ? 'command' : 'commands'}
					</p>
				</div>

				<div className="mt-6 grid gap-6">
					{visibleGroups.length ? (
						visibleGroups.map((group) => (
							<section aria-labelledby={`group-${slugify(group.title)}`} className="dash-card" key={group.title}>
								<div className="px-5 py-4 sm:px-6">
									<h2 className="text-base font-semibold" id={`group-${slugify(group.title)}`}>
										{group.title}
									</h2>
									<p className="mt-1 text-sm text-muted">{group.copy}</p>
								</div>
								<dl className="grid md:grid-cols-2">
									{group.items.map(([name, copy]) => (
										<div className="dash-divider flex flex-col gap-1 border-t px-5 py-3.5 sm:px-6 md:odd:border-r" key={name}>
											<dt>
												<code className="rounded-md bg-[var(--dash-active)] px-1.5 py-0.5 font-mono text-[13px] font-semibold text-primary" translate="no">
													{name}
												</code>
											</dt>
											<dd className="text-sm text-muted">{copy}</dd>
										</div>
									))}
								</dl>
							</section>
						))
					) : (
						<div className="dash-card px-6 py-12 text-center">
							<p className="text-sm font-medium">No commands match “{query.trim()}”.</p>
							<button
								className="dash-btn mt-4"
								onClick={() => {
									setQuery('');
									setActiveGroup('all');
								}}
								type="button"
							>
								Clear Filters
							</button>
						</div>
					)}
				</div>
			</section>

			<section aria-labelledby="dashboard-controls-heading" className="shell mt-16">
				<p className="text-sm font-semibold text-primary">{messages.commands.dashboardEyebrow}</p>
				<h2 className="mt-3 max-w-3xl font-headline text-2xl font-bold tracking-tight sm:text-3xl" id="dashboard-controls-heading">
					{messages.commands.dashboardTitle}
				</h2>
				<div className="mt-8 grid gap-4 lg:grid-cols-3">
					{dashboardGroups.map((group) => (
						<article className="dash-card p-6" key={group.title}>
							<h3 className="text-base font-semibold">{group.title}</h3>
							<p className="mt-2 text-sm leading-6 text-muted">{group.copy}</p>
						</article>
					))}
				</div>
			</section>

			<section className="shell mt-16">
				<div className="dash-card site-cta flex flex-col items-start justify-between gap-6 p-8 lg:flex-row lg:items-center">
					<div className="max-w-2xl">
						<p className="text-sm font-semibold text-primary">{messages.commands.getStartedEyebrow}</p>
						<h2 className="mt-2 font-headline text-2xl font-bold tracking-tight">{messages.commands.getStartedTitle}</h2>
						<p className="mt-3 text-sm leading-6 text-muted">{messages.commands.getStartedCopy}</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Link className="dash-btn dash-btn-primary h-10 px-4" href="/servers" prefetch={false}>
							{messages.home.openDashboard}
						</Link>
						<Link className="dash-btn h-10 px-4" href="/" prefetch={false}>
							{messages.commands.backToHomepage}
						</Link>
					</div>
				</div>
			</section>
		</SiteShell>
	);
}
