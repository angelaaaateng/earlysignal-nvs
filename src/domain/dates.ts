import type { DateKey } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(k: DateKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: DateKey, n: number): DateKey {
  const d = fromDateKey(k);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86_400_000);
}

/** Monday of the week containing `k`. */
export function weekStart(k: DateKey): DateKey {
  const d = fromDateKey(k);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  return addDays(k, -dow);
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekdayShort(k: DateKey): string {
  return WEEKDAYS[fromDateKey(k).getDay()];
}

export function weekdayLong(k: DateKey): string {
  return WEEKDAYS_LONG[fromDateKey(k).getDay()];
}

export function monthDay(k: DateKey): string {
  const d = fromDateKey(k);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Oct 27–31" or "Oct 27–Nov 2". */
export function rangeLabel(from: DateKey, to: DateKey): string {
  const a = fromDateKey(from);
  const b = fromDateKey(to);
  const end = a.getMonth() === b.getMonth() ? String(b.getDate()) : monthDay(to);
  return `${monthDay(from)}–${end}`;
}

export function partOfDay(now: Date): 'morning' | 'afternoon' | 'evening' {
  const h = now.getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

/** "today", "tomorrow", "Friday", or "Nov 12". */
export function dueLabel(today: DateKey, due: DateKey): string {
  const n = daysBetween(today, due);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n > 1 && n < 7) return weekdayLong(due);
  return monthDay(due);
}

/** Whole years between a birth date and `on`. */
export function ageOn(birthDate: DateKey, on: DateKey): number {
  const b = fromDateKey(birthDate);
  const t = fromDateKey(on);
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}
