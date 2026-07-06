import { create } from 'zustand';
import { detectBrowserLocale, storeLocale } from './detectLocale';
import type { Locale } from './types';

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleStore>((set) => ({
  locale: detectBrowserLocale(),
  setLocale: (locale) => {
    storeLocale(locale);
    set({ locale });
  },
}));
