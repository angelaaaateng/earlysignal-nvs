import { buildSeed, IDS } from '../../data/seed';
import { addDays, toDateKey, weekStart } from '../dates';
import { EVENT_PROMPTS, fill, GENERIC_PROMPTS, LIBRARY } from '../library';
import { addEvent, addKid, deleteKid, logTalk, markWeekReviewed } from '../mutations';
import { monthCount, promptFeedback, topTopic, weeksWithATalk, weekView } from '../stats';
import { nearestEvent, phaseFor, suggestForEvent, suggestGeneric, tonight } from '../suggest';
import type { EventKind, Kid } from '../types';

const NOW = new Date(2026, 10, 12, 18, 30); // Thu Nov 12 2026, evening
const today = toDateKey(NOW);
const db = buildSeed(NOW);
const ava = db.kids.find((k) => k.id === IDS.ava)!;

describe('The reviewed question library', () => {
  it('every question is open-ended, under 15 words, and has a tip that names a moment or a move', () => {
    for (const p of LIBRARY) {
      expect(p.question.trim().endsWith('?')).toBe(true);
      expect(p.question.split(/\s+/).length).toBeLessThanOrEqual(15);
      expect(/^(do|does|did|is|are|was|were|can|could|will|would|have|has|had)\b/i.test(p.question)).toBe(false);
      expect(p.tip.length).toBeGreaterThan(10);
    }
    expect(new Set(LIBRARY.map((p) => p.id)).size).toBe(LIBRARY.length);
  });
  it('covers every event kind before and after', () => {
    const kinds: EventKind[] = ['test', 'tryout', 'game', 'performance', 'project', 'presentation', 'social', 'trip', 'other'];
    for (const k of kinds) {
      expect(EVENT_PROMPTS.some((p) => p.kinds!.includes(k) && p.phase === 'before')).toBe(true);
      expect(EVENT_PROMPTS.some((p) => p.kinds!.includes(k) && p.phase === 'after')).toBe(true);
    }
    expect(GENERIC_PROMPTS.length).toBeGreaterThanOrEqual(12);
  });
  it('fills the kid’s name and the event title', () => {
    expect(fill('What part of {title} feels most ready, {name}?', 'Ava', 'Math test')).toBe('What part of Math test feels most ready, Ava?');
  });
});

describe('Suggestions', () => {
  it('tonight’s starter is about the nearest event within three days, in the right phase', () => {
    const ev = nearestEvent(db.events, ava.id, today)!;
    expect(ev).toBeTruthy();
    const s = tonight(ava, db.events, db.talks, today);
    expect(s.eventId).toBe(ev.id);
    expect(s.question).toContain(ev.title);
    expect(s.phase).toBe(phaseFor(ev, today));
  });
  it('falls back to a generic starter with no events, and “try another” changes the question', () => {
    const kid: Kid = { ...ava, id: 'kid_x' };
    const a = tonight(kid, [], [], today, 0);
    const b = tonight(kid, [], [], today, 1);
    expect(a.eventId).toBeUndefined();
    expect(a.question).not.toBe(b.question);
  });
  it('skips questions asked in the last ten days and sinks ones that didn’t land', () => {
    const kid: Kid = { ...ava, id: 'kid_y' };
    const first = suggestGeneric(kid, [], today, 1)[0];
    const talks = [{ id: 't', parentId: 'p', kidId: kid.id, promptId: first.promptId, question: first.question, outcome: 'not_tonight' as const, askedAt: `${addDays(today, -2)}T18:00:00.000Z` }];
    const next = suggestGeneric(kid, talks, today, 3);
    expect(next.map((s) => s.promptId)).not.toContain(first.promptId);
  });
  it('gives three questions for an event, after it happened when the date is past', () => {
    const past = { id: 'e', kidId: ava.id, title: 'Science quiz', kind: 'test' as const, date: addDays(today, -1), createdAt: '' };
    const qs = suggestForEvent(ava, past, [], today);
    expect(qs).toHaveLength(3);
    expect(qs.every((q) => q.phase === 'after')).toBe(true);
    expect(qs[0].context).toMatch(/After Science quiz \(yesterday\)/);
  });
});

describe('Counting the parent’s effort', () => {
  it('a week view has seven days, counts talks, and marks today', () => {
    const w = weekView(db.talks, today);
    expect(w.days).toHaveLength(7);
    expect(w.days[0].date).toBe(weekStart(today));
    expect(w.days.some((d) => d.state === 'today' || (d.date === today && d.state === 'talked'))).toBe(true);
    expect(w.talks).toBeGreaterThanOrEqual(1);
  });
  it('“not tonight” is never counted as a talk', () => {
    const talks = [{ id: 't', parentId: 'p', kidId: 'k', promptId: 'g-school-1', question: 'q', outcome: 'not_tonight' as const, askedAt: `${today}T18:00:00.000Z` }];
    expect(weekView(talks, today).talks).toBe(0);
    expect(monthCount(talks, today)).toBe(0);
    expect(weeksWithATalk(talks, today).n).toBe(0);
  });
  it('top topic and prompt feedback come from talks that landed', () => {
    expect(topTopic(db.talks, ava)).toBeTruthy();
    const fb = promptFeedback(db.talks);
    expect(fb.get('test-a2')).toEqual({ asked: 1, worked: 1 });
  });
});

describe('Writes', () => {
  it('a parent adds a kid and an event, logs a talk, and cannot touch another parent’s kid', () => {
    const r1 = addKid(db, 'par_other', { name: 'Sam', grade: 7, interests: [], activities: [] }, NOW);
    const r2 = addEvent(r1.db, 'par_other', { kidId: r1.kid.id, title: 'Tryout', kind: 'tryout', date: addDays(today, 2) }, NOW);
    const r3 = logTalk(r2.db, 'par_other', { kidId: r1.kid.id, eventId: r2.event.id, promptId: 'tryout-b1', question: 'q', outcome: 'good_talk' }, NOW);
    expect(r3.talk.parentId).toBe('par_other');
    expect(() => addEvent(r3.db, 'par_other', { kidId: ava.id, title: 'x', kind: 'test', date: today }, NOW)).toThrow(/ACCESS_DENIED/);
    expect(() => logTalk(r3.db, 'par_other', { kidId: ava.id, promptId: 'g-school-1', question: 'q', outcome: 'good_talk' }, NOW)).toThrow(/ACCESS_DENIED/);
    expect(() => deleteKid(r3.db, 'par_other', ava.id)).toThrow(/ACCESS_DENIED/);
  });
  it('a name is required and the week review is idempotent', () => {
    expect(() => addKid(db, 'p', { name: '  ', grade: 6, interests: [], activities: [] }, NOW)).toThrow(/INVALID/);
    const a = markWeekReviewed(db, IDS.parent, addDays(today, 7), NOW);
    const b = markWeekReviewed(a, IDS.parent, addDays(today, 7), NOW);
    expect(b.weekReviews.length).toBe(a.weekReviews.length);
  });
});
