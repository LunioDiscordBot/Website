'use client';

import Link from 'next/link';
import { useSiteLanguage } from '@/components/site-language-provider';

export function DashboardRouteState({
	title,
	message,
	primaryHref = '/servers',
	primaryLabel = 'Return to servers',
}: {
	title: string;
	message: string;
	primaryHref?: string;
	primaryLabel?: string;
}) {
	const { messages } = useSiteLanguage();

	return (
		<section className="flex justify-center px-4 py-16 sm:py-24">
			<div className="dash-card w-full max-w-lg p-8 text-center sm:p-10">
				<span aria-hidden="true" className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--dash-active)] text-muted">
					<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="8.5" />
						<path d="M12 8v4.5" />
						<path d="M12 16h.01" />
					</svg>
				</span>
				<h1 className="mt-5 font-headline text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
				<p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{message}</p>
				<div className="mt-7 flex flex-wrap items-center justify-center gap-2">
					<Link className="dash-btn dash-btn-primary h-10 px-4" href={primaryHref} prefetch={false}>
						{primaryLabel === 'Return to servers' ? messages.routeState.returnToServers : primaryLabel}
					</Link>
					{primaryHref !== '/' ? (
						<Link className="dash-btn h-10 px-4" href="/" prefetch={false}>
							{messages.routeState.returnHome}
						</Link>
					) : null}
				</div>
			</div>
		</section>
	);
}
