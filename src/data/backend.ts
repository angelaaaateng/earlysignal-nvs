/**
 * The seam between screens and storage. Two implementations:
 *   - MockBackend: in-memory + on-device, the demo.
 *   - SupabaseBackend: the real thing.
 * Screens never import either directly; they go through AppStore.
 */
import type { EventCandidate } from '@/domain/importEvents';
import type { Arm, Db, EventKind, Impression, Kid, KidEvent, Moment, NudgeSettings, Outcome, Parent, Talk, WeekReview } from '@/domain/types';

export interface Session {
  user: Parent;
}

export type SignInResult = { ok: true; session: Session } | { ok: false; message: string };

/** Everything a parent's screens need, loaded once and derived in the domain. */
export interface HomeData {
  kids: Kid[];
  events: KidEvent[];
  talks: Talk[];
  weekReviews: WeekReview[];
  impressions: Impression[];
  pilotInterested: boolean;
  pushSubscribed: boolean;
}

export type ExtractInput = { kind: 'text'; text: string } | { kind: 'photo'; base64: string; mediaType: string } | { kind: 'calendar'; url: string };

export interface Backend {
  readonly kind: 'mock' | 'supabase';

  restoreSession(): Promise<Session | null>;
  signUp(input: { email: string; password: string; displayName: string }): Promise<SignInResult>;
  signInWithPassword(email: string, password: string): Promise<SignInResult>;
  /** Mock only: the demo card. */
  signInDemo?(): Promise<SignInResult>;
  signOut(): Promise<void>;
  deleteMyAccount(session: Session): Promise<void>;
  /** Sends the recovery email (real backend only). */
  requestPasswordReset(email: string): Promise<{ ok: boolean; message?: string }>;
  updatePassword(newPassword: string): Promise<{ ok: boolean; message?: string }>;

  home(session: Session, now: Date): Promise<HomeData>;
  addKid(session: Session, input: { name: string; grade: number; interests: string[]; activities: string[] }): Promise<string>;
  updateKid(session: Session, kidId: string, patch: Partial<Pick<Kid, 'name' | 'grade' | 'interests' | 'activities'>>): Promise<void>;
  deleteKid(session: Session, kidId: string): Promise<void>;
  addEvent(session: Session, input: { kidId: string; title: string; kind: EventKind; date: string }): Promise<string>;
  deleteEvent(session: Session, eventId: string): Promise<void>;
  addEvents(session: Session, inputs: { kidId: string; title: string; kind: EventKind; date: string }[]): Promise<number>;
  logTalk(session: Session, input: { kidId: string; eventId?: string; promptId: string; question: string; moment?: Moment; outcome: Outcome; arm?: Arm; followUpUsed?: boolean }): Promise<string>;
  markWeekReviewed(session: Session, today: string): Promise<void>;
  /** The experiment: a starter was shown today. Idempotent per kid, prompt and day. */
  recordImpression(session: Session, input: { kidId: string; promptId: string; arm: Arm; eventId?: string; shownOn: string }): Promise<void>;
  setNudge(session: Session, nudge: NudgeSettings): Promise<void>;
  setPilotMode(session: Session, on: boolean): Promise<void>;
  savePushSubscription(session: Session, sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string }): Promise<void>;
  removePushSubscription(session: Session, endpoint: string): Promise<void>;
  registerPilotInterest(session: Session, note?: string): Promise<void>;
  /** Turn pasted text, a photo or a calendar link into event candidates for approval. */
  extractEvents(session: Session, input: ExtractInput, today: string): Promise<EventCandidate[]>;

  /** Mock only. */
  resetDemo?(): Promise<void>;
  /** Mock only: re-render subscribers when the Db changes. */
  subscribe?(f: () => void): () => void;
}

export class BackendError extends Error {
  constructor(
    public code: 'ACCESS_DENIED' | 'INVALID' | 'NETWORK' | 'UNKNOWN',
    message: string,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

export function toBackendError(e: unknown): BackendError {
  if (e instanceof BackendError) return e;
  const msg = (e as { message?: string })?.message ?? String(e);
  const m = /^(ACCESS_DENIED|INVALID):\s*(.*)$/.exec(msg);
  if (m) return new BackendError(m[1] as BackendError['code'], m[2]);
  if (/fetch|network|Failed to fetch|timeout/i.test(msg)) return new BackendError('NETWORK', 'Can’t reach Rooted right now. Check your connection and try again.');
  return new BackendError('UNKNOWN', msg);
}

export type { Db };
