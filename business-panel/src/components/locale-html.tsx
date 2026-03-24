'use client';
import { useEffect } from 'react';
import { useLocaleStore } from '@/lib/locale-store';

export function LocaleHtml() {
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
  }, [locale]);
  return null;
}
