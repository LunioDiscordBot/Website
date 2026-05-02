'use client';

import { useEffect, useMemo, useState } from 'react';
import { Spinner } from '@/components/spinner';
import { apiJson, type ReferralPromoStatusResponse } from '@/lib/api';

type LoadState = 'loading' | 'ready' | 'unauthorized' | 'error';
const CLAIMED_NOTICE_STORAGE_PREFIX = 'lunio:web:redeemClaimNoticeDismissed:';

const BOT_LABELS: Record<string, string> = {
	lunio: 'Lunio',
	lunio2: 'Lunio 2',
};

function formatGuildName(guild: { guildId: string; name: string | null } | null | undefined) {
	if (!guild) return 'Not linked yet';
	return guild.name || guild.guildId;
}

export function RedeemClient({ botId }: { botId: string }) {
	const [state, setState] = useState<LoadState>('loading');
	const [status, setStatus] = useState<ReferralPromoStatusResponse['status']>(null);
	const [error, setError] = useState<string | null>(null);
	const [isRedeeming, setIsRedeeming] = useState(false);
	const [showClaimedModal, setShowClaimedModal] = useState(false);

	const botLabel = BOT_LABELS[botId] || botId;
	const claimedNoticeStorageKey = `${CLAIMED_NOTICE_STORAGE_PREFIX}${botId}`;

	const loadStatus = async () => {
		setState('loading');
		setError(null);
		try {
			const response = await apiJson<ReferralPromoStatusResponse>(`/referral/status?botId=${encodeURIComponent(botId)}`);
			setStatus(response.status);
			setState('ready');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unable to load referral status.';
			if (message === 'Unauthorized') {
				setState('unauthorized');
				return;
			}
			setError(message);
			setState('error');
		}
	};

	useEffect(() => {
		void loadStatus();
	}, [botId]);

	useEffect(() => {
		if (!status?.granted) {
			setShowClaimedModal(false);
			try {
				window.localStorage.removeItem(claimedNoticeStorageKey);
			} catch {}
			return;
		}

		try {
			const dismissed = window.localStorage.getItem(claimedNoticeStorageKey) === '1';
			setShowClaimedModal(!dismissed);
		} catch {
			setShowClaimedModal(true);
		}
	}, [claimedNoticeStorageKey, status?.granted]);

	const progress = useMemo(() => {
		const firstDone = Boolean(status?.anchorGuild);
		const secondDone = Boolean(status?.pendingGuild);
		return { firstDone, secondDone };
	}, [status]);

	const onRedeem = async () => {
		setIsRedeeming(true);
		setError(null);
		try {
			const response = await apiJson<ReferralPromoStatusResponse>('/referral/redeem', {
				method: 'POST',
				body: JSON.stringify({ botId }),
			});
			setStatus(response.status);
			setState('ready');
			try {
				window.localStorage.removeItem(claimedNoticeStorageKey);
			} catch {}
			setShowClaimedModal(Boolean(response.status?.granted));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Redeem failed.');
		} finally {
			setIsRedeeming(false);
		}
	};

	const dismissClaimedModal = () => {
		setShowClaimedModal(false);
		try {
			window.localStorage.setItem(claimedNoticeStorageKey, '1');
		} catch {}
	};

	if (state === 'loading') {
		return (
			<div className="dashboard-empty-card flex items-center justify-center gap-3">
				<Spinner className="h-5 w-5 text-primary" />
				<span>Checking your referral promo progress...</span>
			</div>
		);
	}

	if (state === 'unauthorized') {
		return (
			<div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,22rem)]">
				<section className="dashboard-hero-card">
					<div className="metric-label">Sign in required</div>
					<h1 className="mt-4 font-headline text-5xl font-bold tracking-[-0.06em] text-white">Redeem your Lunio referral reward.</h1>
					<p className="mt-6 max-w-2xl text-base leading-8 text-white/58">
						Sign in with Discord to let Lunio verify the servers you manage and unlock the 3-month premium referral promo.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<a className="primary-button" href={`/login?returnTo=${encodeURIComponent(`/redeem?botId=${botId}`)}`}>
							Sign in with Discord
						</a>
						<a className="ghost-button" href="/commands">
							See how Lunio works
						</a>
					</div>
				</section>

				<aside className="dashboard-side-card">
					<div className="metric-label">How it works</div>
					<div className="mt-5 space-y-4 text-sm leading-7 text-white/58">
						<p>1. Invite {botLabel} to one server you manage.</p>
						<p>2. Invite {botLabel} to a second server you manage.</p>
						<p>3. Return here and redeem 3 months of premium for both.</p>
					</div>
				</aside>
			</div>
		);
	}

	if (state === 'error') {
		return (
			<div className="dashboard-empty-card">
				<div className="font-headline text-2xl font-bold text-white">Could not load redeem status</div>
				<div className="mt-3 text-sm leading-7 text-white/58">{error || 'Try again in a moment.'}</div>
				<button className="secondary-button mt-6" onClick={() => void loadStatus()} type="button">
					Retry
				</button>
			</div>
		);
	}

	return (
		<>
			{showClaimedModal ? (
				<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
					<div className="dashboard-hero-card max-w-2xl border border-primary/25 shadow-[0_32px_120px_rgba(0,0,0,0.48)]">
						<div className="metric-label text-primary">Reward unlocked</div>
						<h2 className="mt-4 font-headline text-4xl font-bold tracking-[-0.06em] text-white sm:text-5xl">3 months of premium have been applied.</h2>
						<p className="mt-5 max-w-xl text-base leading-8 text-white/62">
							Your referral reward is active now. Both eligible {botLabel} servers received the 3-month premium boost successfully.
						</p>
						<div className="mt-6 rounded-[1.4rem] border border-primary/18 bg-primary/10 p-5 text-sm leading-7 text-white/68">
							{status?.message || `Your ${botLabel} referral reward has been claimed successfully.`}
						</div>
						<div className="mt-8 flex flex-wrap gap-3">
							<a className="primary-button" href="/servers">
								Open Dashboard
							</a>
							<button className="ghost-button" onClick={dismissClaimedModal} type="button">
								Close
							</button>
						</div>
					</div>
				</div>
			) : null}

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,24rem)]">
				<section className="dashboard-hero-card">
					<div className="metric-label">Referral promo</div>
					<h1 className="mt-4 font-headline text-5xl font-bold tracking-[-0.06em] text-white">Unlock 3 months of premium for two {botLabel} servers.</h1>
					<p className="mt-6 max-w-2xl text-base leading-8 text-white/58">
						Invite {botLabel} to two servers you manage. When both eligible servers are linked, you can redeem the referral reward here in one click.
					</p>

					<div className="mt-8 grid gap-4 md:grid-cols-2">
						<article className="dashboard-context-card">
							<div className="metric-label">{progress.firstDone ? 'Step 1 complete' : 'Step 1'}</div>
							<div className="mt-3 font-headline text-2xl font-bold text-white">{formatGuildName(status?.anchorGuild)}</div>
							<p className="mt-3 text-sm leading-7 text-white/54">First linked server for your referral progress.</p>
						</article>

						<article className="dashboard-context-card">
							<div className="metric-label">{progress.secondDone ? 'Step 2 complete' : 'Step 2'}</div>
							<div className="mt-3 font-headline text-2xl font-bold text-white">{formatGuildName(status?.pendingGuild)}</div>
							<p className="mt-3 text-sm leading-7 text-white/54">Second linked server needed to activate the reward.</p>
						</article>
					</div>

					<div className="mt-8 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-white/62">
						{status?.message || 'No referral progress yet.'}
					</div>

					<div className="mt-8 flex flex-wrap gap-3">
						{status?.ready && !status?.granted ? (
							<button className="primary-button inline-flex items-center gap-2" disabled={isRedeeming} onClick={() => void onRedeem()} type="button">
								{isRedeeming ? <><Spinner className="h-4 w-4" />Redeeming...</> : 'Redeem 3 Months Premium'}
							</button>
						) : (
							<a className="primary-button" href="/servers">
								Open Dashboard
							</a>
						)}

						<button className="ghost-button" onClick={() => void loadStatus()} type="button">
							Refresh Status
						</button>
					</div>

					{error ? <div className="mt-5 text-sm text-secondary">{error}</div> : null}
				</section>

				<aside className="dashboard-side-card">
					<div className="metric-label">Reward state</div>
					<div className="mt-5 space-y-4">
						<div className="dashboard-stat-row">
							<span>Promo claimed</span>
							<strong>{status?.granted ? 'Yes' : 'No'}</strong>
						</div>
						<div className="dashboard-stat-row">
							<span>Ready to redeem</span>
							<strong>{status?.ready ? 'Yes' : 'No'}</strong>
						</div>
						<div className="dashboard-stat-row">
							<span>Reward</span>
							<strong>3 months</strong>
						</div>
					</div>
					<div className="mt-8 rounded-[1.4rem] border border-primary/16 bg-primary/10 p-5 text-sm leading-7 text-white/62">
						<div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-primary">Heads up</div>
						<div className="mt-3">
							Both servers need to still have {botLabel}, and you need to be signed in with an account that can manage both servers when you redeem.
						</div>
					</div>
				</aside>
			</div>
		</>
	);
}
