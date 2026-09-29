'use client';

import Link from 'next/link';
import { useDashboardPlayerOptional } from './dashboard-player-provider';
import { buildDashboardPath } from '@/lib/dashboard-routes';

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

	return (
		<div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4">
			<div className="mx-auto max-w-[1820px]">
				<div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(12,13,14,0.92)] shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
					{/* progress strip across the very top of the bar */}
					<div className="absolute inset-x-0 top-0 h-[3px] bg-white/5">
						<div
							className="h-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-300"
							style={{ width: `${progressPercent}%` }}
						/>
					</div>

					<div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
						{/* Now playing */}
						<Link
							className="flex min-w-0 flex-1 items-center gap-3 rounded-[1rem] px-2 py-1 -mx-2 transition hover:bg-white/[0.04]"
							href={overviewHref}
							title="Open player"
						>
							<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[0.85rem] border border-white/10 bg-white/[0.04]">
								{track.artworkUrl ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img alt="" className="h-full w-full object-cover" src={track.artworkUrl} />
								) : (
									<div className="flex h-full w-full items-center justify-center text-xs font-extrabold uppercase tracking-[0.2em] text-white/40">
										{track.title.slice(0, 1)}
									</div>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="truncate text-sm font-bold text-white">{track.title}</div>
								<div className="mt-0.5 truncate text-xs text-white/52">{track.artist}</div>
							</div>
						</Link>

						{/* Transport controls + scrub */}
						<div className="flex min-w-0 flex-1 items-center gap-3">
							<button
								aria-label="Previous"
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/72 transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
								disabled={cannotControl}
								onClick={() => void sendCommand('previous')}
								type="button"
							>
								<MiniIcon className="h-4 w-4" name="previous" />
							</button>
							<button
								aria-label={isPaused ? 'Resume' : 'Pause'}
								className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-white shadow-[0_10px_30px_rgba(0,255,255,0.18)] transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={cannotControl}
								onClick={() => void sendCommand(isPaused ? 'resume' : 'pause')}
								type="button"
							>
								<MiniIcon className="h-5 w-5" name={isPaused ? 'play' : 'pause'} />
							</button>
							<button
								aria-label="Skip"
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/72 transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
								disabled={cannotControl}
								onClick={() => void sendCommand('skip')}
								type="button"
							>
								<MiniIcon className="h-4 w-4" name="skip" />
							</button>

							<div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
								<span className="text-[11px] font-semibold tabular-nums text-white/55">
									{formatClock(isScrubbing ? scrubValue : displayPosition)}
								</span>
								<input
									aria-label="Seek"
									className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
									max={Math.max(1, trackDuration)}
									min={0}
									onChange={(event) => setScrubValue(Number(event.target.value))}
									onMouseDown={() => setIsScrubbing(true)}
									onMouseUp={() => void submitSeek()}
									onTouchEnd={() => void submitSeek()}
									onTouchStart={() => setIsScrubbing(true)}
									type="range"
									value={isScrubbing ? scrubValue : displayPosition}
								/>
								<span className="text-[11px] font-semibold tabular-nums text-white/55">{formatClock(trackDuration)}</span>
							</div>
						</div>

						{/* Volume */}
						<div className="hidden items-center gap-2 lg:flex">
							<MiniIcon className="h-4 w-4 text-white/55" name="volume" />
							<input
								aria-label="Volume"
								className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-white/10 accent-secondary"
								max={200}
								min={1}
								onChange={(event) => setVolumeDraft(Number(event.target.value))}
								onMouseUp={() => void submitVolume()}
								onTouchEnd={() => void submitVolume()}
								type="range"
								value={volumeDraft}
							/>
							<span className="w-8 text-right text-[11px] font-semibold tabular-nums text-white/55">{volumeDraft}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
