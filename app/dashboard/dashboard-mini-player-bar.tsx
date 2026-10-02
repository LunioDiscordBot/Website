'use client';

import Link from 'next/link';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useDashboardPlayerOptional } from './dashboard-player-provider';
import { buildDashboardPath } from '@/lib/dashboard-routes';
import { commitOnPointerRelease } from '@/lib/slider-commit';

const SLIDER_COMMIT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

function formatClock(ms: number | null | undefined) {
	if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) return '--:--';
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function MiniIcon({ name, className = 'h-5 w-5' }: { name: 'play' | 'pause' | 'previous' | 'skip' | 'volume'; className?: string }) {
	const shared = {
		className,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 2,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		'aria-hidden': true,
	};
	switch (name) {
		case 'play':
			return (
				<svg {...shared}>
					<path d="M8 6.5v11l8.5-5.5L8 6.5Z" fill="currentColor" stroke="none" />
				</svg>
			);
		case 'pause':
			return (
				<svg {...shared}>
					<rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" stroke="none" />
					<rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" stroke="none" />
				</svg>
			);
		case 'previous':
			return (
				<svg {...shared}>
					<path d="M19 7.5v9L12.5 12 19 7.5Z" fill="currentColor" stroke="none" />
					<path d="M12.5 7.5v9L6 12l6.5-4.5Z" fill="currentColor" stroke="none" />
					<path d="M5 7v10" />
				</svg>
			);
		case 'skip':
			return (
				<svg {...shared}>
					<path d="M5 7.5v9l6.5-4.5L5 7.5Z" fill="currentColor" stroke="none" />
					<path d="M11.5 7.5v9l6.5-4.5-6.5-4.5Z" fill="currentColor" stroke="none" />
					<path d="M19 7v10" />
				</svg>
			);
		case 'volume':
			return (
				<svg {...shared}>
					<path d="M5 10v4h3l4 3.5v-11L8 10H5Z" fill="currentColor" stroke="none" />
					<path d="M16 8.5a4.5 4.5 0 0 1 0 7" />
					<path d="M18.5 6a8 8 0 0 1 0 12" />
				</svg>
			);
	}
}

export function DashboardMiniPlayerBar() {
	const dashboardPlayer = useDashboardPlayerOptional();

	if (!dashboardPlayer) return null;

	const {
		botId,
		guildId,
		hasIdentity,
		player,
		commandFeedback,
		isBusy,
		displayPosition,
		trackDuration,
		progressPercent,
		scrubValue,
		isScrubbing,
		setScrubValue,
		setIsScrubbing,
		volumeDraft,
		setVolumeDraft,
		sendCommand,
		submitSeek,
		submitVolume,
	} = dashboardPlayer;

	if (!hasIdentity || !player?.currentTrack) return null;

	const track = player.currentTrack;
	const isPaused = player.paused;
	const overviewHref = buildDashboardPath(botId, guildId);

	const cannotControl = isBusy || commandFeedback.phase === 'sending';

	const seekMax = Math.max(1, trackDuration);
	const seekValue = isScrubbing ? scrubValue : displayPosition;
	const commitOnKeyUp = (commit: (value: number) => void) => (event: KeyboardEvent<HTMLInputElement>) => {
		if (SLIDER_COMMIT_KEYS.has(event.key)) commit(Number(event.currentTarget.value));
	};

	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
			<section aria-label="Now playing" className="dash-card pointer-events-auto relative mx-auto max-w-[1400px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
				<div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-[var(--dash-track)]">
					<div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
				</div>

				<div className="flex items-center gap-3 px-3 py-2.5 sm:gap-5 sm:px-4">
					<Link
						className="-mx-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 transition-colors duration-150 hover:bg-[var(--dash-subtle)]"
						href={overviewHref}
						prefetch={false}
					>
						{track.artworkUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" height={40} src={track.artworkUrl} width={40} />
						) : (
							<span
								aria-hidden="true"
								className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--dash-active)] text-xs font-bold text-muted"
							>
								{track.title.slice(0, 1)}
							</span>
						)}
						<span className="min-w-0 flex-1">
							<span className="block truncate text-sm font-semibold">{track.title}</span>
							<span className="block truncate text-xs text-muted">{track.artist}</span>
						</span>
						<span className="sr-only">Open player</span>
					</Link>

					<div className="flex shrink-0 items-center gap-1">
						<button
							aria-label="Previous track"
							className="dash-btn dash-btn-icon hidden border-transparent bg-transparent sm:inline-flex"
							disabled={cannotControl}
							onClick={() => void sendCommand('previous')}
							type="button"
						>
							<MiniIcon className="h-4 w-4" name="previous" />
						</button>
						<button
							aria-label={isPaused ? 'Resume' : 'Pause'}
							className="dash-btn dash-btn-primary dash-btn-icon rounded-full"
							disabled={cannotControl}
							onClick={() => void sendCommand(isPaused ? 'resume' : 'pause')}
							type="button"
						>
							<MiniIcon className="h-4 w-4" name={isPaused ? 'play' : 'pause'} />
						</button>
						<button
							aria-label="Skip track"
							className="dash-btn dash-btn-icon border-transparent bg-transparent"
							disabled={cannotControl}
							onClick={() => void sendCommand('skip')}
							type="button"
						>
							<MiniIcon className="h-4 w-4" name="skip" />
						</button>
					</div>

					<div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
						<span className="text-xs tabular-nums text-muted">{formatClock(seekValue)}</span>
						<input
							aria-label="Seek"
							className="dash-slider min-w-0 flex-1"
							max={seekMax}
							min={0}
							onChange={(event) => setScrubValue(Number(event.target.value))}
							onKeyDown={(event) => SLIDER_COMMIT_KEYS.has(event.key) && setIsScrubbing(true)}
							onKeyUp={commitOnKeyUp((value) => void submitSeek(value))}
							onPointerDown={(event) => {
								setIsScrubbing(true);
								commitOnPointerRelease(event, (value) => void submitSeek(value));
							}}
							style={{ '--fill': `${Math.min(100, (seekValue / seekMax) * 100)}%` } as CSSProperties}
							type="range"
							value={seekValue}
						/>
						<span className="text-xs tabular-nums text-muted">{formatClock(trackDuration)}</span>
					</div>

					<div className="hidden items-center gap-2 lg:flex">
						<MiniIcon className="h-4 w-4 text-muted" name="volume" />
						<input
							aria-label="Volume"
							className="dash-slider w-24"
							disabled={cannotControl}
							max={200}
							min={1}
							onChange={(event) => setVolumeDraft(Number(event.target.value))}
							onKeyUp={commitOnKeyUp((value) => void submitVolume(value))}
							onPointerDown={(event) => commitOnPointerRelease(event, (value) => void submitVolume(value))}
							style={{ '--fill': `${((volumeDraft - 1) / 199) * 100}%` } as CSSProperties}
							type="range"
							value={volumeDraft}
						/>
						<span className="w-9 text-right text-xs tabular-nums text-muted">{volumeDraft}%</span>
					</div>
				</div>
			</section>
		</div>
	);
}
