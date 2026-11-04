import { AccessDenied, adminVisibleFamilies, initialName, requireRole, sharingFor, userById } from './access';
import { addDays, daysBetween, monthDay, toDateKey, weekStart } from './dates';
import { currentStreak } from './rewards';
import type { Db, Referral, ReferralStatus } from './types';

export type FamilyStatus = 'Needs follow-up' | 'Improving' | 'On track' | 'Private';

export interface AdminFamilyRow {
  studentId: string;
  familyId: string;
  name: string;
  grade: string;
  pattern: string;
  status: FamilyStatus;
  flag: boolean;
  action: 'Reach out' | 'Suggest coach' | 'View';
  /** Which signals this student shares (labels only, never the data). */
  shares: string[];
  /** An EF-coach referral already exists for this student. */
  coachSuggested: boolean;
}

export interface AdminDashboard {
  orgName: string;
  adminName: string;
  weekOf: string;
  enrolled: number;
  newThisMonth: number;
  /** % of sharing students with 3+ check-ins in the last full week. */
  selfStarterPct: number;
  needFollowUp: number;
  openReferrals: number;
  waitingOnClinic: number;
  selfStarterWeeks: { label: string; pct: number }[];
  rows: AdminFamilyRow[];
  referralQueue: { id: string; label: string; status: string; highlight: boolean }[];
}

const STATUS_LABEL: Record<ReferralStatus, string> = {
  requested: 'Requested',
  waitlist: 'Waitlist',
  booked: 'Booked',
  scheduled: 'Scheduled',
  closed: 'Closed',
};

/**
 * A pattern for one student, derived only from what that student shares.
 * The admin gets the conclusion, never per-day scores, notes or quest text.
 */
function patternFor(db: Db, studentId: string, today: string): Pick<AdminFamilyRow, 'pattern' | 'status' | 'flag' | 'action'> {
  const share = sharingFor(db, studentId);
  if (!share.moodTrend && !share.questsFinished && !share.streakAndLevel && !share.upcomingTests) {
    return { pattern: 'Shares no signals', status: 'Private', flag: false, action: 'View' };
  }

  if (share.moodTrend) {
    const mine = db.checkIns.filter((c) => c.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));
    const last = mine[0];
    if (last) {
      const gap = daysBetween(last.date, today);
      if (gap >= 7) {
        return { pattern: `Check-ins stopped ${gap} days ago`, status: 'Needs follow-up', flag: true, action: 'Reach out' };
      }
    }
    const recent = mine.filter((c) => c.date > addDays(today, -21));
    const heavy = recent.filter((c) => c.score >= 4).length;
    if (recent.length >= 8 && heavy / recent.length >= 0.6) {
      return { pattern: 'Stress 4+ on most days for 3 weeks', status: 'Needs follow-up', flag: true, action: 'Reach out' };
    }
  }

  if (share.upcomingTests && share.questsFinished) {
    const pastBoss = db.quests.filter(
      (q) => q.studentId === studentId && q.kind === 'boss' && q.dueDate < today && q.dueDate >= addDays(today, -42),
    );
    const missed = pastBoss.filter((q) =>
      db.questSteps.some((s) => s.questId === q.id && (!s.doneAt || toDateKey(new Date(s.doneAt)) > q.dueDate)),
    );
    if (pastBoss.length >= 2 && missed.length === pastBoss.length) {
      return { pattern: 'Missed quest steps before every test', status: 'Needs follow-up', flag: true, action: 'Suggest coach' };
    }
  }

  if (share.moodTrend) {
    const hasCoach = db.referrals.some((r) => r.studentId === studentId && r.target === 'ef_coach' && r.status === 'booked');
    const avg = (from: string, to: string) => {
      const s = db.checkIns.filter((c) => c.studentId === studentId && c.date >= from && c.date < to);
      return s.length ? s.reduce((n, c) => n + c.score, 0) / s.length : null;
    };
    const before = avg(addDays(today, -28), addDays(today, -14));
    const after = avg(addDays(today, -14), today);
    if (hasCoach && before !== null && after !== null && before - after >= 0.5) {
      return { pattern: 'Stress easing since coach started', status: 'Improving', flag: false, action: 'View' };
    }
  }

  if (share.streakAndLevel) {
    const streak = currentStreak(db, studentId, today);
    if (streak >= 3) return { pattern: `Steady; ${streak}-day streak`, status: 'On track', flag: false, action: 'View' };
  }
  return { pattern: 'Steady', status: 'On track', flag: false, action: 'View' };
}

export function adminDashboard(db: Db, viewerId: string, now: Date): AdminDashboard {
  const admin = requireRole(db, viewerId, 'admin');
  const org = db.orgs.find((o) => o.id === admin.orgId);
  const families = adminVisibleFamilies(db, viewerId);
  const today = toDateKey(now);
  const thisWeek = weekStart(today);

  const studentIds = families.flatMap((f) => f.studentIds.map((s) => ({ s, f: f.id })));
  const rows: AdminFamilyRow[] = studentIds.map(({ s, f }) => {
    const u = userById(db, s)!;
    const sh = sharingFor(db, s);
    return {
      studentId: s,
      familyId: f,
      name: initialName(u.displayName),
      grade: String(u.grade ?? '–'),
      ...patternFor(db, s, today),
      shares: [
        sh.moodTrend && 'mood trend',
        sh.questsFinished && 'quests finished',
        sh.streakAndLevel && 'streak and level',
        sh.upcomingTests && 'upcoming tests',
      ].filter((x): x is string => !!x),
      coachSuggested: db.referrals.some((r) => r.studentId === s && r.target === 'ef_coach' && r.status !== 'closed'),
    };
  });
  // Flagged first, then improving, then everyone else, alphabetically within.
  const rank: Record<FamilyStatus, number> = { 'Needs follow-up': 0, Improving: 1, 'On track': 2, Private: 3 };
  rows.sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));

  // Self-starters: of students sharing their mood trend, how many checked in 3+ days that week.
  const sharers = studentIds.map((x) => x.s).filter((s) => sharingFor(db, s).moodTrend);
  const selfStarterWeeks = [6, 5, 4, 3, 2, 1].map((back) => {
    const start = addDays(thisWeek, -7 * back);
    const end = addDays(start, 6);
    const n = sharers.filter((s) => {
      const days = new Set(db.checkIns.filter((c) => c.studentId === s && c.date >= start && c.date <= end).map((c) => c.date));
      return days.size >= 3;
    }).length;
    return { label: monthDay(start), pct: sharers.length ? Math.round((n / sharers.length) * 100) : 0 };
  });

  const famIds = new Set(families.map((f) => f.id));
  const refs = db.referrals.filter((r) => famIds.has(r.familyId) && r.orgId === admin.orgId && r.status !== 'closed');
  const monthAgo = addDays(today, -30);

  return {
    orgName: org?.name ?? '',
    adminName: admin.displayName,
    weekOf: monthDay(addDays(thisWeek, -7)),
    enrolled: families.length,
    newThisMonth: families.filter((f) => toDateKey(new Date(f.enrolledAt)) >= monthAgo).length,
    selfStarterPct: selfStarterWeeks[selfStarterWeeks.length - 1].pct,
    needFollowUp: rows.filter((r) => r.flag).length,
    openReferrals: refs.length,
    waitingOnClinic: refs.filter((r) => r.target === 'clinic' && r.status === 'waitlist').length,
    selfStarterWeeks,
    rows,
    referralQueue: refs
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({
        id: r.id,
        label: `${initialName(userById(db, r.studentId)!.displayName)} → ${r.targetLabel}`,
        status: r.when ?? STATUS_LABEL[r.status],
        highlight: r.status === 'booked',
      })),
  };
}

/** Admin action: suggest an EF coach. Only for a family the admin can see. */
export function canAdminActOn(db: Db, viewerId: string, studentId: string): boolean {
  return adminVisibleFamilies(db, viewerId).some((f) => f.studentIds.includes(studentId));
}

export function assertAdminCanActOn(db: Db, viewerId: string, studentId: string) {
  if (!canAdminActOn(db, viewerId, studentId)) throw new AccessDenied('Family has not opted in');
}

export type { Referral };
