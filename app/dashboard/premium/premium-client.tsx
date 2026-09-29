'use client';

import { useEffect, useMemo, useState } from 'react';
import { Spinner } from '@/components/spinner';
import { apiJson, buildBotScopedPath, type AuthGuildsResponse, type PremiumCheckoutResponse, type PremiumPortalResponse, type PremiumStatusResponse } from '@/lib/api';

type DashboardPremiumClientProps = {
	botId: string;
	guildId: string;
};

function formatDate(value: string | null | undefined) {
	if (!value) return '--';
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value));
}

export function DashboardPremiumClient({ botId, guildId }: DashboardPremiumClientProps) {
	const [premium, setPremium] = useState<PremiumStatusResponse['premium'] | null>(null);
	const [guilds, setGuilds] = useState<AuthGuildsResponse['guilds']>([]);
	const [targetGuildId, setTargetGuildId] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
	const [isPortalLoading, setIsPortalLoading] = useState(false);
	const [isTransferLoading, setIsTransferLoading] = useState(false);
	const [confirmTransfer, setConfirmTransfer] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const selectedGuild = useMemo(() => guilds.find((guild) => guild.guildId === guildId) ?? null, [guildId, guilds]);
	const transferTargets = useMemo(
		() => guilds.filter((guild) => guild.guildId !== guildId && guild.canManage && guild.connectedBots.includes(botId)),
		[botId, guildId, guilds]
	);

	const load = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const [premiumResponse, guildsResponse] = await Promise.all([
				apiJson<PremiumStatusResponse>(buildBotScopedPath(botId, guildId, '/premium')),
				apiJson<AuthGuildsResponse>('/api/auth/guilds'),
			]);
			setPremium(premiumResponse.premium);
			setGuilds(guildsResponse.guilds ?? []);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : 'Unable to load premium status');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, [botId, guildId]);

	useEffect(() => {
		if (transferTargets.length && !transferTargets.some((guild) => guild.guildId === targetGuildId)) {
			setTargetGuildId(transferTargets[0].guildId);
		}
	}, [targetGuildId, transferTargets]);

	const startCheckout = async () => {
		setIsCheckoutLoading(true);
		setError(null);
		setNotice(null);
		try {
			const response = await apiJson<PremiumCheckoutResponse>(buildBotScopedPath(botId, guildId, '/premium/checkout'), {
				method: 'POST',
				body: JSON.stringify({}),
			});
			window.location.href = response.checkoutUrl;
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : 'Unable to start checkout');
		} finally {
			setIsCheckoutLoading(false);
		}
	};

	const openPortal = async () => {
		setIsPortalLoading(true);
		setError(null);
		setNotice(null);
		try {
			const response = await apiJson<PremiumPortalResponse>(buildBotScopedPath(botId, guildId, '/premium/portal'), {
				method: 'POST',
				body: JSON.stringify({}),
			});
			window.location.href = response.portalUrl;
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : 'Unable to open billing portal');
		} finally {
			setIsPortalLoading(false);
		}
	};

	useEffect(() => {
		if (!confirmTransfer) return;
		const timeout = window.setTimeout(() => setConfirmTransfer(false), 5000);
		return () => window.clearTimeout(timeout);
	}, [confirmTransfer]);

	const transferPremium = async () => {
		if (!targetGuildId) return;
		setIsTransferLoading(true);
		setError(null);
		setNotice(null);
		try {
			const response = await apiJson<PremiumStatusResponse>(buildBotScopedPath(botId, guildId, '/premium/transfer'), {
				method: 'POST',
				body: JSON.stringify({ targetGuildId }),
			});
			setPremium(response.premium);
			setNotice('Premium was moved to the selected server. The old server loses website premium immediately.');
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : 'Unable to transfer premium');
		} finally {
			setIsTransferLoading(false);
		}
	};

	const canManage = selectedGuild?.canManage ?? false;
	const active = Boolean(premium?.active);
	const isConfigured = premium?.checkoutConfigured ?? true;

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
			<section className="dashboard-panel-card overflow-hidden">
				<div className="metric-label">Website checkout</div>
				<h2 className="mt-3 max-w-3xl font-headline text-5xl font-bold tracking-[-0.06em] text-white">Manage Lunio premium for this server.</h2>
				<p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
					Website premium is tied to one Discord server at a time. Checkout, billing changes, cancellation, and the once-per-month server move all live here.
				</p>

				<div className="mt-8 grid gap-4 md:grid-cols-3">
					<div className="dashboard-stat-row">
						<span>Status</span>
						<strong>{isLoading ? 'Loading' : active ? 'Active' : 'Inactive'}</strong>
					</div>
					<div className="dashboard-stat-row">
						<span>Renews</span>
						<strong>{formatDate(premium?.renewsAt)}</strong>
					</div>
					<div className="dashboard-stat-row">
						<span>Move again</span>
						<strong>{premium?.canTransferNow ? 'Now' : formatDate(premium?.nextTransferAt)}</strong>
					</div>
				</div>

				{error ? <div role="alert" className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
				{notice ? <div role="status" className="mt-6 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div> : null}
				{!isConfigured ? (
					<div className="mt-6 rounded-xl border border-secondary/25 bg-secondary/10 px-4 py-3 text-sm text-secondary">
						Lemon Squeezy is not configured on the API server yet. Add the API key, store ID, variant ID, and webhook secret before real checkout can open.
					</div>
				) : null}

				<div className="mt-8 flex flex-wrap gap-3">
					<button className="primary-button inline-flex items-center gap-2" disabled={!canManage || active || isCheckoutLoading || isLoading} onClick={() => void startCheckout()} type="button">
						{isCheckoutLoading ? <Spinner className="h-4 w-4" /> : null}
						Subscribe for 1.99/month
					</button>
					<button className="secondary-button inline-flex items-center gap-2" disabled={!canManage || !premium?.subscriptionId || isPortalLoading || isLoading} onClick={() => void openPortal()} type="button">
						{isPortalLoading ? <Spinner className="h-4 w-4" /> : null}
						Open billing portal
					</button>
					<button className="secondary-button" disabled={isLoading} onClick={() => void load()} type="button">
						Refresh status
					</button>
				</div>

				{!canManage ? <p className="mt-4 text-sm text-muted">Only users with Manage Guild can buy, manage, or move premium for this server.</p> : null}
			</section>

			<aside className="grid gap-6 xl:self-start">
				<article className="dashboard-side-card">
					<div className="metric-label">Server transfer</div>
					<h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">Move premium</h3>
					<p className="mt-3 text-sm leading-6 text-muted">Move the website subscription to another connected server you manage. This is limited to once every 30 days.</p>
					<label className="sr-only" htmlFor="premium-transfer-target">
						Server to move Premium to
					</label>
					<select
						className="field-select mt-5"
						id="premium-transfer-target"
						name="transferTarget"
						disabled={!active || !premium?.canTransferNow || isTransferLoading || transferTargets.length === 0}
						onChange={(event) => setTargetGuildId(event.target.value)}
						value={targetGuildId}
					>
						{transferTargets.map((guild) => (
							<option key={guild.guildId} value={guild.guildId}>
								{guild.name}
							</option>
						))}
					</select>
					<button
						className="secondary-button mt-4 inline-flex w-full items-center justify-center gap-2"
						disabled={!active || !premium?.canTransferNow || !targetGuildId || isTransferLoading}
						onClick={() => {
							if (!confirmTransfer) {
								setConfirmTransfer(true);
								return;
							}
							setConfirmTransfer(false);
							void transferPremium();
						}}
						type="button"
					>
						{isTransferLoading ? <Spinner className="h-4 w-4" /> : null}
						{confirmTransfer ? `Confirm Move to ${transferTargets.find((guild) => guild.guildId === targetGuildId)?.name ?? 'Server'}` : 'Move Premium'}
					</button>
					<p className="mt-3 text-xs leading-5 text-white/42">You must have Manage Guild on both the current server and target server.</p>
				</article>

				<article className="dashboard-side-card">
					<div className="metric-label">Policy-safe setup</div>
					<h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">Discord stays available</h3>
					<p className="mt-3 text-sm leading-6 text-muted">
						Keep the Discord guild subscription live too, and do not price the web checkout lower than Discord in supported regions.
					</p>
				</article>
			</aside>
		</div>
	);
}
