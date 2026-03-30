"use client";

import type { ReactNode } from "react";
import { useSiteLanguage } from "@/components/site-language-provider";
import { SiteShell } from "@/components/site-shell";

type LegalSection = {
  title: string;
  body: ReactNode;
};

const emailLinkClass =
  "font-bold text-primary transition hover:text-white";

export default function TosPage() {
  const { language, messages } = useSiteLanguage();

  const sections: LegalSection[] =
    language === "de"
      ? [
          {
            title: "1. Geltungsbereich",
            body:
              "Diese Nutzungsbedingungen regeln deinen Zugang zur Lunio-Website, zum Dashboard, zum Discord-Bot, zu Premium-Funktionen und zugehörigen Diensten. Mit der Nutzung von Lunio stimmst du diesen Bedingungen zu.",
          },
          {
            title: "2. Berechtigung und Nutzungskontext",
            body:
              "Du darfst Lunio nur im Zusammenhang mit Discord-Servern, Konten und Communities verwenden, für die du die notwendigen Berechtigungen besitzt. Du bist dafür verantwortlich, dass deine Nutzung mit den Regeln von Discord sowie den Regeln des jeweiligen Serverinhabers oder Administrators vereinbar ist.",
          },
          {
            title: "3. Leistungsbeschreibung",
            body:
              "Lunio bietet Musik-Wiedergabe in Discord, Queue- und Playlist-Funktionen, eigene Anfragekanäle, Dashboard-Steuerung, Guild-Konfigurationswerkzeuge und optionale Premium-Funktionen. Funktionen können jederzeit erweitert, verbessert, eingeschränkt oder ganz eingestellt werden.",
          },
          {
            title: "4. Zulässige Nutzung",
            body:
              "Du darfst Lunio nicht für rechtswidrige Aktivitäten, Missbrauch von Drittanbieterdiensten, Belästigung, Umgehung von Zugriffsbeschränkungen, Störung des Dienstes oder andere Aktivitäten verwenden, die Lunio, seine Infrastruktur oder andere Nutzer schädigen könnten. Wir können Zugriffe einschränken oder sperren, wenn dies zum Schutz des Dienstes oder zur Erfüllung rechtlicher Pflichten erforderlich ist.",
          },
          {
            title: "5. Premium-Dienste und Zahlungen",
            body:
              "Bestimmte Funktionen können ein kostenpflichtiges Abonnement, eine Freischaltung per Voting oder einen anderen Premium-Zugang erfordern. Premium-Zugänge können nach Nutzer, Guild, Bot-Instanz oder Funktionsumfang begrenzt sein. Preise, Abrechnungsintervalle und Verfügbarkeit können sich ändern. Soweit nicht ausdrücklich anders angegeben, vermittelt Premium nur ein beschränktes, widerrufliches Nutzungsrecht und überträgt kein Eigentum an Software oder geistigem Eigentum.",
          },
          {
            title: "6. Drittanbieter",
            body:
              "Lunio ist von Discord abhängig und kann zusätzlich auf APIs, Hosting, Zahlungsanbieter, Audio-Provider oder andere Infrastruktur-Dienste Dritter angewiesen sein. Für Ausfälle, Einschränkungen, Richtlinienänderungen oder Störungen, die durch Dritte verursacht werden, übernehmen wir keine Verantwortung.",
          },
          {
            title: "7. Verfügbarkeit und Wartung",
            body:
              'Lunio wird "wie besehen" und "wie verfügbar" bereitgestellt. Wir garantieren keine ununterbrochene Verfügbarkeit, keinen fehlerfreien Betrieb und keine dauerhafte Kompatibilität mit allen Discord-Funktionen, Geräten oder Serverkonfigurationen. Geplante Wartung, Notfalländerungen, Rate Limits und Plattformänderungen können die Verfügbarkeit beeinträchtigen.',
          },
          {
            title: "8. Geistiges Eigentum",
            body:
              "Lunio, einschließlich Website, Branding, Software, Design und Service-Komponenten, bleibt Eigentum des Betreibers und seiner Lizenzgeber. Diese Bedingungen gewähren dir nur ein beschränktes Recht, den Dienst im Rahmen dieser Bedingungen zu nutzen.",
          },
          {
            title: "9. Beendigung",
            body:
              "Wir können den Zugang zu Lunio jederzeit aussetzen, einschränken oder beenden, wenn dies nach vernünftiger Einschätzung für Sicherheit, Missbrauchsvermeidung, Betriebsintegrität, Rechtskonformität, Zahlungsdurchsetzung oder den Schutz anderer Nutzer oder Communities erforderlich ist.",
          },
          {
            title: "10. Haftungsbeschränkung",
            body:
              "Soweit gesetzlich zulässig, haften Lunio und sein Betreiber nicht für indirekte, zufällige, besondere, Folgeschäden, Strafschadensersatz oder sonstige verlustbezogene Schäden, einschließlich Daten-, Umsatz-, Goodwill- oder Aktivitätsverlusten. Soweit Haftung nicht ausgeschlossen werden kann, ist sie auf den Betrag begrenzt, den du in den zwölf Monaten vor dem Anspruch für den betroffenen Premium-Dienst bezahlt hast.",
          },
          {
            title: "11. Anwendbares Recht und Verbraucherrechte",
            body:
              "Diese Bedingungen gelten vorbehaltlich zwingender verbraucherschutzrechtlicher Vorschriften, die in deinem Wohnsitzland anwendbar sein können. Gesetzlich zwingende Rechte von Verbrauchern bleiben unberührt.",
          },
          {
            title: "12. Kontakt",
            body: (
              <>
                Für rechtliche oder supportbezogene Fragen kontaktiere{" "}
                <a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
                  lavalinklunio@gmail.com
                </a>
                . Support-Server: discord.gg/rrqEFukVUZ.
              </>
            ),
          },
        ]
      : [
          {
            title: "1. Scope",
            body:
              "These Terms of Service govern your access to and use of the Lunio website, dashboard, Discord bot, premium features, and related services. By using Lunio, you agree to these terms.",
          },
          {
            title: "2. Eligibility and account context",
            body:
              "You may only use Lunio in connection with Discord servers, accounts, and communities where you have the necessary permissions. You are responsible for ensuring that your use of the service complies with Discord's rules and any rules set by the relevant server owner or administrator.",
          },
          {
            title: "3. Service description",
            body:
              "Lunio provides Discord music playback, queue and playlist features, custom request-channel functionality, dashboard controls, guild configuration tools, and optional premium features. Features may change, be improved, be restricted, or be discontinued in whole or in part at any time.",
          },
          {
            title: "4. Acceptable use",
            body:
              "You may not use Lunio for unlawful activity, abuse of third-party services, harassment, attempts to bypass access restrictions, interference with the service, or any activity that could harm Lunio, its infrastructure, or other users. We may suspend or limit access where necessary to protect the service or comply with legal obligations.",
          },
          {
            title: "5. Premium services and payments",
            body:
              "Certain features may require a paid subscription, entitlement, vote-based unlock, or other premium access. Premium access may be limited by user, guild, bot instance, or feature scope. Pricing, billing intervals, and premium availability may change. Unless expressly stated otherwise, premium access grants a limited, revocable right to use the relevant features and does not transfer ownership of any software or intellectual property.",
          },
          {
            title: "6. Third-party services",
            body:
              "Lunio depends on Discord and may depend on additional third-party services, APIs, hosting, payment processors, audio providers, or infrastructure services. We are not responsible for outages, restrictions, policy changes, or failures caused by third parties.",
          },
          {
            title: "7. Availability and maintenance",
            body:
              'Lunio is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted availability, error-free operation, or permanent compatibility with all Discord features, devices, or server configurations. Scheduled maintenance, emergency changes, rate limits, and platform-side changes may affect availability.',
          },
          {
            title: "8. Intellectual property",
            body:
              "Lunio, including its website, branding, software, design, and service components, remains the property of its operator and licensors. These terms grant you only a limited right to access and use the service in accordance with these terms.",
          },
          {
            title: "9. Termination",
            body:
              "We may suspend, restrict, or terminate access to Lunio at any time if we reasonably believe this is necessary for security, abuse prevention, operational integrity, legal compliance, payment enforcement, or protection of other users or communities.",
          },
          {
            title: "10. Limitation of liability",
            body:
              "To the maximum extent permitted by applicable law, Lunio and its operator are not liable for indirect, incidental, special, consequential, exemplary, or loss-based damages, including loss of data, revenue, goodwill, or server activity. Where liability cannot be excluded, it is limited to the amount you paid for the relevant premium service during the twelve months preceding the claim.",
          },
          {
            title: "11. Governing law and consumer rights",
            body:
              "These terms are intended to apply subject to mandatory consumer-protection laws that may apply in your country of residence. If you are a consumer, mandatory rights under applicable law remain unaffected.",
          },
          {
            title: "12. Contact",
            body: (
              <>
                For legal or support-related questions, contact{" "}
                <a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
                  lavalinklunio@gmail.com
                </a>
                . Support server: discord.gg/rrqEFukVUZ.
              </>
            ),
          },
        ];

  return (
    <SiteShell currentPath="/tos">
      <section className="py-16 sm:py-24">
        <div className="shell">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:items-start">
            <div className="xl:sticky xl:top-24">
              <div className="eyebrow">{messages.legal.eyebrow}</div>
              <h1 className="section-title max-w-sm">{messages.legal.tosTitle}</h1>
              <p className="section-copy mt-5 max-w-sm">
                {messages.legal.tosIntro}
              </p>
              <div className="mt-4 text-sm text-muted">{messages.legal.effectiveDate}</div>
            </div>

            <div className="panel p-8 sm:p-10">
              <div className="grid gap-5">
                {sections.map((section) => (
                  <div
                    className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5"
                    key={section.title}
                  >
                    <h2 className="font-headline text-2xl font-bold tracking-[-0.04em] text-white">
                      {section.title}
                    </h2>
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
