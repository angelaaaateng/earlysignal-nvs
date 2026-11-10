import { daysBetween, relativeDay } from './dates';
import { EVENT_PROMPTS, fill, GENERIC_PROMPTS, type Phase, type Prompt } from './library';
import type { Arm, DateKey, Kid, KidEvent, Talk } from './types';

/**
 * Picks questions from the reviewed library for one kid. Deterministic given
 * the same inputs, so the demo and the tests are stable. "Learns" in the MVP
 * sense: prompts this kid rated "Not tonight" sink; ones that led to a real
 * talk rise; anything asked in the last 10 days is skipped.
 */
export interface Suggestion {
  promptId: string;
  question: string;
  tip: string;
  topic: Prompt['topic'];
  eventId?: string;
  /** "Before Tuesday's math test" or "Looking ahead". */
  context: string;
  phase?: Phase;
}

function score(p: Prompt, kid: Kid, talks: Talk[], today: DateKey): number {
  let s = 10 - p.depth;
  for (const t of talks) {
    if (t.kidId !== kid.id || t.promptId !== p.id) continue;
    if (daysBetween(t.askedAt.slice(0, 10), today) <= 10) s -= 100;
    if (t.outcome === 'not_tonight') s -= 3;
    if (t.outcome === 'really_talked' || t.outcome === 'good_talk') s += 2;
  }
  // A kid with a few talks behind them gets the deeper questions.
  const kidTalks = talks.filter((t) => t.kidId === kid.id && t.outcome !== 'not_tonight').length;
  if (kidTalks >= 4 && p.depth === 2) s += 2;
  // Interest-matching: a friends question for a social kid, interests for a hobbyist.
  if (p.topic === 'interests' && kid.interests.length > 0) s += 1;
  return s;
}

function stable<T extends { id: string }>(xs: T[], seed: string) {
  // Rotate by a hash of the seed so "Try another" and different days vary without randomness.
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const n = xs.length;
  return n ? xs.map((_, i) => xs[(i + h) % n]) : xs;
}

export function phaseFor(event: KidEvent, today: DateKey): Phase | null {
  const n = daysBetween(today, event.date);
  if (n >= 0 && n <= 3) return 'before';
  if (n < 0 && n >= -3) return 'after';
  return null;
}

/** Up to `n` questions for one event, in the right phase for today. */
export function suggestForEvent(kid: Kid, event: KidEvent, talks: Talk[], today: DateKey, n = 3, variant = 0): Suggestion[] {
  const phase = phaseFor(event, today) ?? (daysBetween(today, event.date) > 0 ? 'before' : 'after');
  const pool = EVENT_PROMPTS.filter((p) => p.kinds!.includes(event.kind) && p.phase === phase);
  const ranked = [...pool].sort((a, b) => score(b, kid, talks, today) - score(a, kid, talks, today) || a.id.localeCompare(b.id));
  const when = relativeDay(today, event.date);
  const context = phase === 'before' ? `Before ${event.title} (${when})` : `After ${event.title} (${when})`;
  return stable(ranked, `${event.id}:${variant}`)
    .slice(0, n)
    .map((p) => ({ promptId: p.id, question: fill(p.question, kid.name, event.title), tip: p.tip, topic: p.topic, eventId: event.id, context, phase }));
}

/** Generic starters when nothing is on the calendar. */
export function suggestGeneric(kid: Kid, talks: Talk[], today: DateKey, n = 3, variant = 0): Suggestion[] {
  const ranked = [...GENERIC_PROMPTS].sort((a, b) => score(b, kid, talks, today) - score(a, kid, talks, today) || a.id.localeCompare(b.id));
  return stable(ranked, `${kid.id}:${today}:${variant}`)
    .slice(0, n)
    .map((p) => ({ promptId: p.id, question: fill(p.question, kid.name), tip: p.tip, topic: p.topic, context: 'For any evening' }));
}

/** The event tonight's starter should be about: the nearest one within three days, upcoming first. */
export function nearestEvent(events: KidEvent[], kidId: string, today: DateKey): KidEvent | undefined {
  return events
    .filter((e) => e.kidId === kidId && phaseFor(e, today))
    .sort((a, b) => Math.abs(daysBetween(today, a.date)) - Math.abs(daysBetween(today, b.date)) || a.date.localeCompare(b.date))[0];
}

/**
 * The pilot experiment (evidence brief §83): within each family, alternate
 * event-specific and generic starters across days. Deterministic from the parent
 * and the date, so both arms get comparable moments and nobody can game it.
 */
export function armFor(parentId: string, today: DateKey, pilotMode: boolean | undefined, hasEvent: boolean): Arm {
  if (!hasEvent) return 'generic';
  if (!pilotMode) return 'event';
  let h = 0;
  for (const c of `${parentId}:${today}`) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return h % 2 === 0 ? 'event' : 'generic';
}

/** Tonight's starter for one kid, in the arm the experiment assigns (or event-first when pilot mode is off). */
export function tonight(kid: Kid, events: KidEvent[], talks: Talk[], today: DateKey, variant = 0, arm?: Arm): Suggestion & { arm: Arm } {
  const ev = nearestEvent(events, kid.id, today);
  const chosen = arm ?? (ev ? 'event' : 'generic');
  const list = ev && chosen === 'event' ? suggestForEvent(kid, ev, talks, today, 1, variant) : [];
  const s = list[0] ?? suggestGeneric(kid, talks, today, 1, variant)[0];
  return { ...s, arm: s.eventId ? 'event' : 'generic' };
}
