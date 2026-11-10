import { parseIcs, parseText, type EventCandidate } from '@/domain/importEvents';
import { addEvent, addKid, deleteEvent, deleteKid, logTalk, markWeekReviewed, recordImpression, registerPilotInterest, setNudge, setPilotMode, updateKid } from '@/domain/mutations';
import type { Arm, Db, EventKind, Kid, Moment, NudgeSettings, Outcome } from '@/domain/types';
import type { ExtractInput } from './backend';
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
    const p = this.db.parents.find((x) => x.id === uid)!;
    return { user: { ...p, nudge: p.nudge ?? { enabled: false, hour: 17, tz: 'America/New_York' }, pilotMode: p.pilotMode ?? true } };
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
      impressions: this.db.impressions.filter((i) => i.parentId !== id),
      pilotInterest: this.db.pilotInterest.filter((p) => p !== id),
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
      impressions: this.db.impressions.filter((i) => i.parentId === s.user.id),
      pilotInterested: this.db.pilotInterest.includes(s.user.id),
      pushSubscribed: this.pushEndpoints.size > 0,
    };
  }
  private pushEndpoints = new Set<string>();
  async requestPasswordReset() {
    return { ok: false, message: 'The demo has no email. On the real app this sends a reset link.' };
  }
  async updatePassword() {
    return { ok: true };
  }
  async addEvents(s: Session, inputs: { kidId: string; title: string; kind: EventKind; date: string }[]) {
    let n = 0;
    this.run((db, now) => {
      let next = db;
      for (const i of inputs) {
        next = addEvent(next, s.user.id, i, now).db;
        n++;
      }
      return next;
    });
    return n;
  }
  async recordImpression(s: Session, input: { kidId: string; promptId: string; arm: Arm; eventId?: string; shownOn: string }) {
    const next = recordImpression(this.db, s.user.id, input);
    if (next !== this.db) {
      this.db = next;
      void saveState(next, this.userId);
    }
  }
  async setNudge(s: Session, nudge: NudgeSettings) {
    this.run((db) => setNudge(db, s.user.id, nudge));
  }
  async setPilotMode(s: Session, on: boolean) {
    this.run((db) => setPilotMode(db, s.user.id, on));
  }
  async savePushSubscription(_s: Session, sub: { endpoint: string }) {
    this.pushEndpoints.add(sub.endpoint);
  }
  async removePushSubscription(_s: Session, endpoint: string) {
    this.pushEndpoints.delete(endpoint);
  }
  async registerPilotInterest(s: Session) {
    this.run((db) => registerPilotInterest(db, s.user.id));
  }
  async extractEvents(_s: Session, input: ExtractInput, today: string): Promise<EventCandidate[]> {
    if (input.kind === 'text') return parseText(input.text, today);
    if (input.kind === 'calendar') {
      const r = await fetch(input.url);
      if (!r.ok) throw toBackendError(new Error('INVALID: That link didn’t return a calendar.'));
      return parseIcs(await r.text(), today);
    }
    throw toBackendError(new Error('INVALID: Reading a photo needs the real app (it uses Claude). Paste the text instead.'));
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
  async logTalk(s: Session, input: { kidId: string; eventId?: string; promptId: string; question: string; moment?: Moment; outcome: Outcome; arm?: Arm; followUpUsed?: boolean }) {
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
