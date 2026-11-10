import { parseIcs, parseText, type EventCandidate } from '@/domain/importEvents';
import { OUTCOME_RATING, type Arm, type EventKind, type Kid, type Moment, type NudgeSettings, type Outcome, type Parent } from '@/domain/types';
import { addDays, toDateKey } from '@/domain/dates';
import { supabase, SUPABASE_URL } from '@/lib/supabase';
import { log } from '@/observability/logger';
import type { Backend, ExtractInput, HomeData, Session, SignInResult } from './backend';
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
    const p = unwrap(await this.sb.from('parents').select('id, display_name, created_at, nudge_enabled, nudge_hour, tz, pilot_mode').eq('id', uid).single<Row>());
    const user: Parent = { id: p.id, displayName: p.display_name, createdAt: p.created_at, nudge: { enabled: !!p.nudge_enabled, hour: p.nudge_hour ?? 17, tz: p.tz ?? 'America/New_York' }, pilotMode: p.pilot_mode ?? true };
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
  async requestPasswordReset(email: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://earlysignal-nvs.vercel.app';
    const { error } = await this.sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${origin}/reset-password` });
    return error ? { ok: false, message: friendlyAuth(error.message) } : { ok: true };
  }
  async updatePassword(newPassword: string) {
    const { error } = await this.sb.auth.updateUser({ password: newPassword });
    return error ? { ok: false, message: friendlyAuth(error.message) } : { ok: true };
  }
  async deleteMyAccount() {
    unwrap(await this.sb.rpc('delete_my_account'));
    await this.sb.auth.signOut();
  }

  async home(_s: Session, now: Date): Promise<HomeData> {
    const today = toDateKey(now);
    const [kids, events, talks, reviews, impressions, interest, pushes] = await Promise.all([
      this.sb.from('kids').select('*').order('created_at').then(unwrap) as Promise<Row[]>,
      this.sb.from('events').select('*').gte('date', addDays(today, -21)).lte('date', addDays(today, 70)).order('date').then(unwrap) as Promise<Row[]>,
      this.sb.from('talks').select('*').gte('asked_at', addDays(today, -63)).order('asked_at').then(unwrap) as Promise<Row[]>,
      this.sb.from('week_reviews').select('*').then(unwrap) as Promise<Row[]>,
      this.sb.from('impressions').select('*').gte('shown_on', addDays(today, -35)).then(unwrap) as Promise<Row[]>,
      this.sb.from('pilot_interest').select('id').then(unwrap) as Promise<Row[]>,
      this.sb.from('push_subscriptions').select('id').then(unwrap) as Promise<Row[]>,
    ]);
    return {
      kids: kids.map((k) => ({ id: k.id, parentId: k.parent_id, name: k.name, grade: k.grade, interests: k.interests ?? [], activities: k.activities ?? [], createdAt: k.created_at })),
      events: events.map((e) => ({ id: e.id, kidId: e.kid_id, title: e.title, kind: e.kind, date: e.date, createdAt: e.created_at })),
      talks: talks.map((t) => ({ id: t.id, parentId: t.parent_id, kidId: t.kid_id, eventId: t.event_id ?? undefined, promptId: t.prompt_id, question: t.question, moment: t.moment ?? undefined, outcome: t.outcome, arm: t.arm ?? undefined, followUpUsed: !!t.follow_up_used, askedAt: t.asked_at })),
      weekReviews: reviews.map((w) => ({ parentId: w.parent_id, weekStart: w.week_start, reviewedAt: w.reviewed_at })),
      impressions: impressions.map((i) => ({ id: i.id, parentId: i.parent_id, kidId: i.kid_id, promptId: i.prompt_id, arm: i.arm, eventId: i.event_id ?? undefined, shownOn: i.shown_on, asked: !!i.asked })),
      pilotInterested: interest.length > 0,
      pushSubscribed: pushes.length > 0,
    };
  }
  async addEvents(s: Session, inputs: { kidId: string; title: string; kind: EventKind; date: string }[]) {
    const rows = inputs.filter((i) => i.title.trim()).map((i) => ({ parent_id: s.user.id, kid_id: i.kidId, title: i.title.trim().slice(0, 80), kind: i.kind, date: i.date }));
    if (rows.length === 0) return 0;
    unwrap(await this.sb.from('events').insert(rows));
    return rows.length;
  }
  async recordImpression(s: Session, input: { kidId: string; promptId: string; arm: Arm; eventId?: string; shownOn: string }) {
    await this.sb.from('impressions').upsert({ parent_id: s.user.id, kid_id: input.kidId, prompt_id: input.promptId, arm: input.arm, event_id: input.eventId ?? null, shown_on: input.shownOn }, { onConflict: 'parent_id,kid_id,shown_on,prompt_id', ignoreDuplicates: true });
  }
  async setNudge(s: Session, nudge: NudgeSettings) {
    unwrap(await this.sb.from('parents').update({ nudge_enabled: nudge.enabled, nudge_hour: nudge.hour, tz: nudge.tz }).eq('id', s.user.id));
  }
  async setPilotMode(s: Session, on: boolean) {
    unwrap(await this.sb.from('parents').update({ pilot_mode: on }).eq('id', s.user.id));
  }
  async savePushSubscription(s: Session, sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) {
    unwrap(await this.sb.from('push_subscriptions').upsert({ parent_id: s.user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, user_agent: sub.userAgent ?? null }, { onConflict: 'endpoint' }));
  }
  async removePushSubscription(_s: Session, endpoint: string) {
    unwrap(await this.sb.from('push_subscriptions').delete().eq('endpoint', endpoint));
  }
  async registerPilotInterest(s: Session, note?: string) {
    unwrap(await this.sb.from('pilot_interest').upsert({ parent_id: s.user.id, note: note ?? null }, { onConflict: 'parent_id' }));
  }
  /** Photos and messy text go through the extract-events edge function (Claude). Calendar links too, for CORS. Plain text falls back to the local parser. */
  async extractEvents(_s: Session, input: ExtractInput, today: string): Promise<EventCandidate[]> {
    const local = input.kind === 'text' ? parseText(input.text, today) : [];
    try {
      const { data, error } = await this.sb.functions.invoke('extract-events', { body: { ...input, today } });
      if (error) throw error;
      const d = data as { candidates?: EventCandidate[]; configured?: boolean; ics?: string; error?: string };
      if (d.error) throw new Error(d.error);
      if (input.kind === 'calendar' && d.ics) return parseIcs(d.ics, today);
      if (d.candidates && d.candidates.length) return d.candidates;
      if (d.configured === false && input.kind === 'photo') throw new BackendError('INVALID', 'Reading a photo needs the ANTHROPIC_API_KEY secret on the extract-events function. Paste the text instead for now.');
      return local;
    } catch (e) {
      if (local.length) return local;
      log.warn('extract.failed', { kind: input.kind, url: SUPABASE_URL ? 'set' : 'unset' });
      throw toBackendError(e);
    }
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
  async logTalk(s: Session, input: { kidId: string; eventId?: string; promptId: string; question: string; moment?: Moment; outcome: Outcome; arm?: Arm; followUpUsed?: boolean }) {
    const r = unwrap(
      await this.sb
        .from('talks')
        .insert({ parent_id: s.user.id, kid_id: input.kidId, event_id: input.eventId ?? null, prompt_id: input.promptId, question: input.question, moment: input.moment ?? null, outcome: input.outcome, rating: OUTCOME_RATING[input.outcome], arm: input.arm ?? null, follow_up_used: !!input.followUpUsed })
        .select('id')
        .single<Row>(),
    );
    await this.sb.from('impressions').update({ asked: true }).eq('kid_id', input.kidId).eq('prompt_id', input.promptId).gte('shown_on', addDays(toDateKey(new Date()), -1));
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
