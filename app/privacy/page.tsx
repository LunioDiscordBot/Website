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

export default function PrivacyPage() {
  const { language, messages } = useSiteLanguage();

  const sections: LegalSection[] =
    language === "de"
      ? [
          {
            title: "1. Verantwortliche Stelle",
            body: (
              <>
                Diese Datenschutzerklärung erläutert, wie Lunio personenbezogene Daten im Zusammenhang mit Website, Dashboard, Discord-Bot, Support-Anfragen und Premium-Diensten verarbeitet. Kontakt:{" "}
                <a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
                  lavalinklunio@gmail.com
                </a>
                .
              </>
            ),
          },
          {
            title: "2. Welche Daten wir verarbeiten",
            body:
              "Abhängig von deiner Nutzung kann Lunio Discord-Konto-IDs, Nutzernamen, Avatare, Guild-IDs, Guild-Einstellungen, Playlist-Daten, Premium-Statusinformationen, zahlungsbezogene Statusdaten, Command-Nutzungsdaten, Queue- und Wiedergabe-Metadaten, Logs und supportbezogene Kommunikation verarbeiten.",
          },
          {
            title: "3. Wie wir Daten erhalten",
            body:
              "Wir erhalten Daten direkt durch deine Interaktion mit Lunio, von Discord bei Login oder Bot-Nutzung, aus deinen Guild-Konfigurationen, aus Dashboard-Aktionen sowie von Infrastruktur- oder Zahlungsanbietern, soweit dies für Premium- oder Support-Funktionen erforderlich ist.",
          },
          {
            title: "4. Zwecke der Verarbeitung",
            body:
              "Wir verarbeiten Daten, um Bot und Dashboard zu betreiben, Musik- und Playlist-Funktionen bereitzustellen, Guild- und Nutzereinstellungen zu speichern, Berechtigungen und Zugriffsregeln durchzusetzen, Premium-Funktionen zu liefern, Missbrauch zu verhindern, Fehler zu diagnostizieren, die Stabilität zu sichern und Support-Anfragen zu beantworten.",
          },
          {
            title: "5. Rechtsgrundlagen",
            body:
              "Soweit anwendbar, erfolgt die Verarbeitung auf Grundlage der Vertragserfüllung, berechtigter Interessen am Betrieb und Schutz von Lunio, gesetzlicher Pflichten sowie einer Einwilligung, sofern eine Einwilligung erforderlich ist. Bei Premium-Diensten kann die Verarbeitung zudem für Zahlungsabwicklung und Berechtigungsverwaltung notwendig sein.",
          },
          {
            title: "6. Weitergabe und Auftragsverarbeiter",
            body:
              "Wir können Daten an Infrastruktur-, Hosting-, Analyse-, Logging-, Zahlungs- und Plattformanbieter weitergeben, soweit dies für den Betrieb von Lunio erforderlich ist. Discord und andere Dienste, mit denen du über Lunio interagierst, können Daten nach ihren eigenen Richtlinien verarbeiten.",
          },
          {
            title: "7. Speicherung und Aufbewahrung",
            body:
              "Wir speichern Daten nur so lange, wie sie für Betrieb, Sicherheit, Support, rechtliche Anforderungen oder Abrechnung erforderlich sind. Einige Daten werden automatisch gelöscht, andere bleiben bestehen, solange eine Guild oder ein Nutzer Lunio aktiv verwendet, und manche Daten können aus gesetzlichen oder berechtigten betrieblichen Gründen länger aufbewahrt werden.",
          },
          {
            title: "8. Cookies und Authentifizierung",
            body:
              "Die Website nutzt Authentifizierungs- und Sitzungs-Cookies, um Login, Dashboard-Zugriff und Account-Kontext bereitzustellen. Zusätzlich können Local Storage oder Session Storage verwendet werden, um Dashboard-Zustand, Serverauswahl und Nutzererlebnis zu verbessern.",
          },
          {
            title: "9. Internationale Nutzer",
            body:
              "Lunio kann international genutzt werden. Mit der Nutzung des Dienstes verstehst du, dass Daten auf Servern außerhalb deines eigenen Landes verarbeitet werden können, vorbehaltlich der jeweils erforderlichen rechtlichen Schutzmechanismen.",
          },
          {
            title: "10. Deine Rechte",
            body: (
              <>
                Abhängig von deinem Standort kannst du Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Datenübertragbarkeit und Beschwerde bei einer Aufsichtsbehörde haben. Anfragen können an{" "}
                <a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
                  lavalinklunio@gmail.com
                </a>
                {" "}gesendet werden.
              </>
            ),
          },
          {
            title: "11. Löschanfragen",
            body:
              "Wenn du Daten löschen lassen möchtest, die deinem Nutzer oder deiner Guild zugeordnet sind, kontaktiere uns mit ausreichenden Informationen zur Identifizierung des Discord-Kontos oder Servers. Begrenzte Informationen können wir weiterhin speichern, soweit dies für Sicherheit, Abrechnung, Betrugsprävention oder rechtliche Pflichten erforderlich ist.",
          },
          {
            title: "12. Kontakt",
            body: (
              <>
                Für Datenschutzanfragen oder Fragen kontaktiere{" "}
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
            title: "1. Controller information",
            body: (
              <>
                This Privacy Policy explains how Lunio processes personal data in connection with the website,
                dashboard, Discord bot, support interactions, and premium services. Contact:{" "}
                <a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
                  lavalinklunio@gmail.com
                </a>
                .
              </>
            ),
          },
          {
            title: "2. Data we process",
            body:
              "Depending on how you use Lunio, we may process Discord account identifiers, usernames, avatars, guild identifiers, guild settings, playlist data, premium entitlement information, payment-related status information, command usage data, queue and playback metadata, logs, and support-related communications.",
          },
          {
            title: "3. How we collect data",
            body:
              "We receive data directly from your interaction with Lunio, from Discord when you log in or use the bot, from your guild configuration, from dashboard actions, and from infrastructure or payment providers where needed to operate premium or support related features.",
          },
          {
            title: "4. Purposes of processing",
            body:
              "We process data to operate the bot and dashboard, provide music playback and playlist functionality, remember guild and user settings, enforce permissions and access rules, deliver premium features, prevent abuse, diagnose errors, maintain reliability, and respond to support requests.",
          },
          {
            title: "5. Legal bases",
            body:
              "Where applicable, processing is based on contract performance, legitimate interests in operating and securing Lunio, legal compliance, and consent where consent is required. If premium services are purchased, processing may also be necessary for payment handling and entitlement management.",
          },
          {
            title: "6. Sharing and processors",
            body:
              "We may share data with infrastructure, hosting, analytics, logging, payment, and platform providers where this is necessary to operate Lunio. Discord and any third-party services you interact with through Lunio may process data under their own policies.",
          },
          {
            title: "7. Storage and retention",
            body:
              "We retain data only for as long as it is needed for operational, security, support, legal, or billing purposes. Some data may be deleted automatically, some may persist while a guild or user actively uses Lunio, and some may be retained longer where required by law or legitimate operational necessity.",
          },
          {
            title: "8. Cookies and authentication",
            body:
              "The website uses authentication and session-related cookies to support sign-in, dashboard access, and account context. Additional local or session storage may be used to improve dashboard state, server selection, and user experience.",
          },
          {
            title: "9. International users",
            body:
              "Lunio may be used internationally. By using the service, you understand that data may be processed on servers located in countries outside your own, subject to applicable legal safeguards where required.",
          },
          {
            title: "10. Your rights",
            body: (
              <>
                Depending on your location, you may have rights relating to access, correction, deletion, restriction,
                objection, portability, and complaint to a supervisory authority. Requests may be sent to{" "}
                <a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
                  lavalinklunio@gmail.com
                </a>
                .
              </>
            ),
          },
          {
            title: "11. Data deletion requests",
            body:
              "If you would like data associated with your user or guild to be deleted, contact us with enough information to identify the relevant Discord account or server. We may need to retain limited information where required for security, billing, fraud prevention, or legal compliance.",
          },
          {
            title: "12. Contact",
            body: (
              <>
                For privacy-related requests or questions, contact{" "}
                <a className={emailLinkClass} href="mailto:lavalinklunio@gmail.com">
                  lavalinklunio@gmail.com
                </a>
                . Support server: discord.gg/rrqEFukVUZ.
              </>
            ),
          },
        ];

  return (
    <SiteShell currentPath="/privacy">
      <section className="py-16 sm:py-24">
        <div className="shell">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:items-start">
            <div className="xl:sticky xl:top-24">
              <div className="eyebrow">{messages.legal.eyebrow}</div>
              <h1 className="section-title max-w-sm">{messages.legal.privacyTitle}</h1>
              <p className="section-copy mt-5 max-w-sm">
                {messages.legal.privacyIntro}
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
                    <div className="mt-3 text-sm leading-7 text-muted">
                      {section.body}
                    </div>
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
