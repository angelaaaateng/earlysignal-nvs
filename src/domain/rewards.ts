import { addDays } from './dates';
import type { Db, DateKey } from './types';

export const ACORNS_PER_CHECK_IN = 5;

/** Acorn total needed to reach each Burrow level (index 0 = level 1). */
export const LEVEL_THRESHOLDS = [0, 20, 48, 160, 320, 520, 800];
/** The room unlocked when you reach level index+1. */
export const ROOMS = ['den', 'snack nook', 'reading corner', 'garden room', 'stargazing loft', 'river dock', 'treehouse'];

export function acornBalance(db: Db, studentId: string): number {
  return db.acorns.filter((a) => a.studentId === studentId).reduce((s, a) => s + a.amount, 0);
}

export function checkInDates(db: Db, studentId: string): Set<DateKey> {
  return new Set(db.checkIns.filter((c) => c.studentId === studentId).map((c) => c.date));
}

/**
 * Consecutive days with a check-in, ending today. If today has no check-in
 * yet the streak still counts through yesterday, so it "stays safe" until
 * the day is over.
 */
export function currentStreak(db: Db, studentId: string, today: DateKey): number {
  const dates = checkInDates(db, studentId);
  let day = dates.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (dates.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export interface BurrowLevel {
  level: number;
  /** 0–1 progress toward the next level. */
  progress: number;
  acornsToNext: number;
  nextRoom: string;
}

export function burrowLevel(acorns: number): BurrowLevel {
  let i = 0;
  while (i + 1 < LEVEL_THRESHOLDS.length && acorns >= LEVEL_THRESHOLDS[i + 1]) i++;
  const lo = LEVEL_THRESHOLDS[i];
  const hi = LEVEL_THRESHOLDS[i + 1] ?? lo;
  const done = hi === lo;
  return {
    level: i + 1,
    progress: done ? 1 : (acorns - lo) / (hi - lo),
    acornsToNext: done ? 0 : hi - acorns,
    nextRoom: ROOMS[Math.min(i + 1, ROOMS.length - 1)],
  };
}
