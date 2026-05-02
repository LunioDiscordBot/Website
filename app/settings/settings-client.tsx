'use client';

import { useState } from 'react';
import { useSiteLanguage } from '@/components/site-language-provider';
import { useTheme } from '@/components/theme-provider';
import { clearAuthClientState } from '@/lib/auth-storage';
import { API_BASE_URL, API_PREFIX } from '@/lib/api';
import { THEME_OPTIONS } from '@/lib/theme';

export function SiteSettingsClient() {
	const { language, messages, options: languageOptions, setLanguage } = useSiteLanguage();
	const { preference, resolvedTheme, setPreference } = useTheme();
	const languageSelectionEnabled = false;
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const handleLogout = async () => {
		if (isLoggingOut) return;
		setIsLoggingOut(true);
		try {
			await fetch(`${API_BASE_URL}${API_PREFIX}/auth/logout`, {
				method: 'POST',
				credentials: 'include',
			});
		} finally {
			clearAuthClientState();
			window.location.href = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || '/';
		}
	};

	return (
		<div className="grid gap-6">
			<section className="dashboard-hero-card">
				<div className="eyebrow">{messages.settings.eyebrow}</div>
				<h1 className="font-headline text-4xl font-bold tracking-[-0.06em] text-white sm:text-5xl">{messages.settings.title}</h1>
				<p className="mt-4 max-w-2xl text-base leading-8 text-muted">{messages.settings.intro}</p>

				<div className="mt-8 grid gap-4 md:grid-cols-3">
					<article className="dashboard-context-card">
						<div className="metric-label">{messages.settings.themePreference}</div>
						<div className="mt-3 text-lg font-bold text-white">{preference.charAt(0).toUpperCase() + preference.slice(1)}</div>
					</article>
					<article className="dashboard-context-card">
						<div className="metric-label">{messages.settings.activeTheme}</div>
						<div className="mt-3 text-lg font-bold text-white">{resolvedTheme === 'dark' ? 'Dark' : 'Light'}</div>
					</article>
					<article className="dashboard-context-card">
						<div className="metric-label">{messages.settings.language}</div>
						<div className="mt-3 text-lg font-bold text-white">{languageOptions.find((option) => option.value === language)?.label ?? language}</div>
					</article>
				</div>
			</section>

			<section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
				<article className="dashboard-panel-card">
					<div className="metric-label">{messages.settings.appearance}</div>
					<h2 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">{messages.settings.theme}</h2>
					<p className="mt-4 max-w-2xl text-sm leading-7 text-muted">{messages.settings.themeCopy}</p>

					<div className="mt-8 grid gap-4 md:grid-cols-3">
						{THEME_OPTIONS.map((option) => {
							const selected = preference === option.value;
							return (
								<button
									key={option.value}
									className={`dashboard-panel-card text-left transition ${selected ? 'border-primary/25 bg-primary/10 shadow-[0_0_30px_rgba(0,255,255,0.08)]' : ''}`}
									onClick={() => setPreference(option.value)}
									type="button"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="metric-label">{option.label}</div>
										<span
											className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] ${
												selected ? 'border border-primary/25 bg-primary/10 text-primary' : 'border border-white/10 bg-white/[0.03] text-muted'
											}`}
										>
											{selected ? messages.settings.active : messages.settings.select}
										</span>
									</div>
									<div className="mt-4 text-lg font-bold text-white">
										{option.value === 'system'
											? messages.settings.useRightNow.replace('{theme}', resolvedTheme)
											: messages.settings.mode.replace('{label}', option.label)}
									</div>
									<p className="mt-3 text-sm leading-7 text-muted">{option.description}</p>
								</button>
							);
						})}
					</div>
				</article>

				<aside className="grid gap-6">
					<article className="dashboard-side-card">
						<div className="metric-label">{messages.settings.howItWorks}</div>
						<h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">{messages.settings.themeBehavior}</h3>
						<div className="mt-6 grid gap-3">
							<div className="dashboard-stat-row">
								<span>{messages.settings.storedOn}</span>
								<strong>{messages.settings.thisBrowserAndCookie}</strong>
							</div>
							<div className="dashboard-stat-row">
								<span>{messages.settings.currentPreference}</span>
								<strong>{preference}</strong>
							</div>
							<div className="dashboard-stat-row">
								<span>{messages.settings.activeTheme}</span>
								<strong>{resolvedTheme}</strong>
							</div>
							<div className="dashboard-stat-row">
								<span>{messages.settings.systemReaction}</span>
								<strong>{preference === 'system' ? messages.settings.live : messages.settings.locked}</strong>
							</div>
						</div>
						<div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted">{messages.settings.themeSystemCopy}</div>
					</article>

					<article className="dashboard-side-card">
						<div className="metric-label">{messages.settings.languageEyebrow}</div>
						<h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">{messages.settings.languageTitle}</h3>
						<p className="mt-4 text-sm leading-7 text-muted">{messages.settings.languageCopy}</p>

						<div className="mt-5 grid gap-4">
							{languageOptions.map((option) => {
								const selected = language === option.value;
								return (
									<button
										className={`dashboard-stat-row text-left transition ${selected ? 'border-primary/25 bg-primary/10' : ''}`}
										disabled={!languageSelectionEnabled}
										key={option.value}
										onClick={() => {
											if (!languageSelectionEnabled) return;
											setLanguage(option.value);
										}}
										type="button"
									>
										<span>{option.label}</span>
										<strong>
											{!languageSelectionEnabled
												? selected
													? 'English active'
													: 'Deutsch soon'
												: selected
													? messages.settings.active
													: messages.settings.select}
										</strong>
									</button>
								);
							})}
						</div>

						<div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
							<div className="text-sm font-bold text-white">{messages.settings.currentLanguage}</div>
							<p className="mt-2 text-sm leading-7 text-muted">{messages.settings.languageSystemCopy}</p>
						</div>

						{!languageSelectionEnabled ? (
							<div className="mt-5 rounded-[1.4rem] border border-secondary/20 bg-secondary/10 p-4 text-sm leading-7 text-white/85">
								Site language is temporarily unavailable until the remaining pages are translated consistently.
							</div>
						) : null}
					</article>

					<article className="dashboard-side-card">
						<div className="metric-label">Session</div>
						<h3 className="mt-2 font-headline text-3xl font-bold tracking-[-0.05em] text-white">Account access</h3>
						<p className="mt-4 text-sm leading-7 text-muted">Sign out of Lunio on this browser and return to the public site.</p>
						<button
							className="secondary-button mt-6 w-full justify-center disabled:opacity-50"
							disabled={isLoggingOut}
							onClick={() => void handleLogout()}
							type="button"
						>
							{isLoggingOut ? 'Logging out...' : 'Logout'}
						</button>
					</article>
				</aside>
			</section>
		</div>
	);
}
