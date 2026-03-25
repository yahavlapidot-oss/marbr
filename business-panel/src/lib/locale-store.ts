import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, type Locale, type TranslationKey } from './i18n/translations';

interface LocaleStore {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set, get) => ({
      locale: 'he',
      setLocale: (locale) => { set({ locale }); window.location.reload(); },
      t: (key) => translations[get().locale][key] as string,
    }),
    { name: 'mrbar-locale' },
  ),
);
