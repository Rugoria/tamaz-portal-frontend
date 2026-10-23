'use client';
import {useLocale} from 'next-intl';
import {dateOnly, dateTime, relative, formattingLocale, formatCurrency} from '@/lib/format';
import {longDate, shortDate} from '@/lib/dates';
export function useLocalizedFormats() {
  const locale = useLocale();
  const intlLocale = formattingLocale(locale);
  return {
    currency: (value: Parameters<typeof formatCurrency>[0]) => formatCurrency(value, locale),
    dateOnly: (value: Parameters<typeof dateOnly>[0]) => dateOnly(value, locale),
    dateTime: (value: Parameters<typeof dateTime>[0]) => dateTime(value, locale),
    relative: (value: Parameters<typeof relative>[0]) => relative(value, locale),
    longDate: (value: Date) => longDate(value, locale),
    shortDate: (value: Date) => shortDate(value, locale),
    MONTH_NAMES: Array.from({length: 12}, (_, month) => new Intl.DateTimeFormat(intlLocale, {month: 'long'}).format(new Date(2026, month, 1))),
    DOW: Array.from({length: 7}, (_, day) => new Intl.DateTimeFormat(intlLocale, {weekday: 'short'}).format(new Date(2026, 0, 5 + day))),
  };
}
