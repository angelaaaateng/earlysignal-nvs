/**
 * The seam between screens and storage. Two implementations:
 *   - MockBackend (mock.ts): in-memory + on-device, the demo.
 *   - SupabaseBackend (supabaseBackend.ts): the real thing.
 * Screens never import either directly; they go through AppStore.
 *
 * Projections mirror the types in src/domain so the screens are unchanged.
 */
import type { AdminDashboard } from '@/domain/admin';
import type { ParentWeeklySummary } from '@/domain/parent';
import type { StudentHome } from '@/domain/student';
import type { CheckInScore, HelpContact, ParentalConsent, Role, SharingKey, User } from '@/domain/types';

export interface Session {
  user: User;
  /** Set for parents: the family they manage (one per parent for now). */
  familyId?: string;
}

export type SignInResult = { ok: true; session: Session } | { ok: false; message: string };

export interface ChildSummary {
  id: string;
  name: string;
  consent?: { method: ParentalConsent['method']; grantedAt: string };
}

export interface Backend {
  readonly kind: 'mock' | 'supabase';

  // ---- auth
  restoreSession(): Promise<Session | null>;
  /** Parent or admin, by email. Sends a one-time code; returns nothing. */
  requestEmailCode(email: string): Promise<{ ok: true } | { ok: false; message: string }>;
  verifyEmailCode(email: string, code: string): Promise<SignInResult>;
  /** Parent or admin via Google. Web redirects away and back; the session is picked up on return. */
  signInWithGoogle?(): Promise<{ ok: true } | { ok: false; message: string }>;
  /**
   * Student sign-in, started by the parent: the parent's app mints a short-lived
   * single-use token for one child; this device redeems it for a session.
   * The child never types anything.
   */
  issueChildSignIn(session: Session, studentId: string): Promise<string>;
  redeemChildSignIn(token: string): Promise<SignInResult>;
  /** Mock only: the demo role cards. */
  signInDemo?(role: Role): Promise<SignInResult>;
  signOut(): Promise<void>;

  // ---- student
  studentHome(session: Session, now: Date): Promise<StudentHome>;
  ownNoteForToday(session: Session, now: Date): Promise<string>;
  submitCheckIn(session: Session, score: CheckInScore, note: string): Promise<void>;
  toggleQuestStep(session: Session, stepId: string): Promise<void>;
  setSharing(session: Session, key: SharingKey, value: boolean): Promise<void>;
  previewParentSummary(session: Session, now: Date): Promise<ParentWeeklySummary>;

  // ---- parent
  parentChildren(session: Session): Promise<ChildSummary[]>;
  parentWeeklySummary(session: Session, studentId: string, now: Date): Promise<ParentWeeklySummary>;
  helpContacts(session: Session, studentId: string): Promise<HelpContact[]>;
  sendCheer(session: Session, studentId: string): Promise<void>;
  recordConsent(session: Session, input: { childFirstName: string; childBirthDate: string; method: ParentalConsent['method']; agreed: boolean }): Promise<string>;
  createStudent(session: Session, input: { firstName: string; lastName: string; birthDate: string; grade?: number; consentId?: string }): Promise<string>;
  setAdminOptIn(session: Session, optIn: boolean): Promise<void>;
  familyOptIn(session: Session): Promise<boolean>;
  deleteStudent(session: Session, studentId: string): Promise<void>;

  // ---- admin
  adminDashboard(session: Session, now: Date): Promise<AdminDashboard>;
  adminSuggestCoach(session: Session, studentId: string): Promise<void>;

  /** Mock only. */
  resetDemo?(): Promise<void>;
}

export class BackendError extends Error {
  constructor(
    public code: 'ACCESS_DENIED' | 'CONSENT_REQUIRED' | 'INVALID' | 'NETWORK' | 'UNKNOWN',
    message: string,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

/** Map a Postgres/PostgREST error (our functions raise 'CODE: message') to a BackendError. */
export function toBackendError(e: unknown): BackendError {
  if (e instanceof BackendError) return e;
  const msg = (e as { message?: string })?.message ?? String(e);
  const m = /^(ACCESS_DENIED|CONSENT_REQUIRED|INVALID):\s*(.*)$/.exec(msg);
  if (m) return new BackendError(m[1] as BackendError['code'], m[2]);
  if (/fetch|network|Failed to fetch|timeout/i.test(msg)) return new BackendError('NETWORK', 'Can’t reach EarlySignal right now. Check your connection and try again.');
  return new BackendError('UNKNOWN', msg);
}
