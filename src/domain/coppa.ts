import { AccessDenied, familiesOfParent, requireRole } from './access';
import { ageOn, toDateKey } from './dates';
import { makeId } from './ids';
import type { Db, DateKey, ParentalConsent, SharingSettings, User } from './types';

/** COPPA applies to children under 13. */
export const COPPA_AGE = 13;
export const CONSENT_NOTICE_VERSION = '2026-11-v1';

export class ConsentRequiredError extends Error {
  constructor(message = 'Verifiable parental consent is required before creating an account for a child under 13.') {
    super(message);
    this.name = 'ConsentRequiredError';
  }
}

export function requiresParentalConsent(birthDate: DateKey, today: DateKey): boolean {
  return ageOn(birthDate, today) < COPPA_AGE;
}

/** Defaults the student sees on first run; they can change any of them. */
export function defaultSharing(studentId: string, at: string): SharingSettings {
  return { studentId, moodTrend: true, questsFinished: true, streakAndLevel: true, upcomingTests: false, updatedAt: at };
}

export interface ConsentInput {
  familyId: string;
  childFirstName: string;
  childBirthDate: DateKey;
  method: ParentalConsent['method'];
  agreedToNotice: boolean;
}

export function recordParentalConsent(db: Db, parentId: string, input: ConsentInput, now: Date): { db: Db; consent: ParentalConsent } {
  requireRole(db, parentId, 'parent');
  if (!familiesOfParent(db, parentId).some((f) => f.id === input.familyId)) throw new AccessDenied('Not your family');
  if (!input.agreedToNotice) throw new ConsentRequiredError('The parent must agree to the privacy notice.');
  if (!input.childFirstName.trim()) throw new Error('Child’s first name is required.');
  const consent: ParentalConsent = {
    id: makeId('consent'),
    parentId,
    familyId: input.familyId,
    childFirstName: input.childFirstName.trim(),
    childBirthDate: input.childBirthDate,
    method: input.method,
    noticeVersion: CONSENT_NOTICE_VERSION,
    grantedAt: now.toISOString(),
  };
  return { db: { ...db, consents: [...db.consents, consent] }, consent };
}

export interface NewStudentInput {
  familyId: string;
  firstName: string;
  lastName: string;
  birthDate: DateKey;
  grade?: number;
  /** Required when the child is under 13. */
  consentId?: string;
}

/**
 * The only way a student account comes into existence. A parent creates it,
 * and for an under-13 child a matching, unused, unrevoked consent must exist
 * first. There is no code path that creates the account and backfills consent.
 */
export function createStudentAccount(db: Db, parentId: string, input: NewStudentInput, now: Date): { db: Db; student: User } {
  requireRole(db, parentId, 'parent');
  const family = familiesOfParent(db, parentId).find((f) => f.id === input.familyId);
  if (!family) throw new AccessDenied('Not your family');
  const today = toDateKey(now);

  let consent: ParentalConsent | undefined;
  if (requiresParentalConsent(input.birthDate, today)) {
    consent = db.consents.find((c) => c.id === input.consentId);
    if (
      !consent ||
      consent.revokedAt ||
      consent.studentId ||
      consent.familyId !== family.id ||
      !family.parents.some((p) => p.userId === consent!.parentId) ||
      consent.childBirthDate !== input.birthDate
    ) {
      throw new ConsentRequiredError();
    }
  }

  const at = now.toISOString();
  const student: User = {
    id: makeId('stu'),
    role: 'student',
    displayName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
    birthDate: input.birthDate,
    grade: input.grade,
    createdAt: at,
  };
  return {
    student,
    db: {
      ...db,
      users: [...db.users, student],
      families: db.families.map((f) => (f.id === family.id ? { ...f, studentIds: [...f.studentIds, student.id] } : f)),
      consents: consent ? db.consents.map((c) => (c.id === consent!.id ? { ...c, studentId: student.id } : c)) : db.consents,
      sharing: [...db.sharing, defaultSharing(student.id, at)],
    },
  };
}
