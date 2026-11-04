/**
 * EarlySignal data model.
 *
 * Every table here maps 1:1 to a future backend table. Access rules live in
 * `policy.ts`, not in screens: screens only ever receive role-scoped views.
 */

export type Role = 'student' | 'parent' | 'admin';

/** ISO calendar date in the user's local time, e.g. "2026-11-04". */
export type DateKey = string;

export interface User {
  id: string;
  role: Role;
  displayName: string;
  /** Students only. Used for the COPPA age gate. */
  birthDate?: DateKey;
  /** Students only. School grade, shown to partner admins. */
  grade?: number;
  /** Admins only. The school or clinic they work for. */
  orgId?: string;
  createdAt: string;
}

export interface Org {
  id: string;
  name: string;
  kind: 'school' | 'clinic';
}

export interface FamilyMember {
  userId: string;
  /** How the student refers to this parent, e.g. "Mom". */
  relationship?: string;
}

export interface Family {
  id: string;
  parents: FamilyMember[];
  studentIds: string[];
  /** The partner org this family enrolled through, if any. */
  orgId?: string;
  /**
   * Family-level opt-in to the partner admin dashboard. Admins see a family
   * only when this is true AND the family belongs to their org.
   */
  adminOptIn: boolean;
  enrolledAt: string;
}

/** COPPA: verifiable parental consent, recorded before an under-13 account exists. */
export interface ParentalConsent {
  id: string;
  parentId: string;
  familyId: string;
  childFirstName: string;
  childBirthDate: DateKey;
  method: 'card_check' | 'signed_form' | 'video_call';
  /** Plain-language notice version the parent agreed to. */
  noticeVersion: string;
  grantedAt: string;
  /** Set once the student account is created under this consent. */
  studentId?: string;
  revokedAt?: string;
}

export type CheckInScore = 1 | 2 | 3 | 4 | 5;

export interface CheckIn {
  id: string;
  studentId: string;
  date: DateKey;
  score: CheckInScore;
  createdAt: string;
}

/**
 * Stored apart from `CheckIn` on purpose. Nothing outside the student's own
 * view reads this table; see `policy.ts`.
 */
export interface PrivateNote {
  id: string;
  checkInId: string;
  studentId: string;
  text: string;
  createdAt: string;
}

export interface Quest {
  id: string;
  studentId: string;
  title: string;
  kind: 'quest' | 'boss';
  /** Due date. For a boss battle, the test date. */
  dueDate: DateKey;
  teacher?: string;
  /** Acorns awarded when every step is done. */
  acorns: number;
  /** Free-form timing hint shown on single-step quests, e.g. "before bed". */
  when?: string;
  /** Reward copy for boss battles, e.g. "rare item waiting". */
  reward?: string;
  completedAt?: string;
  createdAt: string;
}

export interface QuestStep {
  id: string;
  questId: string;
  order: number;
  label: string;
  minutes: number;
  /** A nudge Pip can give. Hints, never answers. */
  hint?: string;
  doneAt?: string;
}

export interface AcornEntry {
  id: string;
  studentId: string;
  amount: number;
  reason: 'check_in' | 'quest' | 'bonus';
  refId?: string;
  at: string;
}

/** Owned and edited by the student only. */
export interface SharingSettings {
  studentId: string;
  moodTrend: boolean;
  questsFinished: boolean;
  streakAndLevel: boolean;
  upcomingTests: boolean;
  updatedAt: string;
}

export type SharingKey = keyof Omit<SharingSettings, 'studentId' | 'updatedAt'>;

export interface Cheer {
  id: string;
  fromParentId: string;
  studentId: string;
  sentAt: string;
  deliveredAt?: string;
}

export type ReferralTarget = 'counselor' | 'ef_coach' | 'clinic';
export type ReferralStatus = 'requested' | 'waitlist' | 'booked' | 'scheduled' | 'closed';

export interface Referral {
  id: string;
  familyId: string;
  studentId: string;
  orgId: string;
  target: ReferralTarget;
  /** Display name of who they were referred to, e.g. "EF coach". */
  targetLabel: string;
  status: ReferralStatus;
  /** For scheduled meetings, a short label like "Today 2pm". */
  when?: string;
  createdAt: string;
}

export interface HelpContact {
  id: string;
  familyId: string;
  name: string;
  sub: string;
  tag: 'Free' | 'Paid' | 'Referral';
  draft: string;
}

export interface Db {
  users: User[];
  orgs: Org[];
  families: Family[];
  consents: ParentalConsent[];
  checkIns: CheckIn[];
  privateNotes: PrivateNote[];
  quests: Quest[];
  questSteps: QuestStep[];
  acorns: AcornEntry[];
  sharing: SharingSettings[];
  cheers: Cheer[];
  referrals: Referral[];
  helpContacts: HelpContact[];
}
