import { addDays, daysBetween, weekStart } from './dates';
import { TOPIC_LABEL, promptById } from './library';
import type { DateKey, Kid, Talk } from './types';

/**
 * Counts for the parent's own effort. Never a score on the relationship, never
 * a streak to protect (design system: "Invite, never grade").
 */
export type DayState = 'talked' | 'today' | 'open';

export interface WeekView {
  weekStart: DateKey;
  days: { date: DateKey; label: string; name: string; state: DayState; count: number }[];
  talks: number;
  realTalks: number;
}

const LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const NAME = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function weekView(talks: Talk[], today: DateKey, start = weekStart(today)): WeekView {
  const counted = talks.filter((t) => t.outcome !== 'not_tonight');
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const count = counted.filter((t) => t.askedAt.slice(0, 10) === date).length;
    const state: DayState = count > 0 ? 'talked' : date === today ? 'today' : 'open';
    return { date, label: LETTER[i], name: NAME[i], state, count };
  });
  const inWeek = counted.filter((t) => daysBetween(start, t.askedAt.slice(0, 10)) >= 0 && daysBetween(start, t.askedAt.slice(0, 10)) < 7);
  return { weekStart: start, days, talks: inWeek.length, realTalks: inWeek.filter((t) => t.outcome === 'good_talk' || t.outcome === 'really_talked').length };
}

export function monthCount(talks: Talk[], today: DateKey) {
  const ym = today.slice(0, 7);
  return talks.filter((t) => t.outcome !== 'not_tonight' && t.askedAt.startsWith(ym)).length;
}

/** The topic this kid responded to best, by good talks. */
export function topTopic(talks: Talk[], kid?: Kid): string | undefined {
  const tally = new Map<string, number>();
  for (const t of talks) {
    if (kid && t.kidId !== kid.id) continue;
    if (t.outcome !== 'good_talk' && t.outcome !== 'really_talked') continue;
    const topic = promptById(t.promptId)?.topic;
    if (topic) tally.set(topic, (tally.get(topic) ?? 0) + 1);
  }
  const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? TOPIC_LABEL[best[0] as keyof typeof TOPIC_LABEL] : undefined;
}

/** "3 of the last 4 weeks had a talk": a count, not a streak. */
export function weeksWithATalk(talks: Talk[], today: DateKey, weeks = 4) {
  const start = weekStart(today);
  let n = 0;
  for (let w = 0; w < weeks; w++) {
    const ws = addDays(start, -7 * w);
    if (talks.some((t) => t.outcome !== 'not_tonight' && daysBetween(ws, t.askedAt.slice(0, 10)) >= 0 && daysBetween(ws, t.askedAt.slice(0, 10)) < 7)) n++;
  }
  return { n, of: weeks };
}

/** Prompt feedback the team can read: which library questions worked, per outcome. */
export function promptFeedback(talks: Talk[]) {
  const m = new Map<string, { asked: number; worked: number }>();
  for (const t of talks) {
    const r = m.get(t.promptId) ?? { asked: 0, worked: 0 };
    r.asked++;
    if (t.outcome === 'good_talk' || t.outcome === 'really_talked') r.worked++;
    m.set(t.promptId, r);
  }
  return m;
}
