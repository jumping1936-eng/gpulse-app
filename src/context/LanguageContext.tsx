import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  LANGUAGE_PREFERENCE_KEY,
  SUPPORTED_LOCALES,
  SupportedLocale,
  translate,
} from '@/i18n/appTranslations';

type LanguageContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, fallback: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'zh-TW';

  const savedLocale = window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY);
  if (SUPPORTED_LOCALES.includes(savedLocale as SupportedLocale)) {
    return savedLocale as SupportedLocale;
  }

  return window.navigator.language.toLowerCase().startsWith('en') ? 'en' : 'zh-TW';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<SupportedLocale>(getInitialLocale);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    t: (key, fallback) => translate(locale, key, fallback),
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
