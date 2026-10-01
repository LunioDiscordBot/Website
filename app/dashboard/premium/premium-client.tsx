'use client';

import { useEffect, useMemo, useState } from 'react';
import { Spinner } from '@/components/spinner';
import { LoadingIndicator } from '@/components/loading-indicator';
import {
	apiJson,
	buildBotScopedPath,
	type AuthGuildsResponse,
	type PremiumCheckoutResponse,
	type PremiumInterval,
	type PremiumPlan,
	type PremiumPortalResponse,
	type PremiumStatusResponse,
} from '@/lib/api';
import { useSiteLanguage } from '@/components/site-language-provider';

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

function formatPrice(plan: PremiumPlan, locale: string) {
	return new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency.toUpperCase() }).format(plan.unitAmount / 100);
}

export function DashboardPremiumClient({ botId, guildId }: DashboardPremiumClientProps) {
	const { language } = useSiteLanguage();
	const [billingInterval, setBillingInterval] = useState<PremiumInterval>('month');
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
	const transferTargets = useMemo(() => guilds.filter((guild) => guild.guildId !== guildId && guild.canManage && guild.connectedBots.includes(botId)), [botId, guildId, guilds]);

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

	// Stripe redirects back with ?checkout=success|cancelled. The webhook that activates premium can land a few
	// seconds after the redirect, so re-check the status briefly instead of showing "Inactive" right away.
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const checkout = params.get('checkout');
		if (!checkout) return;

		params.delete('checkout');
		const query = params.toString();
		window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);

		if (checkout === 'cancelled') {
			setNotice('Checkout was cancelled. No payment was taken.');
			return;
		}
		if (checkout !== 'success') return;

		setNotice('Payment received. Activating premium for this server…');
		let attempts = 0;
		const interval = window.setInterval(async () => {
			attempts += 1;
			try {
				const response = await apiJson<PremiumStatusResponse>(buildBotScopedPath(botId, guildId, '/premium'));
				setPremium(response.premium);
				if (response.premium.active) {
					setNotice('Premium is active for this server. Thanks for supporting Lunio!');
					window.clearInterval(interval);
					return;
				}
			} catch {}
			if (attempts >= 10) {
				setNotice('Payment received, but activation is taking longer than usual. Refresh in a minute, or contact support if it stays inactive.');
				window.clearInterval(interval);
			}
		}, 3000);
		return () => window.clearInterval(interval);
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
				body: JSON.stringify({ interval: billingInterval }),
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
	const plans = premium?.plans ?? [];
	const monthlyPlan = plans.find((plan) => plan.interval === 'month');
	const yearlyPlan = plans.find((plan) => plan.interval === 'year');
	const selectedPlan = plans.find((plan) => plan.interval === billingInterval) ?? monthlyPlan ?? yearlyPlan ?? null;
	const trialDays = premium?.trialDays ?? 0;
	const yearlySavings = monthlyPlan && yearlyPlan ? monthlyPlan.unitAmount * 12 - yearlyPlan.unitAmount : 0;

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
			<section className="dashboard-panel-card overflow-hidden">
				<div className="metric-label">Website checkout</div>
				<h2 className="mt-3 max-w-3xl font-headline text-5xl font-bold tracking-[-0.06em] text-white">Manage Lunio premium for this server.</h2>
				<p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
					Website premium is tied to one Discord server at a time. Checkout, billing changes, cancellation, and the once-per-month server move all live here.
				</p>

				{isLoading ? <LoadingIndicator className="mt-8" label="Checking premium status…" /> : null}
				<div aria-busy={isLoading} className="mt-8 grid gap-4 md:grid-cols-3">
					<div className="dashboard-stat-row">
						<span>Status</span>
						<strong>{isLoading ? <span aria-hidden="true" className="skeleton block h-4 w-16" /> : active ? 'Active' : 'Inactive'}</strong>
					</div>
					<div className="dashboard-stat-row">
						<span>Renews</span>
						<strong>{isLoading ? <span aria-hidden="true" className="skeleton block h-4 w-24" /> : formatDate(premium?.renewsAt)}</strong>
					</div>
					<div className="dashboard-stat-row">
						<span>Move again</span>
						<strong>
							{isLoading ? <span aria-hidden="true" className="skeleton block h-4 w-24" /> : premium?.canTransferNow ? 'Now' : formatDate(premium?.nextTransferAt)}
						</strong>
					</div>
				</div>

				{error ? (
					<div role="alert" className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-100">
						{error}
					</div>
				) : null}
				{notice ? (
					<div role="status" className="mt-6 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
						{notice}
					</div>
				) : null}
				{isConfigured && premium?.testMode ? (
					<div className="mt-6 rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-3 text-sm">
						Stripe test mode: checkout uses test cards only and no real money is charged.
					</div>
				) : null}
				{!isConfigured ? (
					<div className="mt-6 rounded-xl border border-secondary/25 bg-secondary/10 px-4 py-3 text-sm text-secondary">
						Stripe isn’t configured on the API server yet. Set STRIPE_SECRET_KEY, STRIPE_PREMIUM_PRICE_ID, and STRIPE_WEBHOOK_SECRET, then restart the API.
					</div>
				) : null}

				{!active && plans.length ? (
					<fieldset className="mt-8">
						<legend className="text-sm font-medium">Billing</legend>
						<div className="mt-3 grid gap-3 sm:grid-cols-2">
							{[monthlyPlan, yearlyPlan].map((plan) =>
								plan ? (
									<label
										className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors duration-150 ${
											selectedPlan?.interval === plan.interval
												? 'border-primary/60 bg-primary/[0.06]'
												: 'border-[var(--dash-border)] hover:border-[var(--dash-border-strong)]'
										}`}
										key={plan.interval}
									>
										<input
											checked={selectedPlan?.interval === plan.interval}
											className="mt-1 h-4 w-4 accent-[rgb(var(--color-primary))]"
											name="premiumInterval"
											onChange={() => setBillingInterval(plan.interval)}
											type="radio"
											value={plan.interval}
										/>
										<span className="min-w-0">
											<span className="block text-sm font-semibold">{plan.interval === 'month' ? 'Monthly' : 'Yearly'}</span>
											<span className="mt-0.5 block text-sm tabular-nums text-muted">
												{formatPrice(plan, language)} / {plan.interval === 'month' ? 'month' : 'year'}
											</span>
											{plan.interval === 'year' && yearlySavings > 0 ? (
												<span className="mt-2 inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
													Save {formatPrice({ ...plan, unitAmount: yearlySavings }, language)}
												</span>
											) : null}
										</span>
									</label>
								) : null
							)}
						</div>
						{trialDays > 0 ? (
							<p className="mt-3 text-sm text-muted">
								Includes a {trialDays}-day free trial. You won’t be charged until it ends, and you can cancel any time before then.
							</p>
						) : null}
					</fieldset>
				) : null}

				<div className="mt-8 flex flex-wrap gap-3">
					<button
						className="primary-button inline-flex items-center gap-2"
						disabled={!canManage || active || isCheckoutLoading || isLoading || !selectedPlan}
						onClick={() => void startCheckout()}
						type="button"
					>
						{isCheckoutLoading ? <Spinner className="h-4 w-4" /> : null}
						{trialDays > 0 ? `Start ${trialDays}-Day Free Trial` : selectedPlan ? `Subscribe for ${formatPrice(selectedPlan, language)}` : 'Subscribe'}
					</button>
					<button
						className="secondary-button inline-flex items-center gap-2"
						disabled={!canManage || !premium?.subscriptionId || isPortalLoading || isLoading}
						onClick={() => void openPortal()}
						type="button"
					>
						{isPortalLoading ? <Spinner className="h-4 w-4" /> : null}
						Open billing portal
					</button>
					<button className="secondary-button inline-flex items-center gap-2" disabled={isLoading} onClick={() => void load()} type="button">
						{isLoading ? (
							<>
								<Spinner />
								Refreshing…
							</>
						) : (
							'Refresh status'
						)}
					</button>
				</div>

				{!canManage ? <p className="mt-4 text-sm text-muted">Only users with Manage Guild can buy, manage, or move premium for this server.</p> : null}
			</section>

			<aside className="grid gap-6 xl:self-start">
				<article className="dashboard-side-card">
					<div className="metric-label">Server transfer</div>
					<h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">Move premium</h3>
					<p className="mt-3 text-sm leading-6 text-muted">
						Move the website subscription to another connected server you manage. This is limited to once every 30 days.
					</p>
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
