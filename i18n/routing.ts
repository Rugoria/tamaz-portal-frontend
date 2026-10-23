import {defineRouting} from 'next-intl/routing';

export const locales = ['en', 'ar', 'fr', 'es'] as const;
export type Locale = (typeof locales)[number];
export const languageCookie = 'tz_language';
export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
  // Only the explicit, opt-in preference endpoint may write this cookie.
  localeCookie: false,
});
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale);
}
