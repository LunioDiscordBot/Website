"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  getSiteMessages,
  isSiteLanguage,
  SITE_LANGUAGE_COOKIE_KEY,
  SITE_LANGUAGE_OPTIONS,
  SITE_LANGUAGE_STORAGE_KEY,
  type SiteLanguage,
} from "@/lib/site-language";

type SiteLanguageContextValue = {
  language: SiteLanguage;
  setLanguage: (language: SiteLanguage) => void;
  options: typeof SITE_LANGUAGE_OPTIONS;
  messages: ReturnType<typeof getSiteMessages>;
};

const SiteLanguageContext = createContext<SiteLanguageContextValue | null>(null);

function applyLanguageToDocument(language: SiteLanguage) {
  document.documentElement.lang = language;
}

function persistLanguage(language: SiteLanguage) {
  window.localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, language);
  document.cookie = `${SITE_LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`;
}

export function SiteLanguageProvider({
  children,
  initialLanguage,
}: PropsWithChildren<{ initialLanguage: SiteLanguage }>) {
  const [language, setLanguageState] = useState<SiteLanguage>(initialLanguage);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY);
    const cookieLanguage = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${SITE_LANGUAGE_COOKIE_KEY}=`))
      ?.split("=")[1];
    const nextLanguage = isSiteLanguage(storedLanguage)
      ? storedLanguage
      : isSiteLanguage(cookieLanguage)
        ? cookieLanguage
        : initialLanguage;

    setLanguageState(nextLanguage);
    applyLanguageToDocument(nextLanguage);
    persistLanguage(nextLanguage);
  }, [initialLanguage]);

  const setLanguage = (nextLanguage: SiteLanguage) => {
    setLanguageState(nextLanguage);
    applyLanguageToDocument(nextLanguage);
    persistLanguage(nextLanguage);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      options: SITE_LANGUAGE_OPTIONS,
      messages: getSiteMessages(language),
    }),
    [language],
  );

  return (
    <SiteLanguageContext.Provider value={value}>
      {children}
    </SiteLanguageContext.Provider>
  );
}

export function useSiteLanguage() {
  const context = useContext(SiteLanguageContext);

  if (!context) {
    throw new Error("useSiteLanguage must be used within a SiteLanguageProvider");
  }

  return context;
}
