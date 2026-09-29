'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSiteLanguage } from '@/components/site-language-provider';
import { API_BASE_URL, API_PREFIX, apiJson, type AuthUser } from '@/lib/api';
import { clearAuthClientState } from '@/lib/auth-storage';

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
			? 'Sign-in failed - Discord returned an error during the OAuth flow. Please try again.'
			: oauthErrorParam === 'oauth_state'
				? 'Sign-in failed - the OAuth state was invalid or expired. Please try again.'
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
		<div className="mx-auto max-w-5xl space-y-4">
			{oauthErrorMessage ? <div className="rounded-[1.5rem] border border-danger/30 bg-danger/10 px-5 py-4 text-sm leading-7 text-red-100">{oauthErrorMessage}</div> : null}

			<div className="panel overflow-hidden p-0">
				<div className="grid lg:grid-cols-[1.1fr_0.9fr]">
					<div className="p-8 sm:p-10">
						<div className="eyebrow">{messages.login.eyebrow}</div>
						<h1 className="section-title">{messages.login.title}</h1>
						<p className="section-copy mt-5">{messages.login.intro}</p>

						<div
							className={`mt-8 rounded-[1.5rem] border p-5 text-sm leading-7 ${
								error
									? 'border-danger/30 bg-danger/10 text-red-100'
									: user
										? 'border-primary/25 bg-primary/10 text-white'
										: 'border-white/10 bg-white/[0.035] text-white/72'
							}`}
						>
							{user ? (
								<div className="flex items-center gap-4">
									{user.avatarUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											alt={user.username}
											className="h-14 w-14 rounded-full border border-white/10 object-cover"
											height={56}
											src={user.avatarUrl}
											width={56}
										/>
									) : (
										<div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-bold text-white">
											{(user.globalName || user.username).slice(0, 2).toUpperCase()}
										</div>
									)}
									<div>
										<div className="text-base font-bold text-white">{user.globalName || user.username}</div>
										<div className="text-sm text-white/60">@{user.username}</div>
									</div>
								</div>
							) : error ? (
								<div>
									<div className="font-bold text-white">Could not check your session.</div>
									<div className="mt-1 text-red-100/80">{error}</div>
								</div>
							) : (
								<div>
									<div className="font-bold text-white">{checkingAccount ? 'Checking current session…' : messages.login.notSignedIn}</div>
									<div className="mt-1 text-white/55">Use Discord to continue. If you just logged out, this state is expected.</div>
								</div>
							)}
						</div>

						{!user ? (
							<label className="mt-6 flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
								<input
									checked={rememberMe}
									className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
									name="rememberMe"
									onChange={(event) => setRememberMe(event.target.checked)}
									type="checkbox"
								/>
								<span className="leading-6">{messages.login.rememberMe}</span>
							</label>
						) : null}

						<div className="mt-8 flex flex-wrap gap-4">
							{user ? (
								<>
									<a className="primary-button" href="/servers">
										{messages.login.openServers}
									</a>
									<button className="ghost-button" onClick={() => void handleLogout()} type="button">
										{busy ? messages.login.loggingOut : messages.login.signOut}
									</button>
								</>
							) : (
								<button className="primary-button" disabled={checkingAccount} onClick={handleLogin} type="button">
									{checkingAccount ? 'Checking…' : messages.login.continueWithDiscord}
								</button>
							)}
						</div>
					</div>

					<div className="border-t border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(0,255,255,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-8 sm:p-10 lg:border-l lg:border-t-0">
						<div className="eyebrow text-primary">What unlocks</div>
						<div className="mt-6 grid gap-3">
							{[
								['Server list', 'See the Discord guilds you can manage or where Lunio is already connected.'],
								['Dashboard access', 'Open player controls, guild settings, and playlists with your account attached.'],
								['Safer actions', 'Lunio checks your Discord permissions before changing server settings.'],
							].map(([title, copy]) => (
								<div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4" key={title}>
									<div className="font-bold text-white">{title}</div>
									<div className="mt-2 text-sm leading-6 text-white/55">{copy}</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
