import { buildSeed, IDS } from '../../data/seed';
import { addDays, toDateKey } from '../dates';
import { findDate, guessKind, parseIcs, parseText } from '../importEvents';
import { SECOND_MOVE, LIBRARY } from '../library';
import { logTalk, recordImpression, setNudge } from '../mutations';
import { weekView } from '../stats';
import { armFor, tonight } from '../suggest';
import { COUNTS_AS_TALK, OUTCOME_RATING } from '../types';

const NOW = new Date(2026, 10, 12, 18, 30);
const today = toDateKey(NOW);
const db = buildSeed(NOW);
const ava = db.kids.find((k) => k.id === IDS.ava)!;

describe('Second move', () => {
  it('every topic in the library has a follow-up question and a listening tip', () => {
    for (const p of LIBRARY) {
      const m = SECOND_MOVE[p.topic];
      expect(m.followUp.endsWith('?')).toBe(true);
      expect(m.listen.length).toBeGreaterThan(20);
    }
  });
  it('“Wrong moment” is a valid outcome that never counts as a talk', () => {
    expect(COUNTS_AS_TALK.wrong_moment).toBe(false);
    expect(OUTCOME_RATING.wrong_moment).toBeLessThan(OUTCOME_RATING.few_words);
    const talks = [{ id: 't', parentId: 'p', kidId: 'k', promptId: 'g-school-1', question: 'q', outcome: 'wrong_moment' as const, askedAt: `${today}T18:00:00.000Z` }];
    expect(weekView(talks, today).talks).toBe(0);
  });
});

describe('The experiment', () => {
  it('assigns a deterministic arm per parent and day, only when pilot mode is on and an event exists', () => {
    const a = armFor('par_1', today, true, true);
    expect(a).toBe(armFor('par_1', today, true, true));
    expect(armFor('par_1', today, false, true)).toBe('event');
    expect(armFor('par_1', today, true, false)).toBe('generic');
    const arms = new Set(Array.from({ length: 14 }, (_, i) => armFor('par_1', addDays(today, i), true, true)));
    expect(arms.size).toBe(2);
  });
  it('a generic-arm starter ignores the event even when one is near', () => {
    const s = tonight(ava, db.events, db.talks, today, 0, 'generic');
    expect(s.arm).toBe('generic');
    expect(s.eventId).toBeUndefined();
    const e = tonight(ava, db.events, db.talks, today, 0, 'event');
    expect(e.arm).toBe('event');
  });
  it('an impression is recorded once per kid, prompt and day, and marked asked when the talk is logged', () => {
    const d1 = recordImpression(db, IDS.parent, { kidId: ava.id, promptId: 'g-school-1', arm: 'generic', shownOn: today });
    const d2 = recordImpression(d1, IDS.parent, { kidId: ava.id, promptId: 'g-school-1', arm: 'generic', shownOn: today });
    expect(d2.impressions.length).toBe(1);
    const d3 = logTalk(d2, IDS.parent, { kidId: ava.id, promptId: 'g-school-1', question: 'q', outcome: 'good_talk', arm: 'generic' }, NOW).db;
    expect(d3.impressions[0].asked).toBe(true);
    expect(() => recordImpression(db, 'someone_else', { kidId: ava.id, promptId: 'x', arm: 'event', shownOn: today })).toThrow(/ACCESS_DENIED/);
  });
});

describe('Nudge settings', () => {
  it('stores the hour and time zone and rejects a bad hour', () => {
    const d = setNudge(db, IDS.parent, { enabled: true, hour: 17, tz: 'America/Chicago' });
    expect(d.parents[0].nudge).toEqual({ enabled: true, hour: 17, tz: 'America/Chicago' });
    expect(() => setNudge(db, IDS.parent, { enabled: true, hour: 25, tz: 'UTC' })).toThrow(/INVALID/);
  });
});

describe('Import parsing', () => {
  it('reads dates in the shapes parents paste', () => {
    expect(findDate('Math test Thursday', today)).toBe(addDays(today, 7)); // today is a Thursday: next Thursday
    expect(findDate('Soccer vs. Newton 11/14', today)).toBe('2026-11-14');
    expect(findDate('Band concert Nov 20', today)).toBe('2026-11-20');
    expect(findDate('Field trip 2026-12-02', today)).toBe('2026-12-02');
    expect(findDate('Quiz tomorrow', today)).toBe(addDays(today, 1));
    expect(findDate('No date here', today)).toBeUndefined();
  });
  it('guesses the event kind from words a newsletter uses', () => {
    expect(guessKind('Unit 4 math test')).toBe('test');
    expect(guessKind('Basketball tryouts')).toBe('tryout');
    expect(guessKind('Winter band concert')).toBe('performance');
    expect(guessKind('Science project due')).toBe('project');
    expect(guessKind('Fall dance')).toBe('social');
    expect(guessKind('Picture day')).toBe('other');
  });
  it('turns pasted lines into candidates with the date stripped from the title', () => {
    const c = parseText('Math test Nov 20\nSoccer vs. Newton 11/14 at 4pm\nNo date on this line\nBand concert next Friday', today);
    expect(c.map((x) => x.title)).toEqual(['Math test', 'Soccer vs. Newton', 'Band concert']);
    expect(c[0]).toMatchObject({ kind: 'test', date: '2026-11-20', source: 'text' });
  });
  it('reads an iCalendar feed and keeps only events near today', () => {
    const ics = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Science quiz\nDTSTART;VALUE=DATE:20261118\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:Spring recital\nDTSTART:20270501T180000Z\nEND:VEVENT\nEND:VCALENDAR';
    const c = parseIcs(ics, today);
    expect(c).toEqual([{ title: 'Science quiz', kind: 'test', date: '2026-11-18', source: 'calendar' }]);
  });
});
