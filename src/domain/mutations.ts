import type { Db, EventKind, Kid, KidEvent, Moment, Outcome, Talk } from './types';
import { weekStart } from './dates';

/**
 * All writes for the demo backend (the real one does the same in SQL). Each
 * checks the acting parent owns the row and returns a new Db.
 */
export class AccessDenied extends Error {
  constructor(msg = 'Not yours') {
    super(`ACCESS_DENIED: ${msg}`);
  }
}
let seq = 0;
export const makeId = (p: string) => `${p}_${Date.now().toString(36)}${(++seq).toString(36)}`;

const ownKid = (db: Db, parentId: string, kidId: string) => {
  const k = db.kids.find((x) => x.id === kidId);
  if (!k || k.parentId !== parentId) throw new AccessDenied('not your kid');
  return k;
};

export function addKid(db: Db, parentId: string, input: { name: string; grade: number; interests: string[]; activities: string[] }, now: Date): { db: Db; kid: Kid } {
  const name = input.name.trim();
  if (!name) throw new Error('INVALID: Add a name so starters can use it.');
  if (input.grade < 1 || input.grade > 12) throw new Error('INVALID: Grade is 1 to 12.');
  const kid: Kid = { id: makeId('kid'), parentId, name, grade: input.grade, interests: input.interests, activities: input.activities, createdAt: now.toISOString() };
  return { db: { ...db, kids: [...db.kids, kid] }, kid };
}

export function updateKid(db: Db, parentId: string, kidId: string, patch: Partial<Pick<Kid, 'name' | 'grade' | 'interests' | 'activities'>>): Db {
  ownKid(db, parentId, kidId);
  if (patch.name !== undefined && !patch.name.trim()) throw new Error('INVALID: Add a name so starters can use it.');
  return { ...db, kids: db.kids.map((k) => (k.id === kidId ? { ...k, ...patch, name: (patch.name ?? k.name).trim() } : k)) };
}

export function deleteKid(db: Db, parentId: string, kidId: string): Db {
  ownKid(db, parentId, kidId);
  return { ...db, kids: db.kids.filter((k) => k.id !== kidId), events: db.events.filter((e) => e.kidId !== kidId), talks: db.talks.filter((t) => t.kidId !== kidId) };
}

export function addEvent(db: Db, parentId: string, input: { kidId: string; title: string; kind: EventKind; date: string }, now: Date): { db: Db; event: KidEvent } {
  ownKid(db, parentId, input.kidId);
  const title = input.title.trim();
  if (!title) throw new Error('INVALID: What is it? A test, a game, a tryout…');
  const event: KidEvent = { id: makeId('ev'), kidId: input.kidId, title, kind: input.kind, date: input.date, createdAt: now.toISOString() };
  return { db: { ...db, events: [...db.events, event] }, event };
}

export function deleteEvent(db: Db, parentId: string, eventId: string): Db {
  const e = db.events.find((x) => x.id === eventId);
  if (!e) throw new AccessDenied('not your event');
  ownKid(db, parentId, e.kidId);
  return { ...db, events: db.events.filter((x) => x.id !== eventId) };
}

export function logTalk(db: Db, parentId: string, input: { kidId: string; eventId?: string; promptId: string; question: string; moment?: Moment; outcome: Outcome }, now: Date): { db: Db; talk: Talk } {
  ownKid(db, parentId, input.kidId);
  const talk: Talk = { id: makeId('talk'), parentId, ...input, askedAt: now.toISOString() };
  return { db: { ...db, talks: [...db.talks, talk] }, talk };
}

export function markWeekReviewed(db: Db, parentId: string, today: string, now: Date): Db {
  const ws = weekStart(today);
  if (db.weekReviews.some((w) => w.parentId === parentId && w.weekStart === ws)) return db;
  return { ...db, weekReviews: [...db.weekReviews, { parentId, weekStart: ws, reviewedAt: now.toISOString() }] };
}
