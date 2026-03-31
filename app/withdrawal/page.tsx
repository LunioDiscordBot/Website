'use client';

import type { ReactNode } from 'react';
import { useSiteLanguage } from '@/components/site-language-provider';
import { SiteShell } from '@/components/site-shell';

type LegalSection = {
	title: string;
	body: ReactNode;
};

const emailLinkClass = 'font-bold text-primary transition hover:text-white';

export default function WithdrawalPage() {
	const { language, messages } = useSiteLanguage();

	const sections: LegalSection[] =
		language === 'de'
			? [
					{
						title: '1. Gesetzliches Widerrufsrecht',
						body: 'Wenn du Verbraucher bist und kostenpflichtige digitale Dienste oder digitale Inhalte von Lunio kaufst, kann dir ein gesetzliches Widerrufsrecht von 14 Tagen zustehen, vorbehaltlich der nach anwendbarem Recht geltenden Einschränkungen und Ausnahmen.',
					},
					{
						title: '2. Sofortiger Zugang zu Premium-Diensten',
						body: 'Lunio Premium ist darauf ausgelegt, unmittelbar nach Kauf oder Bestätigung der Berechtigung aktiviert zu werden. Wenn du während des Checkouts oder der Aktivierung ausdrücklich sofortigen Zugang verlangst, kannst du dein Widerrufsrecht verlieren, sobald die digitale Leistung beginnt, soweit dies gesetzlich zulässig ist.',
					},
					{
						title: '3. Wirkung des Widerrufs',
						body: 'Wenn ein wirksamer Widerruf ausgeübt wird, bevor die digitale Leistung in einer Weise begonnen hat, die das gesetzliche Widerrufsrecht entfallen lässt, bearbeiten wir den Widerruf nach Maßgabe des anwendbaren Rechts. Wurde Premium aufgrund deines ausdrücklichen Wunsches und deiner Bestätigung bereits ganz oder teilweise aktiviert, kann ein Widerruf ausgeschlossen sein.',
					},
					{
						title: '4. Ausübung des Widerrufs',
						body: (
							<>
								Um dein Widerrufsrecht auszuüben, sende eine eindeutige Erklärung per E-Mail an{' '}
								<a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
									lavalinklunio@gmail.com
								</a>
								. Bitte gib genügend Informationen an, um deinen Kauf zuzuordnen, etwa Discord-User-ID, betroffene Guild, Kaufdatum und das betroffene
								Premium-Produkt oder Abonnement.
							</>
						),
					},
					{
						title: '5. Muster-Widerruf',
						body: 'Du kannst folgende Formulierung verwenden: "Hiermit widerrufe ich meinen Vertrag über den Kauf der folgenden digitalen Leistung: [Premium-Produkt beschreiben], bestellt am [Datum], Discord-Konto: [Nutzer- oder Guild-Angabe], Name: [dein Name], Datum: [heutiges Datum]."',
					},
					{
						title: '6. Kontakt',
						body: (
							<>
								Widerrufserklärungen und rechtliche Rückfragen können an{' '}
								<a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
									lavalinklunio@gmail.com
								</a>{' '}
								gesendet werden.
							</>
						),
					},
				]
			: [
					{
						title: '1. Consumer right of withdrawal',
						body: 'If you are a consumer and purchase premium digital services or digital content from Lunio, you may have a statutory right to withdraw from the contract within 14 days, subject to the limitations and exceptions provided by applicable law.',
					},
					{
						title: '2. Immediate access to premium services',
						body: 'Lunio premium is intended to be activated immediately after purchase or entitlement confirmation. If you expressly request immediate access during checkout or activation, you may lose your right of withdrawal once the digital service begins, to the extent permitted by applicable law.',
					},
					{
						title: '3. Effect of withdrawal',
						body: 'If a valid withdrawal is exercised before the relevant digital service has begun in a way that removes the statutory right, we will process the withdrawal in accordance with applicable law. If premium access has already been fully or partially activated based on your express request and acknowledgement, a withdrawal may no longer be available.',
					},
					{
						title: '4. How to exercise withdrawal',
						body: (
							<>
								To exercise a withdrawal right, send a clear statement by email to{' '}
								<a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
									lavalinklunio@gmail.com
								</a>
								. Please include enough information to identify your purchase, such as the Discord user ID, relevant guild, purchase date, and the premium product
								or subscription involved.
							</>
						),
					},
					{
						title: '5. Model withdrawal notice',
						body: 'You may use the following wording: "I hereby withdraw from my contract for the purchase of the following digital service: [describe premium product], ordered on [date], Discord account: [user or guild identification], name: [your name], date: [today\'s date]."',
					},
					{
						title: '6. Contact',
						body: (
							<>
								Withdrawal requests and related legal inquiries may be sent to{' '}
								<a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
									lavalinklunio@gmail.com
								</a>
								.
							</>
						),
					},
				];

	return (
		<SiteShell currentPath="/withdrawal">
			<section className="py-16 sm:py-24">
				<div className="shell">
					<div className="grid gap-8 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:items-start">
						<div className="xl:sticky xl:top-24">
							<div className="eyebrow">{messages.legal.eyebrow}</div>
							<h1 className="section-title max-w-sm">{messages.legal.withdrawalTitle}</h1>
							<p className="section-copy mt-5 max-w-sm">{messages.legal.withdrawalIntro}</p>
							<div className="mt-4 text-sm text-muted">{messages.legal.effectiveDate}</div>
						</div>

						<div className="panel p-8 sm:p-10">
							<div className="grid gap-5">
								{sections.map((section) => (
									<div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5" key={section.title}>
										<h2 className="font-headline text-2xl font-bold tracking-[-0.04em] text-white">{section.title}</h2>
										<div className="mt-3 text-sm leading-7 text-muted">{section.body}</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>
		</SiteShell>
	);
}
