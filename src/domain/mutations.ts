import { AccessDenied, isParentOf, requireRole, userById } from './access';
import { assertAdminCanActOn } from './admin';
import { toDateKey } from './dates';
import { makeId } from './ids';
import { ACORNS_PER_CHECK_IN } from './rewards';
import type { QuestPlan } from './questTemplates';
import type { CheckInScore, Db, SharingKey } from './types';

/**
 * All writes. Each takes the acting user's id and refuses anything that user
 * is not allowed to do. They return a new Db and never mutate the old one.
 */

export function submitCheckIn(db: Db, studentId: string, score: CheckInScore, note: string, now: Date): Db {
  requireRole(db, studentId, 'student');
  if (![1, 2, 3, 4, 5].includes(score)) throw new Error('Score must be 1–5');
  const today = toDateKey(now);
  const at = now.toISOString();
  const existing = db.checkIns.find((c) => c.studentId === studentId && c.date === today);
  const checkInId = existing?.id ?? makeId('ci');
  const trimmed = note.trim();

  const checkIns = existing
    ? db.checkIns.map((c) => (c.id === existing.id ? { ...c, score } : c))
    : [...db.checkIns, { id: checkInId, studentId, date: today, score, createdAt: at }];

  const otherNotes = db.privateNotes.filter((n) => n.checkInId !== checkInId);
  const privateNotes = trimmed
    ? [...otherNotes, { id: makeId('note'), checkInId, studentId, text: trimmed, createdAt: at }]
    : otherNotes;

  // Acorns once per day, however many times the student updates the score.
  const acorns = existing
    ? db.acorns
    : [...db.acorns, { id: makeId('ac'), studentId, amount: ACORNS_PER_CHECK_IN, reason: 'check_in' as const, refId: checkInId, at }];

  return { ...db, checkIns, privateNotes, acorns };
}

export function toggleQuestStep(db: Db, studentId: string, stepId: string, now: Date): Db {
  requireRole(db, studentId, 'student');
  const step = db.questSteps.find((s) => s.id === stepId);
  const quest = step && db.quests.find((q) => q.id === step.questId);
  if (!step || !quest || quest.studentId !== studentId) throw new AccessDenied('Not your quest');
  const at = now.toISOString();

  const questSteps = db.questSteps.map((s) => (s.id === stepId ? { ...s, doneAt: s.doneAt ? undefined : at } : s));
  const allDone = questSteps.filter((s) => s.questId === quest.id).every((s) => s.doneAt);

  let { quests, acorns } = db;
  if (allDone && !quest.completedAt) {
    quests = quests.map((q) => (q.id === quest.id ? { ...q, completedAt: at } : q));
    acorns = [...acorns, { id: makeId('ac'), studentId, amount: quest.acorns, reason: 'quest', refId: quest.id, at }];
  } else if (!allDone && quest.completedAt) {
    // Un-ticking a finished quest takes its acorns back.
    quests = quests.map((q) => (q.id === quest.id ? { ...q, completedAt: undefined } : q));
    acorns = acorns.filter((a) => !(a.reason === 'quest' && a.refId === quest.id));
  }
  return { ...db, questSteps, quests, acorns };
}

/** Only the student changes their own sharing settings. */
export function setSharing(db: Db, viewerId: string, studentId: string, key: SharingKey, value: boolean, now: Date): Db {
  const me = requireRole(db, viewerId, 'student');
  if (me.id !== studentId) throw new AccessDenied('Only the student controls sharing');
  return {
    ...db,
    sharing: db.sharing.map((s) => (s.studentId === studentId ? { ...s, [key]: value, updatedAt: now.toISOString() } : s)),
  };
}

export function sendCheer(db: Db, parentId: string, studentId: string, now: Date): Db {
  requireRole(db, parentId, 'parent');
  if (!isParentOf(db, parentId, studentId)) throw new AccessDenied('Not this student’s parent');
  return { ...db, cheers: [...db.cheers, { id: makeId('cheer'), fromParentId: parentId, studentId, sentAt: now.toISOString() }] };
}

export function adminSuggestCoach(db: Db, adminId: string, studentId: string, now: Date): Db {
  const admin = requireRole(db, adminId, 'admin');
  assertAdminCanActOn(db, adminId, studentId);
  const fam = db.families.find((f) => f.studentIds.includes(studentId))!;
  if (!userById(db, studentId)) throw new Error('Unknown student');
  return {
    ...db,
    referrals: [
      ...db.referrals,
      {
        id: makeId('ref'),
        familyId: fam.id,
        studentId,
        orgId: admin.orgId!,
        target: 'ef_coach',
        targetLabel: 'EF coach',
        status: 'requested',
        createdAt: now.toISOString(),
      },
    ],
  };
}

/** A student adds a quest to their own plan. Steps come from `planQuest` or the habit library. */
export function createQuest(db: Db, studentId: string, plan: QuestPlan, now: Date): { db: Db; questId: string } {
  requireRole(db, studentId, 'student');
  if (!plan.title.trim()) throw new Error('Give the quest a name.');
  if (plan.steps.length === 0 || plan.steps.length > 8) throw new Error('A quest has 1–8 steps.');
  const questId = makeId('q');
  const at = now.toISOString();
  const quest = { id: questId, studentId, title: plan.title.trim(), kind: plan.kind, dueDate: plan.dueDate, teacher: plan.teacher, acorns: plan.acorns, when: plan.when, reward: plan.reward, createdAt: at };
  const steps = plan.steps.map((s, i) => ({ id: makeId('step'), questId, order: i, label: s.label, minutes: Math.min(180, Math.max(1, s.minutes)), hint: s.hint }));
  return { db: { ...db, quests: [...db.quests, quest], questSteps: [...db.questSteps, ...steps] }, questId };
}

export function deleteQuest(db: Db, studentId: string, questId: string): Db {
  requireRole(db, studentId, 'student');
  const quest = db.quests.find((q) => q.id === questId);
  if (!quest || quest.studentId !== studentId) throw new AccessDenied('Not your quest');
  return {
    ...db,
    quests: db.quests.filter((q) => q.id !== questId),
    questSteps: db.questSteps.filter((s) => s.questId !== questId),
    acorns: db.acorns.filter((a) => !(a.reason === 'quest' && a.refId === questId)),
  };
}
