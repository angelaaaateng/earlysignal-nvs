import { addDays, toDateKey } from './dates';
import type { DateKey, EventKind } from './types';

/**
 * Turning a pasted newsletter, a syllabus line or a calendar feed into event
 * candidates the parent approves. Pure and dependency-free so the demo works
 * offline; the real backend adds Claude for photos and messy text.
 */
export interface EventCandidate {
  title: string;
  kind: EventKind;
  date: DateKey;
  source: 'text' | 'photo' | 'calendar';
}

const KIND_WORDS: [RegExp, EventKind][] = [
  [/\b(test|quiz|exam|midterm|final|assessment)\b/i, 'test'],
  [/\b(tryout|try-out|audition|callbacks?)\b/i, 'tryout'],
  [/\b(game|match|meet|tournament|scrimmage|race)\b/i, 'game'],
  [/\b(concert|recital|performance|show|play|musical|opening night)\b/i, 'performance'],
  [/\b(presentation|present|speech|demo day|showcase|science fair)\b/i, 'presentation'],
  [/\b(project|essay|paper|report|lab|portfolio)\b.*\b(due)\b|\bdue\b.*\b(project|essay|paper|report|lab)\b/i, 'project'],
  [/\b(dance|party|sleepover|birthday|social|homecoming|formal)\b/i, 'social'],
  [/\b(field trip|trip|excursion|overnight|camp)\b/i, 'trip'],
];

export function guessKind(text: string): EventKind {
  for (const [re, kind] of KIND_WORDS) if (re.test(text)) return kind;
  return 'other';
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const WEEKDAYS: Record<string, number> = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };

/** Finds a date in a line of text, relative to `today`. Returns undefined if none. */
export function findDate(line: string, today: DateKey): DateKey | undefined {
  const base = new Date(today + 'T12:00:00');
  const iso = line.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return toDateKey(new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const us = line.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (us) {
    const y = us[3] ? Number(us[3].length === 2 ? '20' + us[3] : us[3]) : base.getFullYear();
    const d = new Date(y, Number(us[1]) - 1, Number(us[2]));
    if (!us[3] && d.getTime() < base.getTime() - 30 * 86400000) d.setFullYear(y + 1);
    return toDateKey(d);
  }
  const mon = line.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?/i);
  if (mon) {
    const y = mon[3] ? Number(mon[3]) : base.getFullYear();
    const d = new Date(y, MONTHS[mon[1].toLowerCase().slice(0, 4) === 'sept' ? 'sept' : mon[1].toLowerCase().slice(0, 3)], Number(mon[2]));
    if (!mon[3] && d.getTime() < base.getTime() - 30 * 86400000) d.setFullYear(y + 1);
    return toDateKey(d);
  }
  if (/\btomorrow\b/i.test(line)) return addDays(today, 1);
  if (/\btoday\b/i.test(line)) return today;
  const wd = line.match(/\b(next\s+)?(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)[a-z]*\b/i);
  if (wd) {
    const target = WEEKDAYS[wd[2].toLowerCase()];
    let n = (target - base.getDay() + 7) % 7;
    if (n === 0) n = 7;
    if (wd[1]) n += 7;
    return addDays(today, n);
  }
  return undefined;
}

/** One candidate per line that has both a date and some words. */
export function parseText(text: string, today: DateKey): EventCandidate[] {
  const out: EventCandidate[] = [];
  for (const raw of text.split(/\n|•|;|\. (?=[A-Z])/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (line.length < 4) continue;
    const date = findDate(line, today);
    if (!date) continue;
    const title = line
      .replace(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b|\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?(,?\s*20\d{2})?|\b(next\s+)?(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)[a-z]*\b|\btomorrow\b|\btoday\b|\bon\b|\bat\b\s*\d{1,2}(:\d{2})?\s*(am|pm)?/gi, ' ')
      .replace(/[\s:,–-]+$/g, '')
      .replace(/^[\s:,–-]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title) continue;
    out.push({ title: title.slice(0, 80), kind: guessKind(line), date, source: 'text' });
  }
  return dedupe(out);
}

/** Minimal iCalendar: SUMMARY + DTSTART per VEVENT, within a window around today. */
export function parseIcs(ics: string, today: DateKey, source: EventCandidate['source'] = 'calendar'): EventCandidate[] {
  const out: EventCandidate[] = [];
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  const min = addDays(today, -7);
  const max = addDays(today, 60);
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const summary = /SUMMARY[^:]*:(.*)/.exec(block)?.[1]?.trim();
    const dt = /DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/.exec(block);
    if (!summary || !dt) continue;
    const date = `${dt[1]}-${dt[2]}-${dt[3]}`;
    if (date < min || date > max) continue;
    out.push({ title: summary.replace(/\\,/g, ',').slice(0, 80), kind: guessKind(summary), date, source });
  }
  return dedupe(out);
}

function dedupe(xs: EventCandidate[]) {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = `${x.title.toLowerCase()}|${x.date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
