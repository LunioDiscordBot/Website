'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSiteLanguage } from '@/components/site-language-provider';
import { Spinner } from '@/components/spinner';
import { API_BASE_URL, API_PREFIX, apiJson, type AuthUser } from '@/lib/api';
import { clearAuthClientState } from '@/lib/auth-storage';
import { LUNIO_LOGO_SRC } from '@/lib/brand';

export function LoginClient() {
	const { messages } = useSiteLanguage();
	const searchParams = useSearchParams();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [checkingAccount, setCheckingAccount] = useState(true);
	const [rememberMe, setRememberMe] = useState(true);
	const [busy, setBusy] = useState(false);

	const oauthErrorParam = searchParams.get('error');
	const oauthErrorMessage =
		oauthErrorParam === 'oauth_callback'
			? 'Sign-in failed: Discord returned an error during the OAuth flow. Please try again.'
			: oauthErrorParam === 'oauth_state'
				? 'Sign-in failed: the OAuth state was invalid or expired. Please try again.'
				: oauthErrorParam
					? 'Sign-in failed. Please try again.'
					: null;

	useEffect(() => {
		let active = true;

		void apiJson<AuthUser>('/api/auth/me')
			.then((nextUser) => {
				if (!active) return;
				setUser(nextUser);
				setError(null);
			})
			.catch((nextError) => {
				if (!active) return;
				const message = nextError instanceof Error ? nextError.message : messages.login.unableToLoad;
				setUser(null);
				setError(message === 'Unauthorized' ? null : message);
			})
			.finally(() => {
				if (active) setCheckingAccount(false);
			});

		return () => {
			active = false;
		};
	}, [messages.login.unableToLoad]);

	const handleLogin = () => {
		const url = new URL(`${API_BASE_URL}${API_PREFIX}/auth/discord/login`);
		url.searchParams.set('remember', rememberMe ? '1' : '0');
		const returnTo = searchParams.get('returnTo');
		if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) {
			url.searchParams.set('returnTo', returnTo);
		}
		window.location.href = url.toString();
	};

	const handleLogout = async () => {
		setBusy(true);
		try {
			await fetch(`${API_BASE_URL}${API_PREFIX}/auth/logout`, {
				method: 'POST',
				credentials: 'include',
			});
			clearAuthClientState();
			setUser(null);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="mx-auto grid max-w-md gap-4">
			{oauthErrorMessage ? (
				<div className="rounded-xl border border-danger/35 bg-danger/[0.08] px-4 py-3 text-sm" role="alert">
					{oauthErrorMessage}
				</div>
			) : null}

			<div className="dash-card p-6 sm:p-8">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img alt="" className="h-10 w-10 rounded-full" height={40} src={LUNIO_LOGO_SRC} width={40} />
				<h1 className="mt-5 font-headline text-2xl font-bold tracking-tight">{messages.login.title}</h1>
				<p className="mt-2 text-sm leading-6 text-muted">{messages.login.intro}</p>

				<div aria-live="polite" className="mt-6">
					{user ? (
						<div className="dash-inset flex items-center gap-3 p-3">
							{user.avatarUrl ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img alt="" className="h-10 w-10 rounded-full object-cover" height={40} src={user.avatarUrl} width={40} />
							) : (
								<span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
									{(user.globalName || user.username).slice(0, 1).toUpperCase()}
								</span>
							)}
							<div className="min-w-0">
								<div className="truncate text-sm font-semibold">{user.globalName || user.username}</div>
								<div className="truncate text-xs text-muted">Signed in as @{user.username}</div>
							</div>
						</div>
					) : error ? (
						<div className="rounded-lg border border-danger/35 bg-danger/[0.08] px-3 py-2.5 text-sm" role="alert">
							<div className="font-medium">We couldn’t check your session.</div>
							<div className="mt-0.5 text-muted">{error}</div>
						</div>
					) : checkingAccount ? (
						<div className="flex items-center gap-2 text-sm text-muted">
							<Spinner className="h-4 w-4" />
							Checking your session…
						</div>
					) : null}
				</div>

				{!user ? (
					<label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
						<input
							checked={rememberMe}
							className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[rgb(var(--color-primary))]"
							name="rememberMe"
							onChange={(event) => setRememberMe(event.target.checked)}
							type="checkbox"
						/>
						<span className="leading-5 text-muted">{messages.login.rememberMe}</span>
					</label>
				) : null}

				<div className="mt-6 grid gap-2">
					{user ? (
						<>
							<a className="dash-btn dash-btn-primary h-11 w-full" href="/servers">
								{messages.login.openServers}
							</a>
							<button className="dash-btn h-11 w-full" disabled={busy} onClick={() => void handleLogout()} type="button">
								{busy ? messages.login.loggingOut : messages.login.signOut}
							</button>
						</>
					) : (
						<button
							className="dash-btn h-11 w-full border-transparent !bg-[#5865F2] text-[#fff] hover:!bg-[#4752C4]"
							disabled={checkingAccount}
							onClick={handleLogin}
							type="button"
						>
							<svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.68 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.8 13.8 0 0 0 1.226-1.994.076.076 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.794 8.18 1.794 12.061 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.291a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.04.106c.36.698.774 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.673-3.549-13.66a.062.062 0 0 0-.031-.028ZM8.02 15.332c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.955 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.947 2.419-2.157 2.419Z" />
							</svg>
							{messages.login.continueWithDiscord}
						</button>
					)}
				</div>
			</div>

			<ul className="grid gap-3 px-1 text-sm text-muted">
				{[
					['Your servers', 'See the Discord servers you manage and where Lunio is already connected.'],
					['The dashboard', 'Control the player, playlists, and server settings with your account attached.'],
					['Permission checks', 'Lunio checks your Discord permissions before changing server settings.'],
				].map(([title, copy]) => (
					<li className="flex gap-3" key={title}>
						<svg
							aria-hidden="true"
							className="mt-0.5 h-4 w-4 shrink-0 text-primary"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2.2}
							viewBox="0 0 24 24"
						>
							<path d="m5 12.5 4.5 4.5L19 7.5" />
						</svg>
						<span>
							<span className="font-medium text-text">{title}.</span> {copy}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
