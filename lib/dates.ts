// Date helpers for the appointment screens. The backend sends universal instants (UTC); everything here shows them in the
// viewer's own time zone, because that is what the browser's Date does.

export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
import {formattingLocale} from './format';

/** Monday-first day index (0 = Mon). */
export function dowIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function mondayOf(d: Date): Date {
  return addDays(startOfDay(d), -dowIndex(d));
}

/** Cells for a month grid: leading blanks, then each day. */
export function monthCells(month: Date): (Date | null)[] {
  const first = startOfMonth(month);
  const lead = dowIndex(first);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 1; i <= days; i++) cells.push(new Date(month.getFullYear(), month.getMonth(), i));
  return cells;
}

/** Tuesday 14 October */
export function longDate(d: Date, locale = 'en'): string {
  return new Intl.DateTimeFormat(formattingLocale(locale), {weekday: 'long', day: 'numeric', month: 'long'}).format(d);
}

/** Tue 14 Oct 2026 */
export function shortDate(d: Date, locale = 'en'): string {
  return new Intl.DateTimeFormat(formattingLocale(locale), {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'}).format(d);
}

/** 10:30 (the viewer's time) */
export function hhmm(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 10:30 to 11:00 */
export function timeRange(startIso: string, endIso: string): string {
  return `${hhmm(startIso)}–${hhmm(endIso)}`;
}

/** The viewer's IANA zone, for example Asia/Dubai. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Combine a local day ("2026-10-14") and a local time ("10:30") into a Date. */
export function localDateTime(day: string, time: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Local "yyyy-mm-dd" for an input[type=date]. */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
