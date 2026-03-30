import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { CookieNotice } from "@/components/cookie-notice";
import { SiteLanguageProvider } from "@/components/site-language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getServerSiteLanguage } from "@/lib/server-site-language";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  title: "Lunio Web",
  description: "The web control surface for the Lunio Discord music bot.",
};

const themeBootScript = `
(() => {
  try {
    const storageKey = 'lunio.theme.preference';
    const stored = window.localStorage.getItem(storageKey);
    const preference = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedTheme = preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;
    const root = document.documentElement;
    root.dataset.themePreference = preference;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  } catch {
    const root = document.documentElement;
    root.dataset.themePreference = 'system';
    root.dataset.theme = 'dark';
    root.style.colorScheme = 'dark';
  }
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLanguage = await getServerSiteLanguage();

  return (
    <html lang={initialLanguage} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} bg-background text-text antialiased`}>
        <SiteLanguageProvider initialLanguage={initialLanguage}>
          <ThemeProvider>
            {children}
            <CookieNotice />
          </ThemeProvider>
        </SiteLanguageProvider>
      </body>
    </html>
  );
}
