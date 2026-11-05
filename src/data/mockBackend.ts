import { familiesOfParent } from '@/domain/access';
import { adminDashboard } from '@/domain/admin';
import { createStudentAccount, recordParentalConsent } from '@/domain/coppa';
import { adminSuggestCoach, sendCheer, setSharing, submitCheckIn, toggleQuestStep } from '@/domain/mutations';
import { helpContactsFor, parentStudents, parentWeeklySummary, previewOwnParentSummary } from '@/domain/parent';
import { ownNoteForToday, studentHome } from '@/domain/student';
import type { Db, Role } from '@/domain/types';
import { log } from '@/observability/logger';
import type { Backend, ChildSummary, Session, SignInResult } from './backend';
import { toBackendError } from './backend';
import { clearState, loadState, saveState } from './persist';
import { buildSeed, IDS } from './seed';

const DEMO_ACCOUNTS: Record<Role, string> = { student: IDS.maya, parent: IDS.mom, admin: IDS.patel };

/**
 * The demo backend: the in-memory Db, persisted on the device. Every write
 * runs the same domain functions the unit tests cover.
 */
export class MockBackend implements Backend {
  readonly kind = 'mock' as const;
  private db: Db = buildSeed(new Date());
  private userId: string | null = null;
  /** Subscribers re-render when the Db changes. */
  private listeners = new Set<() => void>();

  subscribe(f: () => void) {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }

  private commit(next: Db) {
    this.db = next;
    void saveState(next, this.userId);
    this.listeners.forEach((f) => f());
  }

  private session(uid: string): Session {
    const user = this.db.users.find((u) => u.id === uid)!;
    const fam = user.role === 'parent' ? familiesOfParent(this.db, uid)[0] : undefined;
    return { user, familyId: fam?.id };
  }

  async restoreSession() {
    const s = await loadState();
    if (s) {
      this.db = s.db;
      if (s.userId && s.db.users.some((u) => u.id === s.userId)) {
        this.userId = s.userId;
        log.info('state.restored', { savedAt: s.savedAt });
        return this.session(s.userId);
      }
    }
    return null;
  }

  async signUp(): Promise<SignInResult> {
    return { ok: false, message: 'Creating accounts needs the real backend. This is the demo: use a card above.' };
  }
  async signInWithPassword(): Promise<SignInResult> {
    return { ok: false, message: 'This is the demo: use a card above.' };
  }

  private tokens = new Map<string, { studentId: string; expires: number }>();

  async issueChildSignIn(s: Session, studentId: string) {
    if (!familiesOfParent(this.db, s.user.id).some((f) => f.studentIds.includes(studentId))) throw toBackendError(new Error('ACCESS_DENIED: not this student’s parent'));
    const t = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    this.tokens.set(t, { studentId, expires: Date.now() + 10 * 60_000 });
    return t;
  }

  async redeemChildSignIn(token: string): Promise<SignInResult> {
    const t = this.tokens.get(token);
    this.tokens.delete(token);
    if (!t || t.expires < Date.now()) return { ok: false, message: 'This sign-in link has expired. Ask your parent to tap your name again.' };
    this.userId = t.studentId;
    void saveState(this.db, this.userId);
    return { ok: true, session: this.session(t.studentId) };
  }

  async signInDemo(role: Role): Promise<SignInResult> {
    this.userId = DEMO_ACCOUNTS[role];
    void saveState(this.db, this.userId);
    return { ok: true, session: this.session(this.userId) };
  }
  async signOut() {
    this.userId = null;
    void saveState(this.db, null);
  }

  private run(fn: (db: Db, now: Date) => Db) {
    try {
      this.commit(fn(this.db, new Date()));
    } catch (e) {
      throw toBackendError(e);
    }
  }

  async studentHome(s: Session, now: Date) {
    return studentHome(this.db, s.user.id, now);
  }
  async ownNoteForToday(s: Session, now: Date) {
    return ownNoteForToday(this.db, s.user.id, now);
  }
  async submitCheckIn(s: Session, score: 1 | 2 | 3 | 4 | 5, note: string) {
    this.run((db, now) => submitCheckIn(db, s.user.id, score, note, now));
  }
  async toggleQuestStep(s: Session, stepId: string) {
    this.run((db, now) => toggleQuestStep(db, s.user.id, stepId, now));
  }
  async setSharing(s: Session, key: Parameters<typeof setSharing>[3], value: boolean) {
    this.run((db, now) => setSharing(db, s.user.id, s.user.id, key, value, now));
  }
  async previewParentSummary(s: Session, now: Date) {
    return previewOwnParentSummary(this.db, s.user.id, now);
  }

  async parentChildren(s: Session): Promise<ChildSummary[]> {
    return parentStudents(this.db, s.user.id).map((k) => {
      const c = this.db.consents.find((x) => x.studentId === k.id && !x.revokedAt);
      return { id: k.id, name: k.name, consent: c ? { method: c.method, grantedAt: c.grantedAt } : undefined };
    });
  }
  async parentWeeklySummary(s: Session, studentId: string, now: Date) {
    return parentWeeklySummary(this.db, s.user.id, studentId, now);
  }
  async helpContacts(s: Session, studentId: string) {
    return helpContactsFor(this.db, s.user.id, studentId);
  }
  async sendCheer(s: Session, studentId: string) {
    this.run((db, now) => sendCheer(db, s.user.id, studentId, now));
  }
  async recordConsent(s: Session, input: { childFirstName: string; childBirthDate: string; method: 'card_check' | 'signed_form' | 'video_call'; agreed: boolean }) {
    let id = '';
    this.run((db, now) => {
      const r = recordParentalConsent(db, s.user.id, { familyId: s.familyId!, childFirstName: input.childFirstName, childBirthDate: input.childBirthDate, method: input.method, agreedToNotice: input.agreed }, now);
      id = r.consent.id;
      return r.db;
    });
    return id;
  }
  async createStudent(s: Session, input: { firstName: string; lastName: string; birthDate: string; grade?: number; consentId?: string }) {
    let id = '';
    this.run((db, now) => {
      const r = createStudentAccount(db, s.user.id, { familyId: s.familyId!, ...input }, now);
      id = r.student.id;
      return r.db;
    });
    return id;
  }
  async setAdminOptIn(s: Session, optIn: boolean) {
    this.run((db) => ({ ...db, families: db.families.map((f) => (f.id === s.familyId ? { ...f, adminOptIn: optIn } : f)) }));
  }
  async familyOptIn(s: Session) {
    return this.db.families.find((f) => f.id === s.familyId)?.adminOptIn ?? false;
  }
  async deleteStudent(s: Session, studentId: string) {
    this.run((db) => {
      if (!familiesOfParent(db, s.user.id).some((f) => f.studentIds.includes(studentId))) throw new Error('ACCESS_DENIED: not this student’s parent');
      const drop = <T extends { studentId?: string }>(xs: T[]) => xs.filter((x) => x.studentId !== studentId);
      return {
        ...db,
        users: db.users.filter((u) => u.id !== studentId),
        families: db.families.map((f) => ({ ...f, studentIds: f.studentIds.filter((x) => x !== studentId) })),
        consents: db.consents.map((c) => (c.studentId === studentId ? { ...c, studentId: undefined, revokedAt: new Date().toISOString() } : c)),
        checkIns: drop(db.checkIns),
        privateNotes: drop(db.privateNotes),
        quests: drop(db.quests),
        questSteps: db.questSteps.filter((st) => db.quests.some((q) => q.id === st.questId && q.studentId !== studentId)),
        acorns: drop(db.acorns),
        sharing: drop(db.sharing),
        cheers: drop(db.cheers),
        referrals: drop(db.referrals),
      };
    });
  }

  async adminDashboard(s: Session, now: Date) {
    return adminDashboard(this.db, s.user.id, now);
  }
  async adminSuggestCoach(s: Session, studentId: string) {
    this.run((db, now) => adminSuggestCoach(db, s.user.id, studentId, now));
  }

  async resetDemo() {
    await clearState();
    this.userId = null;
    this.commit(buildSeed(new Date()));
  }
}
