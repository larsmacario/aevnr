export const APP_LANGUAGES = ["de", "en"] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "aevnr:language";

export function normalizeAppLanguage(value: unknown): AppLanguage | null {
  if (typeof value !== "string") return null;
  const language = value.trim().toLowerCase().split(/[-_]/)[0];
  return language === "de" || language === "en" ? language : null;
}

export function detectAppLanguage(): AppLanguage {
  if (typeof window !== "undefined") {
    try {
      const stored = normalizeAppLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
      if (stored) return stored;
    } catch {
      // Storage can be unavailable in private browser contexts.
    }
  }

  if (typeof navigator !== "undefined") {
    const candidates = [...(navigator.languages ?? []), navigator.language];
    for (const candidate of candidates) {
      const language = normalizeAppLanguage(candidate);
      if (language) return language;
    }
  }

  return "de";
}

export function rememberAppLanguage(language: AppLanguage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The profile remains the durable source when local storage is unavailable.
  }
}

export function localeForLanguage(language: AppLanguage): string {
  return language === "de" ? "de-DE" : "en-US";
}
