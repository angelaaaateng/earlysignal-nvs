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
  const dow = (fromDateKey(k).getDay() + 6) % 7;
  return addDays(k, -dow);
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function weekdayShort(k: DateKey) {
  return WEEKDAYS[fromDateKey(k).getDay()];
}
export function weekdayLong(k: DateKey) {
  return WEEKDAYS_LONG[fromDateKey(k).getDay()];
}
export function monthDay(k: DateKey) {
  const d = fromDateKey(k);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
export function rangeLabel(from: DateKey, to: DateKey) {
  const a = fromDateKey(from);
  const b = fromDateKey(to);
  return `${monthDay(from)}–${a.getMonth() === b.getMonth() ? String(b.getDate()) : monthDay(to)}`;
}
export function partOfDay(now: Date): 'morning' | 'afternoon' | 'evening' {
  const h = now.getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}
/** "today", "tomorrow", "yesterday", "Friday", "last Friday" or "Nov 12". */
export function relativeDay(today: DateKey, k: DateKey): string {
  const n = daysBetween(today, k);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 1 && n < 7) return weekdayLong(k);
  if (n < -1 && n > -7) return `last ${weekdayLong(k)}`;
  return monthDay(k);
}
