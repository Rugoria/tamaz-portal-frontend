export function formattingLocale(locale: string): string { return locale === 'en' ? 'en-US' : locale; }

/** Display a USD amount in dollars using the portal language; never converts its value. */
export function formatCurrency(amount: number | null | undefined, locale = 'en'): string {
  if (amount == null || !Number.isFinite(amount)) return '';
  const supportedLocale = ['en', 'en-US', 'ar', 'fr', 'es'].includes(locale) ? locale : 'en';
  return new Intl.NumberFormat(formattingLocale(supportedLocale), {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function d(iso: string | Date): Date {
  return typeof iso === "string" ? new Date(iso) : iso;
}

/** 25 Jan 2026 */
export function dateOnly(iso: string | null | undefined, locale = 'en'): string {
  if (!iso) return "";
  const x = d(iso);
  return new Intl.DateTimeFormat(formattingLocale(locale), {day: 'numeric', month: 'short', year: 'numeric'}).format(x);
}

/** 25 Jan, 11:13 */
export function dateTime(iso: string | null | undefined, locale = 'en'): string {
  if (!iso) return "";
  const x = d(iso);
  return new Intl.DateTimeFormat(formattingLocale(locale), {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false}).format(x);
}

/** "12 min ago", "Yesterday", or a date for anything older. */
export function relative(iso: string | null | undefined, locale = 'en'): string {
  if (!iso) return "";
  const x = d(iso);
  const diff = Date.now() - x.getTime();
  const min = Math.floor(diff / 60000);
  const formatter = new Intl.RelativeTimeFormat(formattingLocale(locale), {numeric: 'auto'});
  if (min < 1) return formatter.format(0, 'second');
  if (min < 60) return formatter.format(-min, 'minute');
  const hours = Math.floor(min / 60);
  if (hours < 24) return formatter.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 7) return formatter.format(-days, 'day');
  return dateOnly(iso, locale);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "Bennett, Oliver" -> sort key; the design lists patients A to Z by last name when it can tell. */
export function surnameFirst(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName.trim();
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
}
