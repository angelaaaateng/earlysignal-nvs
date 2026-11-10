import { OUTCOME_RATING, type EventKind, type Kid, type Moment, type Outcome, type Parent } from '@/domain/types';
import { addDays, toDateKey } from '@/domain/dates';
import { supabase } from '@/lib/supabase';
import { log } from '@/observability/logger';
import type { Backend, HomeData, Session, SignInResult } from './backend';
import { BackendError, toBackendError } from './backend';

type Row = Record<string, any>;

function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw toBackendError(r.error);
  return r.data as T;
}

/**
 * The real backend. Every row carries parent_id and row-level security keeps a
 * parent inside their own rows (supabase/migrations). Notes never come here:
 * they live on the device (src/data/notes.ts).
 */
export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const;
  private get sb() {
    return supabase();
  }

  private async sessionFor(uid: string): Promise<Session> {
    const p = unwrap(await this.sb.from('parents').select('id, display_name, created_at').eq('id', uid).single<Row>());
    const user: Parent = { id: p.id, displayName: p.display_name, createdAt: p.created_at };
    return { user };
  }

  async restoreSession() {
    const { data } = await this.sb.auth.getSession();
    if (!data.session) return null;
    try {
      return await this.sessionFor(data.session.user.id);
    } catch (e) {
      log.error('auth.restore_failed', e);
      await this.sb.auth.signOut();
      return null;
    }
  }
  async signUp(input: { email: string; password: string; displayName: string }): Promise<SignInResult> {
    const { data, error } = await this.sb.auth.signUp({ email: input.email.trim().toLowerCase(), password: input.password, options: { data: { display_name: input.displayName.trim() } } });
    if (error) return { ok: false, message: friendlyAuth(error.message) };
    if (!data.session) return { ok: false, message: 'Account created, but email confirmation is on in Supabase. Turn it off (Auth → Providers → Email), then sign in.' };
    try {
      return { ok: true, session: await this.sessionFor(data.user!.id) };
    } catch (e) {
      return { ok: false, message: toBackendError(e).message };
    }
  }
  async signInWithPassword(email: string, password: string): Promise<SignInResult> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.user) return { ok: false, message: friendlyAuth(error?.message ?? 'Sign-in failed') };
    try {
      return { ok: true, session: await this.sessionFor(data.user.id) };
    } catch (e) {
      return { ok: false, message: toBackendError(e).message };
    }
  }
  async signOut() {
    await this.sb.auth.signOut();
  }
  async deleteMyAccount() {
    unwrap(await this.sb.rpc('delete_my_account'));
    await this.sb.auth.signOut();
  }

  async home(_s: Session, now: Date): Promise<HomeData> {
    const today = toDateKey(now);
    const [kids, events, talks, reviews] = await Promise.all([
      this.sb.from('kids').select('*').order('created_at').then(unwrap) as Promise<Row[]>,
      this.sb.from('events').select('*').gte('date', addDays(today, -21)).lte('date', addDays(today, 28)).order('date').then(unwrap) as Promise<Row[]>,
      this.sb.from('talks').select('*').gte('asked_at', addDays(today, -63)).order('asked_at').then(unwrap) as Promise<Row[]>,
      this.sb.from('week_reviews').select('*').then(unwrap) as Promise<Row[]>,
    ]);
    return {
      kids: kids.map((k) => ({ id: k.id, parentId: k.parent_id, name: k.name, grade: k.grade, interests: k.interests ?? [], activities: k.activities ?? [], createdAt: k.created_at })),
      events: events.map((e) => ({ id: e.id, kidId: e.kid_id, title: e.title, kind: e.kind, date: e.date, createdAt: e.created_at })),
      talks: talks.map((t) => ({ id: t.id, parentId: t.parent_id, kidId: t.kid_id, eventId: t.event_id ?? undefined, promptId: t.prompt_id, question: t.question, moment: t.moment ?? undefined, outcome: t.outcome, askedAt: t.asked_at })),
      weekReviews: reviews.map((w) => ({ parentId: w.parent_id, weekStart: w.week_start, reviewedAt: w.reviewed_at })),
    };
  }
  async addKid(s: Session, input: { name: string; grade: number; interests: string[]; activities: string[] }) {
    if (!input.name.trim()) throw new BackendError('INVALID', 'Add a name so starters can use it.');
    const r = unwrap(await this.sb.from('kids').insert({ parent_id: s.user.id, name: input.name.trim(), grade: input.grade, interests: input.interests, activities: input.activities }).select('id').single<Row>());
    return r.id as string;
  }
  async updateKid(_s: Session, kidId: string, patch: Partial<Pick<Kid, 'name' | 'grade' | 'interests' | 'activities'>>) {
    unwrap(await this.sb.from('kids').update({ name: patch.name?.trim(), grade: patch.grade, interests: patch.interests, activities: patch.activities }).eq('id', kidId));
  }
  async deleteKid(_s: Session, kidId: string) {
    unwrap(await this.sb.from('kids').delete().eq('id', kidId));
  }
  async addEvent(s: Session, input: { kidId: string; title: string; kind: EventKind; date: string }) {
    if (!input.title.trim()) throw new BackendError('INVALID', 'What is it? A test, a game, a tryout…');
    const r = unwrap(await this.sb.from('events').insert({ parent_id: s.user.id, kid_id: input.kidId, title: input.title.trim(), kind: input.kind, date: input.date }).select('id').single<Row>());
    return r.id as string;
  }
  async deleteEvent(_s: Session, eventId: string) {
    unwrap(await this.sb.from('events').delete().eq('id', eventId));
  }
  async logTalk(s: Session, input: { kidId: string; eventId?: string; promptId: string; question: string; moment?: Moment; outcome: Outcome }) {
    const r = unwrap(
      await this.sb
        .from('talks')
        .insert({ parent_id: s.user.id, kid_id: input.kidId, event_id: input.eventId ?? null, prompt_id: input.promptId, question: input.question, moment: input.moment ?? null, outcome: input.outcome, rating: OUTCOME_RATING[input.outcome] })
        .select('id')
        .single<Row>(),
    );
    return r.id as string;
  }
  async markWeekReviewed(s: Session, today: string) {
    const ws = addDays(today, -((new Date(today + 'T12:00:00').getDay() + 6) % 7));
    unwrap(await this.sb.from('week_reviews').upsert({ parent_id: s.user.id, week_start: ws }, { onConflict: 'parent_id,week_start', ignoreDuplicates: true }));
  }
}

function friendlyAuth(msg: string): string {
  if (/rate limit|too many/i.test(msg)) return 'Too many tries. Wait a minute and try again.';
  if (/already registered|already been registered|already exists/i.test(msg)) return 'There’s already an account with that email. Sign in instead.';
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/password should be at least|weak|at least 6/i.test(msg)) return 'Use a password of at least 8 characters.';
  if (/email address .* is invalid/i.test(msg)) return 'That email address doesn’t look right.';
  if (/network|fetch/i.test(msg)) return 'Can’t reach Rooted right now.';
  return msg;
}
