import { addEvent, addKid, deleteEvent, deleteKid, logTalk, markWeekReviewed, updateKid } from '@/domain/mutations';
import type { Db, EventKind, Kid, Moment, Outcome } from '@/domain/types';
import { log } from '@/observability/logger';
import type { Backend, HomeData, Session, SignInResult } from './backend';
import { toBackendError } from './backend';
import { clearState, loadState, saveState } from './persist';
import { buildSeed, IDS } from './seed';

/** The demo backend: an in-memory Db, persisted on the device. */
export class MockBackend implements Backend {
  readonly kind = 'mock' as const;
  private db: Db = buildSeed(new Date());
  private userId: string | null = null;
  private listeners = new Set<() => void>();

  subscribe(f: () => void) {
    this.listeners.add(f);
    return () => {
      this.listeners.delete(f);
    };
  }
  private commit(next: Db) {
    this.db = next;
    void saveState(next, this.userId);
    this.listeners.forEach((f) => f());
  }
  private session(uid: string): Session {
    return { user: this.db.parents.find((p) => p.id === uid)! };
  }
  private run(fn: (db: Db, now: Date) => Db) {
    try {
      this.commit(fn(this.db, new Date()));
    } catch (e) {
      throw toBackendError(e);
    }
  }

  async restoreSession() {
    const s = await loadState();
    if (s) {
      this.db = s.db;
      if (s.userId && s.db.parents.some((p) => p.id === s.userId)) {
        this.userId = s.userId;
        log.info('state.restored', { savedAt: s.savedAt });
        return this.session(s.userId);
      }
    }
    return null;
  }
  async signUp(input: { email: string; password: string; displayName: string }): Promise<SignInResult> {
    if (input.password.length < 8) return { ok: false, message: 'Use a password of at least 8 characters.' };
    const id = `par_${Math.random().toString(36).slice(2, 8)}`;
    this.commit({ ...this.db, parents: [...this.db.parents, { id, displayName: input.displayName.trim() || 'You', createdAt: new Date().toISOString() }] });
    this.userId = id;
    void saveState(this.db, id);
    return { ok: true, session: this.session(id) };
  }
  async signInWithPassword(): Promise<SignInResult> {
    return { ok: false, message: 'This is the demo. Tap “Try the demo” above, or create an account.' };
  }
  async signInDemo(): Promise<SignInResult> {
    this.userId = IDS.parent;
    void saveState(this.db, this.userId);
    return { ok: true, session: this.session(IDS.parent) };
  }
  async signOut() {
    this.userId = null;
    void saveState(this.db, null);
  }
  async deleteMyAccount(s: Session) {
    const id = s.user.id;
    this.userId = null;
    this.commit({
      parents: this.db.parents.filter((p) => p.id !== id),
      kids: this.db.kids.filter((k) => k.parentId !== id),
      events: this.db.events.filter((e) => this.db.kids.some((k) => k.id === e.kidId && k.parentId !== id)),
      talks: this.db.talks.filter((t) => t.parentId !== id),
      weekReviews: this.db.weekReviews.filter((w) => w.parentId !== id),
    });
  }

  async home(s: Session): Promise<HomeData> {
    const kids = this.db.kids.filter((k) => k.parentId === s.user.id);
    const kidIds = new Set(kids.map((k) => k.id));
    return {
      kids,
      events: this.db.events.filter((e) => kidIds.has(e.kidId)),
      talks: this.db.talks.filter((t) => t.parentId === s.user.id),
      weekReviews: this.db.weekReviews.filter((w) => w.parentId === s.user.id),
    };
  }
  async addKid(s: Session, input: { name: string; grade: number; interests: string[]; activities: string[] }) {
    let id = '';
    this.run((db, now) => {
      const r = addKid(db, s.user.id, input, now);
      id = r.kid.id;
      return r.db;
    });
    return id;
  }
  async updateKid(s: Session, kidId: string, patch: Partial<Pick<Kid, 'name' | 'grade' | 'interests' | 'activities'>>) {
    this.run((db) => updateKid(db, s.user.id, kidId, patch));
  }
  async deleteKid(s: Session, kidId: string) {
    this.run((db) => deleteKid(db, s.user.id, kidId));
  }
  async addEvent(s: Session, input: { kidId: string; title: string; kind: EventKind; date: string }) {
    let id = '';
    this.run((db, now) => {
      const r = addEvent(db, s.user.id, input, now);
      id = r.event.id;
      return r.db;
    });
    return id;
  }
  async deleteEvent(s: Session, eventId: string) {
    this.run((db) => deleteEvent(db, s.user.id, eventId));
  }
  async logTalk(s: Session, input: { kidId: string; eventId?: string; promptId: string; question: string; moment?: Moment; outcome: Outcome }) {
    let id = '';
    this.run((db, now) => {
      const r = logTalk(db, s.user.id, input, now);
      id = r.talk.id;
      return r.db;
    });
    return id;
  }
  async markWeekReviewed(s: Session, today: string) {
    this.run((db, now) => markWeekReviewed(db, s.user.id, today, now));
  }
  async resetDemo() {
    await clearState();
    this.userId = null;
    this.commit(buildSeed(new Date()));
  }
}
