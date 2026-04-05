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
	const [rememberMe, setRememberMe] = useState(true);
	const [busy, setBusy] = useState(false);

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
				setUser(null);
				setError(nextError instanceof Error ? nextError.message : messages.login.unableToLoad);
			});

		return () => {
			active = false;
		};
	}, []);

	const handleLogin = () => {
		const url = new URL(`${API_BASE_URL}${API_PREFIX}/auth/discord/login`);
		if (rememberMe) {
			url.searchParams.set('remember', '1');
		}
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
		<div className="mx-auto max-w-3xl panel p-8 sm:p-10">
			<div className="eyebrow">{messages.login.eyebrow}</div>
			<h1 className="section-title">{messages.login.title}</h1>
			<p className="section-copy mt-5">{messages.login.intro}</p>

			<div className="mt-8 rounded-[1.5rem] border border-tertiary/30 bg-tertiary/10 p-5 text-sm leading-7 text-violet-100">
				{user ? (
					<div className="flex items-center gap-4">
						{user.avatarUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img alt={user.username} className="h-14 w-14 rounded-full border border-white/10 object-cover" src={user.avatarUrl} />
						) : (
							<div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-bold text-white">
								{(user.globalName || user.username).slice(0, 2).toUpperCase()}
							</div>
						)}
						<div>
							<div className="text-base font-bold text-white">{user.globalName || user.username}</div>
							<div className="text-sm text-violet-100/70">@{user.username}</div>
						</div>
					</div>
				) : (
					error || messages.login.notSignedIn
				)}
			</div>

			{!user ? (
				<label className="mt-6 flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
					<input
						checked={rememberMe}
						className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-primary focus:ring-primary/30"
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
					<button className="primary-button" onClick={handleLogin} type="button">
						{messages.login.continueWithDiscord}
					</button>
				)}
			</div>
		</div>
	);
}
