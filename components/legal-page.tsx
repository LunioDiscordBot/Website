'use client';

import type { ReactNode } from 'react';
import { SiteShell } from '@/components/site-shell';
import { useSiteLanguage } from '@/components/site-language-provider';

export type LegalSection = {
	title: string;
	body: ReactNode;
};

export const legalLinkClass = 'font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors duration-150 hover:decoration-primary';

function sectionId(title: string, index: number) {
	return `section-${index + 1}-${title
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')}`;
}

export function LegalPage({ currentPath, title, intro, sections }: { currentPath: string; title: string; intro: string; sections: LegalSection[] }) {
	const { messages } = useSiteLanguage();

	return (
		<SiteShell currentPath={currentPath}>
			<div className="shell pt-14 sm:pt-20">
				<header className="max-w-3xl">
					<p className="text-sm font-semibold text-primary">{messages.legal.eyebrow}</p>
					<h1 className="mt-3 font-headline text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
					<p className="mt-4 text-base leading-7 text-muted">{intro}</p>
					<p className="mt-3 text-sm text-muted">{messages.legal.effectiveDate}</p>
				</header>

				<div className="mt-12 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
					<nav aria-label={`${title} sections`} className="hidden lg:block">
						<ol className="sticky top-24 grid gap-0.5 border-l border-[var(--dash-border)]">
							{sections.map((section, index) => (
								<li key={section.title}>
									<a
										className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-muted transition-colors duration-150 hover:border-[var(--dash-border-strong)] hover:text-text"
										href={`#${sectionId(section.title, index)}`}
									>
										{section.title}
									</a>
								</li>
							))}
						</ol>
					</nav>

					<article className="max-w-3xl">
						{sections.map((section, index) => (
							<section className="dash-divider border-b py-7 first:pt-0 last:border-b-0" id={sectionId(section.title, index)} key={section.title}>
								<h2 className="text-lg font-semibold">{section.title}</h2>
								<div className="mt-3 break-words text-[0.9375rem] leading-7 text-muted">{section.body}</div>
							</section>
						))}
					</article>
				</div>
			</div>
		</SiteShell>
	);
}
