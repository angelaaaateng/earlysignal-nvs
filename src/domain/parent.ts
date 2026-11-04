import { AccessDenied, familyOfStudent, firstName, isParentOf, requireRole, sharingFor, userById } from './access';
import { addDays, daysBetween, dueLabel, monthDay, rangeLabel, toDateKey, weekStart } from './dates';
import { acornBalance, burrowLevel, currentStreak } from './rewards';
import type { Db, DateKey, HelpContact, SharingKey } from './types';

/**
 * Everything a parent can see about one student for one week.
 *
 * Built only from fields the student chose to share. It never reads
 * `privateNotes`, and per-day check-in scores never leave this function:
 * the student was promised "the average, not each day's answer".
 */
export interface ParentWeeklySummary {
  studentId: string;
  studentName: string;
  /** "Oct 27–31" */
  weekLabel: string;
  /** Shared via moodTrend. */
  checkIns?: { done: number; of: number };
  /** Shared via moodTrend: weekly averages, oldest first. null = no check-ins. */
  moodWeeks?: { label: string; avg: number | null; current: boolean }[];
  /** Shared via questsFinished. */
  questsFinished?: number;
  /** Shared via streakAndLevel. */
  streak?: number;
  level?: number;
  /** Shared via upcomingTests. */
  upcomingTests?: { title: string; dueLabel: string }[];
  win?: string;
  watch?: string;
  trySaying: string;
  /** Which sharing settings are off, so the UI can say so plainly. */
  hidden: SharingKey[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function weekAvg(db: Db, studentId: string, start: DateKey): number | null {
  const end = addDays(start, 6);
  const s = db.checkIns.filter((c) => c.studentId === studentId && c.date >= start && c.date <= end);
  return s.length ? s.reduce((n, c) => n + c.score, 0) / s.length : null;
}

export function parentWeeklySummary(db: Db, viewerId: string, studentId: string, now: Date): ParentWeeklySummary {
  requireRole(db, viewerId, 'parent');
  if (!isParentOf(db, viewerId, studentId)) throw new AccessDenied('Not this student’s parent');
  return buildSummary(db, studentId, now);
}

/** The student previews exactly what their parent will see. Same projection, no extra data. */
export function previewOwnParentSummary(db: Db, viewerId: string, now: Date): ParentWeeklySummary {
  const me = requireRole(db, viewerId, 'student');
  return buildSummary(db, me.id, now);
}

function buildSummary(db: Db, studentId: string, now: Date): ParentWeeklySummary {
  const student = userById(db, studentId)!;
  const share = sharingFor(db, studentId);
  const today = toDateKey(now);
  const mon = weekStart(today);
  const fri = addDays(mon, 4);
  const hidden = (['moodTrend', 'questsFinished', 'streakAndLevel', 'upcomingTests'] as SharingKey[]).filter(
    (k) => !share[k],
  );

  const out: ParentWeeklySummary = {
    studentId,
    studentName: firstName(student.displayName),
    weekLabel: rangeLabel(mon, fri),
    trySaying: '“What was the best part of your week?”',
    hidden,
  };

  let heavier = false;
  if (share.moodTrend) {
    const elapsed = Math.min(5, Math.max(1, daysBetween(mon, today) + 1));
    const days = new Set(
      db.checkIns.filter((c) => c.studentId === studentId && c.date >= mon && c.date <= fri).map((c) => c.date),
    );
    out.checkIns = { done: days.size, of: elapsed };
    out.moodWeeks = [4, 3, 2, 1, 0].map((back) => {
      const start = addDays(mon, -7 * back);
      const avg = weekAvg(db, studentId, start);
      return { label: monthDay(start), avg: avg === null ? null : r1(avg), current: back === 0 };
    });
    const cur = out.moodWeeks[4].avg;
    const prior = out.moodWeeks.slice(0, 4).map((w) => w.avg).filter((a): a is number => a !== null);
    const base = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : null;
    const heavyRun = out.moodWeeks.slice().reverse().findIndex((w) => w.avg === null || w.avg < 3.5);
    const runLen = heavyRun === -1 ? 5 : heavyRun;
    if (runLen >= 3) {
      out.watch = `School has felt heavy for ${runLen} weeks in a row. Worth a calm check-in, or a word with someone who can help.`;
      heavier = true;
    } else if (cur !== null && base !== null && cur - base >= 0.5) {
      out.watch = 'School felt heavier than usual this week. Not a pattern yet.';
      heavier = true;
    }
  }

  const weekQuests = db.quests.filter(
    (q) =>
      q.studentId === studentId &&
      q.completedAt &&
      toDateKey(new Date(q.completedAt)) >= mon &&
      toDateKey(new Date(q.completedAt)) <= addDays(mon, 6),
  );
  if (share.questsFinished) {
    out.questsFinished = weekQuests.length;
    const early = weekQuests.filter((q) => toDateKey(new Date(q.completedAt!)) < q.dueDate).length;
    if (weekQuests.length) {
      out.win =
        `Finished ${weekQuests.length} quest${weekQuests.length === 1 ? '' : 's'} this week` +
        (early ? `, ${early} of them ahead of the due date.` : '.');
    }
  }

  if (share.streakAndLevel) {
    out.streak = currentStreak(db, studentId, today);
    out.level = burrowLevel(acornBalance(db, studentId)).level;
    if (out.streak >= 5) {
      out.win = out.win ? `${out.win} Kept a ${out.streak}-day streak going.` : `Kept a ${out.streak}-day check-in streak going.`;
    }
  }

  if (share.upcomingTests) {
    out.upcomingTests = db.quests
      .filter((q) => q.studentId === studentId && q.kind === 'boss' && !q.completedAt && q.dueDate >= today && q.dueDate <= addDays(today, 14))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map((q) => ({ title: q.title, dueLabel: dueLabel(today, q.dueDate) }));
    const next = out.upcomingTests[0];
    if (next && out.watch) out.watch = out.watch.replace(/\.( Not a pattern yet\.)?$/, `, with ${next.title} ${next.dueLabel === 'today' || next.dueLabel === 'tomorrow' ? next.dueLabel : `on ${next.dueLabel}`}.$1`);
  }

  if (heavier && out.upcomingTests?.[0]) {
    out.trySaying = `“${out.upcomingTests[0].title} is coming up. Want to plan one small step together?”`;
  } else if (heavier) {
    out.trySaying = '“This week sounded like a lot. What would make tomorrow a little lighter?”';
  } else if (out.questsFinished) {
    out.trySaying = `“You finished ${out.questsFinished} quest${out.questsFinished === 1 ? '' : 's'} this week. Which one are you proudest of?”`;
  } else if (out.streak) {
    out.trySaying = `“${out.streak} days in a row with Pip. How’s the Burrow looking?”`;
  }
  return out;
}

export function parentStudents(db: Db, viewerId: string) {
  requireRole(db, viewerId, 'parent');
  return db.families
    .filter((f) => f.parents.some((p) => p.userId === viewerId))
    .flatMap((f) => f.studentIds)
    .map((id) => userById(db, id)!)
    .map((u) => ({ id: u.id, name: firstName(u.displayName) }));
}

export function helpContactsFor(db: Db, viewerId: string, studentId: string): HelpContact[] {
  if (!isParentOf(db, viewerId, studentId)) throw new AccessDenied('Not this student’s parent');
  const fam = familyOfStudent(db, studentId)!;
  return db.helpContacts.filter((h) => h.familyId === fam.id);
}
