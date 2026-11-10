/**
 * Demo data, generated relative to "now" so the app always looks current.
 * The family from the pitch: Maya (parent), Ava in 6th grade, Leo in 8th.
 */
import { addDays, toDateKey } from '../domain/dates';
import type { Db, Outcome, Talk } from '../domain/types';

export const IDS = { parent: 'par_maya', ava: 'kid_ava', leo: 'kid_leo' } as const;

export function buildSeed(now: Date): Db {
  const today = toDateKey(now);
  const dow = (now.getDay() + 6) % 7; // Mon=0
  const monday = addDays(today, -dow);
  const iso = (dayOffset: number, hour = 18) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 10, 0, 0);
    return d.toISOString();
  };
  const talk = (id: string, kidId: string, promptId: string, question: string, outcome: Outcome, dayOffset: number, eventId?: string): Talk => ({
    id, parentId: IDS.parent, kidId, eventId, promptId, question, moment: dayOffset % 2 ? 'car' : 'dinner', outcome, askedAt: iso(dayOffset),
  });

  return {
    parents: [{ id: IDS.parent, displayName: 'Maya Chen', createdAt: iso(-40) }],
    kids: [
      { id: IDS.ava, parentId: IDS.parent, name: 'Ava', grade: 6, interests: ['Soccer', 'Art', 'Animals'], activities: ['Soccer practice', 'Band'], createdAt: iso(-40) },
      { id: IDS.leo, parentId: IDS.parent, name: 'Leo', grade: 8, interests: ['Robotics', 'Gaming', 'Music'], activities: ['Robotics team'], createdAt: iso(-40) },
    ],
    events: [
      { id: 'ev_math', kidId: IDS.ava, title: 'Math test', kind: 'test', date: addDays(monday, 1), createdAt: iso(-3) },
      { id: 'ev_soccer', kidId: IDS.ava, title: 'Soccer game vs. Newton', kind: 'game', date: addDays(monday, 3), createdAt: iso(-3) },
      { id: 'ev_band', kidId: IDS.ava, title: 'Band concert', kind: 'performance', date: addDays(monday, 10), createdAt: iso(-3) },
      { id: 'ev_robot', kidId: IDS.leo, title: 'Robotics showcase', kind: 'presentation', date: addDays(monday, 4), createdAt: iso(-3) },
      { id: 'ev_dance', kidId: IDS.leo, title: 'Fall dance', kind: 'social', date: addDays(monday, 5), createdAt: iso(-3) },
      { id: 'ev_sci', kidId: IDS.ava, title: 'Science quiz', kind: 'test', date: addDays(monday, -4), createdAt: iso(-9) },
    ],
    talks: [
      talk('t1', IDS.ava, 'g-friends-1', 'Who made you laugh today?', 'good_talk', -20),
      talk('t2', IDS.ava, 'g-school-1', 'What was the best ten minutes of your day?', 'few_words', -18),
      talk('t3', IDS.leo, 'g-int-1', 'What have you been watching or listening to lately?', 'really_talked', -17),
      talk('t4', IDS.ava, 'g-ahead-1', 'What’s something you’re looking forward to this month?', 'good_talk', -13),
      talk('t5', IDS.leo, 'g-friends-2', 'Who’s someone at school you’d like to know better?', 'not_tonight', -12),
      talk('t6', IDS.ava, 'g-feel-1', 'What’s one thing that would make tomorrow better?', 'good_talk', -9),
      talk('t7', IDS.ava, 'test-b1', 'What part of Science quiz feels most ready?', 'few_words', -5, 'ev_sci'),
      talk('t8', IDS.ava, 'test-a2', 'Which part of Science quiz surprised you?', 'really_talked', -3, 'ev_sci'),
      talk('t9', IDS.leo, 'g-fam-1', 'What’s one thing we should do more of as a family?', 'good_talk', -2),
      ...(dow >= 1 ? [talk('t10', IDS.ava, 'g-friends-1', 'Who made you laugh today?', 'good_talk', -dow)] : []),
    ],
    weekReviews: [{ parentId: IDS.parent, weekStart: addDays(monday, -7), reviewedAt: iso(-7) }, { parentId: IDS.parent, weekStart: monday, reviewedAt: iso(-dow - 1) }],
  };
}
