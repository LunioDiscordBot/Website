'use client';

import { useSiteLanguage } from '@/components/site-language-provider';
import Link from 'next/link';

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
		<section className="py-12 sm:py-16">
			<div className="shell">
				<div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-10">
					<div className="eyebrow">{messages.routeState.eyebrow}</div>
					<h1 className="mt-4 font-headline text-4xl font-bold tracking-[-0.06em] text-white sm:text-5xl">{title}</h1>
					<p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted">{message}</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
						<Link className="secondary-button px-5 py-3 text-sm" href={primaryHref}>
							{primaryLabel === 'Return to servers' ? messages.routeState.returnToServers : primaryLabel}
						</Link>
						<Link className="ghost-button px-5 py-3 text-sm" href="/">
							{messages.routeState.returnHome}
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
