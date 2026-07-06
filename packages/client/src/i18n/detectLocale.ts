import { DEFAULT_LOCALE, isLocale, type Locale } from './types';

const STORAGE_KEY = 'lotm-locale';

/** Map browser language tags to supported locales. */
function normalizeLanguageTag(tag: string): Locale | null {
  const lower = tag.toLowerCase().replace('_', '-');

  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('en')) return 'en-US';

  return null;
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

  const stored = readStoredLocale();
  if (stored) return stored;

  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const tag of languages) {
    const locale = normalizeLanguageTag(tag);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}

export function readStoredLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isLocale(raw)) return raw;
  } catch {
    /* private mode */
  }
  return null;
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}
