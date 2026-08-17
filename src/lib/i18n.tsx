import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePreferences } from "./preferences";
import { localeForLanguage, rememberAppLanguage, type AppLanguage } from "./language";
import { de, type TranslationKey } from "../locales/de";
import { en } from "../locales/en";

type TranslationParams = Record<string, string | number>;

interface I18nContextValue {
  language: AppLanguage;
  locale: string;
  setLanguage: (language: AppLanguage, persist?: boolean) => void | Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { preferences, updatePreferences } = usePreferences();
  const [language, setLocalLanguage] = useState<AppLanguage>(preferences.language);

  useEffect(() => setLocalLanguage(preferences.language), [preferences.language]);

  useEffect(() => {
    document.documentElement.lang = language;
    rememberAppLanguage(language);
  }, [language]);

  const setLanguage = useCallback((next: AppLanguage, persist = true) => {
    setLocalLanguage(next);
    rememberAppLanguage(next);
    if (persist) return updatePreferences({ language: next }, true);
  }, [updatePreferences]);

  const t = useCallback((key: TranslationKey, params?: TranslationParams) => {
    const template = (language === "en" ? en : de)[key] ?? de[key] ?? key;
    if (!params) return template;
    return Object.entries(params).reduce(
      (text, [name, value]) => text.split(`{{${name}}}`).join(String(value)),
      template,
    );
  }, [language]);

  const value = useMemo(() => ({ language, locale: localeForLanguage(language), setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider.");
  return context;
}
