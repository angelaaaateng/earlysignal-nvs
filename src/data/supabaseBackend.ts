import type { AdminDashboard, AdminFamilyRow, FamilyStatus } from '@/domain/admin';
import { CONSENT_NOTICE_VERSION } from '@/domain/coppa';
import { addDays, daysBetween, dueLabel, monthDay, partOfDay, rangeLabel, toDateKey, weekdayLong, weekStart } from '@/domain/dates';
import type { ParentWeeklySummary } from '@/domain/parent';
import { burrowLevel } from '@/domain/rewards';
import type { QuestPlan } from '@/domain/questTemplates';
import type { QuestView, StudentHome } from '@/domain/student';
import type { CheckInScore, HelpContact, ParentalConsent, SharingKey, SharingSettings, User } from '@/domain/types';
import { supabase } from '@/lib/supabase';
import { log } from '@/observability/logger';
import { normalizeUsername, studentEmail, USERNAME_RE } from './auth';
import type { Backend, ChildSummary, Session, SignInResult } from './backend';
import { BackendError, toBackendError } from './backend';

type Row = Record<string, any>;

const SHARE_COL: Record<SharingKey, string> = {
  moodTrend: 'mood_trend',
  questsFinished: 'quests_finished',
  streakAndLevel: 'streak_and_level',
  upcomingTests: 'upcoming_tests',
};

function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw toBackendError(r.error);
  return r.data as T;
}

/**
 * The real backend. Every access rule is enforced by the database (RLS and
 * security-definer functions, see supabase/migrations); this class only
 * shapes rows into the projections the screens already render.
 */
export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const;
  private get sb() {
    return supabase();
  }

  // ------------------------------------------------------------------ auth
  private async sessionFor(uid: string): Promise<Session> {
    const u = unwrap(await this.sb.from('users').select('id, role, display_name, birth_date, grade, org_id, created_at').eq('id', uid).single<Row>());
    const user: User = { id: u.id, role: u.role, displayName: u.display_name, birthDate: u.birth_date ?? undefined, grade: u.grade ?? undefined, orgId: u.org_id ?? undefined, createdAt: u.created_at };
    let familyId: string | undefined;
    if (user.role === 'parent') {
      const fp = unwrap(await this.sb.from('family_parents').select('family_id').eq('user_id', uid).limit(1).maybeSingle<Row>());
      familyId = fp?.family_id;
    }
    return { user, familyId };
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
    const { data, error } = await this.sb.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: { data: { display_name: input.displayName.trim() } },
    });
    if (error) return { ok: false, message: friendlyAuth(error.message) };
    if (!data.session) return { ok: false, message: 'Account created, but email confirmation is on in Supabase. Turn it off (Auth → Providers → Email) or confirm the email, then sign in.' };
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

  async signUpStudent(input: { username: string; password: string; displayName: string; grade?: number; ageAttested: boolean }): Promise<SignInResult> {
    const username = normalizeUsername(input.username);
    if (!input.ageAttested) return { ok: false, message: 'EarlySignal is for ages 13 and up.' };
    if (!USERNAME_RE.test(username)) return { ok: false, message: 'Usernames are 3–20 letters, numbers or underscores.' };
    const r = await this.sb.rpc('sign_up_student', { p_username: username, p_password: input.password, p_display_name: input.displayName.trim(), p_grade: input.grade ?? null, p_age_attested: true });
    if (r.error) return { ok: false, message: toBackendError(r.error).message };
    return this.signInStudent(username, input.password);
  }

  async signInStudent(username: string, password: string): Promise<SignInResult> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email: studentEmail(username), password });
    if (error || !data.user) return { ok: false, message: /invalid login/i.test(error?.message ?? '') ? 'Wrong username or password.' : friendlyAuth(error?.message ?? 'Sign-in failed') };
    try {
      return { ok: true, session: await this.sessionFor(data.user.id) };
    } catch (e) {
      return { ok: false, message: toBackendError(e).message };
    }
  }

  async deleteMyAccount() {
    unwrap(await this.sb.rpc('delete_my_account'));
    await this.sb.auth.signOut();
  }

  async createQuest(_s: Session, plan: QuestPlan) {
    return unwrap(
      await this.sb.rpc('create_quest', {
        p_title: plan.title, p_kind: plan.kind, p_due_date: plan.dueDate, p_acorns: plan.acorns,
        p_teacher: plan.teacher ?? null, p_when: plan.when ?? null, p_reward: plan.reward ?? null,
        p_steps: plan.steps.map((st) => ({ label: st.label, minutes: st.minutes, hint: st.hint ?? null })),
      }),
    ) as string;
  }
  async deleteQuest(_s: Session, questId: string) {
    unwrap(await this.sb.rpc('delete_quest', { p_quest_id: questId }));
  }
  async createParentLinkCode() {
    return unwrap(await this.sb.rpc('create_parent_link_code')) as { code: string; expiresAt: string };
  }
  async myParents() {
    return (unwrap(await this.sb.rpc('my_parents')) as { id: string; name: string }[]) ?? [];
  }
  async redeemLinkCode(_s: Session, code: string) {
    return unwrap(await this.sb.rpc('redeem_parent_link_code', { p_code: code })) as string;
  }
  async unlinkStudent(_s: Session, studentId: string) {
    unwrap(await this.sb.rpc('unlink_student', { p_student_id: studentId }));
  }
  async resetChildPassword(_s: Session, studentId: string, newPassword: string) {
    unwrap(await this.sb.rpc('reset_child_password', { p_student_id: studentId, p_new_password: newPassword }));
  }

  async issueChildSignIn(_s: Session, studentId: string) {
    return unwrap(await this.sb.rpc('issue_child_sign_in', { p_student_id: studentId })) as string;
  }

  async redeemChildSignIn(token: string): Promise<SignInResult> {
    const r = await this.sb.rpc('redeem_child_sign_in', { p_token: token });
    if (r.error) return { ok: false, message: toBackendError(r.error).message };
    const { email, secret } = r.data as { email: string; secret: string };
    // A parent may be signed in on this device: the child's session replaces it.
    await this.sb.auth.signOut({ scope: 'local' });
    const auth = await this.sb.auth.signInWithPassword({ email, password: secret });
    if (auth.error || !auth.data.user) return { ok: false, message: 'Couldn’t open the Burrow. Try again.' };
    return { ok: true, session: await this.sessionFor(auth.data.user.id) };
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  // --------------------------------------------------------------- student
  private async questViews(studentId: string, today: string): Promise<QuestView[]> {
    const qs = unwrap(
      await this.sb.from('quests').select('id, title, kind, due_date, teacher, "when", reward, acorns, completed_at, quest_steps(id, "order", label, minutes, hint, done_at)').eq('student_id', studentId),
    ) as Row[];
    return qs.map((q) => {
      const steps = [...(q.quest_steps as Row[])].sort((a, b) => a.order - b.order);
      const nextStep = steps.findIndex((s) => !s.done_at);
      return {
        id: q.id,
        title: q.title,
        kind: q.kind,
        dueDate: q.due_date,
        dueLabel: dueLabel(today, q.due_date),
        teacher: q.teacher ?? undefined,
        when: q.when ?? undefined,
        reward: q.reward ?? undefined,
        acorns: q.acorns,
        done: !!q.completed_at,
        completedAt: q.completed_at ?? undefined,
        nextStep,
        doneCount: steps.filter((s) => s.done_at).length,
        totalMinutes: steps.reduce((n, s) => n + s.minutes, 0),
        steps: steps.map((s, i) => ({
          id: s.id,
          label: s.label,
          minutes: s.minutes,
          hint: s.hint ?? undefined,
          done: !!s.done_at,
          timeLabel: `${s.minutes} min${s.done_at ? ' · done' : i === nextStep ? ' · next up' : ''}`,
        })),
      } as QuestView & { completedAt?: string };
    });
  }

  async studentHome(s: Session, now: Date): Promise<StudentHome> {
    const me = s.user.id;
    const today = toDateKey(now);
    const [quests, acornRows, todays, streak, sharingRow, parentRow, parents] = await Promise.all([
      this.questViews(me, today),
      this.sb.from('acorns').select('amount').eq('student_id', me).then(unwrap) as Promise<Row[]>,
      this.sb.from('check_ins').select('score').eq('student_id', me).eq('date', today).maybeSingle<Row>().then(unwrap),
      this.sb.rpc('current_streak', { p_student_id: me, p_today: today }).then(unwrap) as Promise<number>,
      this.sb.from('sharing_settings').select('*').eq('student_id', me).maybeSingle<Row>().then(unwrap),
      this.sb.from('family_parents').select('relationship, family_id').limit(1).maybeSingle<Row>().then(unwrap),
      this.sb.rpc('my_parents').then(unwrap) as Promise<{ id: string; name: string }[]>,
    ]);
    const parentName = parents?.[0]?.name?.split(' ')[0];
    const acorns = acornRows.reduce((n, a) => n + a.amount, 0);
    const tonight = (quests as (QuestView & { completedAt?: string })[])
      .filter((q) => q.kind === 'quest')
      .filter((q) => (q.completedAt ? toDateKey(new Date(q.completedAt)) === today : daysBetween(today, q.dueDate) <= 7))
      .sort((a, b) => Number(b.done) - Number(a.done) || a.dueDate.localeCompare(b.dueDate));
    const open = tonight.filter((q) => !q.done);
    const active = open.find((q) => q.steps.length > 1) ?? open[0];
    const boss = quests.filter((q) => q.kind === 'boss' && !q.done && q.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    const sharing: SharingSettings = {
      studentId: me,
      moodTrend: !!sharingRow?.mood_trend,
      questsFinished: !!sharingRow?.quests_finished,
      streakAndLevel: !!sharingRow?.streak_and_level,
      upcomingTests: !!sharingRow?.upcoming_tests,
      updatedAt: sharingRow?.updated_at ?? '',
    };
    return {
      studentId: me,
      firstName: s.user.displayName.split(' ')[0],
      dayLabel: `${weekdayLong(today)} ${partOfDay(now)}`,
      acorns,
      streak,
      level: burrowLevel(acorns),
      todayScore: todays?.score as CheckInScore | undefined,
      tonight,
      activeQuestId: active?.id,
      open: active ? [active, ...open.filter((q) => q.id !== active.id)] : open,
      boss,
      tonightMinutes: open.reduce((n, q) => n + q.totalMinutes, 0),
      parentLabel: parentRow?.relationship ?? parentName ?? 'your parent',
      sharing,
    };
  }

  async ownNoteForToday(s: Session, now: Date) {
    const ci = unwrap(await this.sb.from('check_ins').select('id').eq('student_id', s.user.id).eq('date', toDateKey(now)).maybeSingle<Row>());
    if (!ci) return '';
    const n = unwrap(await this.sb.from('private_notes').select('text').eq('check_in_id', ci.id).maybeSingle<Row>());
    return n?.text ?? '';
  }
  async submitCheckIn(_s: Session, score: CheckInScore, note: string) {
    unwrap(await this.sb.rpc('submit_check_in', { p_score: score, p_note: note }));
  }
  async toggleQuestStep(_s: Session, stepId: string) {
    unwrap(await this.sb.rpc('toggle_quest_step', { p_step_id: stepId }));
  }
  async setSharing(s: Session, key: SharingKey, value: boolean) {
    unwrap(await this.sb.from('sharing_settings').update({ [SHARE_COL[key]]: value, updated_at: new Date().toISOString() }).eq('student_id', s.user.id));
    log.audit('sharing.update', { key, value });
  }
  async previewParentSummary(s: Session, now: Date) {
    return this.summary(s.user.id, now);
  }

  // ---------------------------------------------------------------- parent
  private async summary(studentId: string, now: Date): Promise<ParentWeeklySummary> {
    const today = toDateKey(now);
    const r = unwrap(await this.sb.rpc('parent_weekly_summary', { p_student_id: studentId, p_today: today })) as Row;
    const out: ParentWeeklySummary = {
      studentId,
      studentName: r.studentName,
      weekLabel: rangeLabel(r.weekStart, r.weekEnd),
      trySaying: '“What was the best part of your week?”',
      hidden: r.hidden ?? [],
    };
    if (r.checkIns) out.checkIns = r.checkIns;
    if (r.moodWeeks) out.moodWeeks = (r.moodWeeks as Row[]).map((w) => ({ label: monthDay(w.weekStart), avg: w.avg === null ? null : Number(w.avg), current: !!w.current }));
    if (r.watch) out.watch = r.watch;
    if (r.questsFinished !== undefined) {
      out.questsFinished = Number(r.questsFinished);
      if (out.questsFinished) {
        const early = Number(r.questsEarly ?? 0);
        out.win = `Finished ${out.questsFinished} quest${out.questsFinished === 1 ? '' : 's'} this week` + (early ? `, ${early} of them ahead of the due date.` : '.');
      }
    }
    if (r.streak !== undefined) {
      out.streak = Number(r.streak);
      out.level = burrowLevel(Number(r.acorns ?? 0)).level;
      if (out.streak >= 5) out.win = out.win ? `${out.win} Kept a ${out.streak}-day streak going.` : `Kept a ${out.streak}-day check-in streak going.`;
    }
    if (r.upcomingTests) {
      out.upcomingTests = (r.upcomingTests as Row[]).map((t) => ({ title: t.title, dueLabel: dueLabel(today, t.dueDate) }));
      const next = out.upcomingTests[0];
      if (next && out.watch) out.watch = out.watch.replace(/\.( Not a pattern yet\.)?$/, `, with ${next.title} ${next.dueLabel === 'today' || next.dueLabel === 'tomorrow' ? next.dueLabel : `on ${next.dueLabel}`}.$1`);
    }
    if (r.heavier && out.upcomingTests?.[0]) out.trySaying = `“${out.upcomingTests[0].title} is coming up. Want to plan one small step together?”`;
    else if (r.heavier) out.trySaying = '“This week sounded like a lot. What would make tomorrow a little lighter?”';
    else if (out.questsFinished) out.trySaying = `“You finished ${out.questsFinished} quest${out.questsFinished === 1 ? '' : 's'} this week. Which one are you proudest of?”`;
    else if (out.streak) out.trySaying = `“${out.streak} days in a row with Pip. How’s the Burrow looking?”`;
    return out;
  }

  async parentChildren(_s: Session): Promise<ChildSummary[]> {
    // RLS limits this to the families this parent belongs to.
    const rows = unwrap(await this.sb.from('family_students').select('user_id, users(display_name, username, role)')) as Row[];
    return rows
      .filter((r) => r.users?.role === 'student')
      .map((r) => ({ id: r.user_id, name: String(r.users?.display_name ?? '').split(' ')[0], username: r.users?.username ?? undefined }));
  }
  async parentWeeklySummary(_s: Session, studentId: string, now: Date) {
    return this.summary(studentId, now);
  }
  async helpContacts(): Promise<HelpContact[]> {
    const rows = unwrap(await this.sb.from('help_contacts').select('*')) as Row[];
    return rows.map((r) => ({ id: r.id, familyId: r.family_id, name: r.name, sub: r.sub, tag: r.tag, draft: r.draft }));
  }
  async sendCheer(_s: Session, studentId: string) {
    unwrap(await this.sb.rpc('send_cheer', { p_student_id: studentId }));
  }
  async recordConsent(s: Session, input: { childFirstName: string; childBirthDate: string; method: ParentalConsent['method']; agreed: boolean }) {
    return unwrap(
      await this.sb.rpc('record_parental_consent', {
        p_family_id: s.familyId,
        p_child_first_name: input.childFirstName,
        p_child_birth_date: input.childBirthDate,
        p_method: input.method,
        p_notice_version: CONSENT_NOTICE_VERSION,
        p_agreed: input.agreed,
      }),
    ) as string;
  }
  async createStudent(s: Session, input: { firstName: string; lastName: string; birthDate: string; grade?: number; consentId?: string }) {
    return unwrap(
      await this.sb.rpc('create_student', {
        p_family_id: s.familyId,
        p_first_name: input.firstName,
        p_last_name: input.lastName,
        p_birth_date: input.birthDate,
        p_grade: input.grade ?? null,
        p_consent_id: input.consentId ?? null,
      }),
    ) as string;
  }
  async setAdminOptIn(s: Session, optIn: boolean) {
    unwrap(await this.sb.rpc('set_family_admin_opt_in', { p_family_id: s.familyId, p_opt_in: optIn }));
  }
  async familyOptIn(s: Session) {
    const f = unwrap(await this.sb.from('families').select('admin_opt_in').eq('id', s.familyId!).maybeSingle<Row>());
    return !!f?.admin_opt_in;
  }
  async deleteStudent(_s: Session, studentId: string) {
    unwrap(await this.sb.rpc('revoke_consent_and_delete_student', { p_student_id: studentId }));
  }

  // ----------------------------------------------------------------- admin
  async adminDashboard(s: Session, now: Date): Promise<AdminDashboard> {
    const today = toDateKey(now);
    const [rows, weeks, org, fams, refs] = await Promise.all([
      this.sb.rpc('admin_family_rows', { p_today: today }).then(unwrap) as Promise<Row[]>,
      this.sb.rpc('admin_self_starters', { p_today: today }).then(unwrap) as Promise<Row[]>,
      this.sb.from('orgs').select('name').eq('id', s.user.orgId!).maybeSingle<Row>().then(unwrap),
      this.sb.from('families').select('id, enrolled_at').then(unwrap) as Promise<Row[]>,
      this.sb.from('referrals').select('id, student_id, target, target_label, status, "when", created_at, users(display_name)').neq('status', 'closed').order('created_at', { ascending: false }).then(unwrap) as Promise<Row[]>,
    ]);
    const STATUS: Record<string, string> = { requested: 'Requested', waitlist: 'Waitlist', booked: 'Booked', scheduled: 'Scheduled' };
    const monthAgo = addDays(today, -30);
    const initial = (n: string) => {
      const p = n.trim().split(/\s+/);
      return p.length < 2 ? n : `${p[0][0]}. ${p.slice(1).join(' ')}`;
    };
    const sw = weeks.map((w) => ({ label: monthDay(w.week_start), pct: Number(w.pct) }));
    return {
      orgName: org?.name ?? '',
      adminName: s.user.displayName,
      weekOf: monthDay(addDays(weekStart(today), -7)),
      enrolled: fams.length,
      newThisMonth: fams.filter((f) => toDateKey(new Date(f.enrolled_at)) >= monthAgo).length,
      selfStarterPct: sw[sw.length - 1]?.pct ?? 0,
      needFollowUp: rows.filter((r) => r.flag).length,
      openReferrals: refs.length,
      waitingOnClinic: refs.filter((r) => r.target === 'clinic' && r.status === 'waitlist').length,
      selfStarterWeeks: sw,
      rows: rows.map(
        (r): AdminFamilyRow => ({
          studentId: r.student_id,
          familyId: r.family_id,
          name: r.name,
          grade: String(r.grade ?? '–'),
          pattern: r.pattern,
          status: r.status as FamilyStatus,
          flag: !!r.flag,
          action: r.action,
          shares: r.shares ?? [],
          coachSuggested: !!r.coach_suggested,
        }),
      ),
      referralQueue: refs.map((r) => ({
        id: r.id,
        label: `${initial(r.users?.display_name ?? '')} → ${r.target_label}`,
        status: r.when ?? STATUS[r.status] ?? r.status,
        highlight: r.status === 'booked',
      })),
    };
  }
  async adminSuggestCoach(_s: Session, studentId: string) {
    unwrap(await this.sb.rpc('admin_suggest_coach', { p_student_id: studentId }));
  }
}

function friendlyAuth(msg: string): string {
  if (/rate limit|too many/i.test(msg)) return 'Too many tries. Wait a minute and try again.';
  if (/already registered|already been registered|already exists/i.test(msg)) return 'There’s already an account with that email. Sign in instead.';
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/password should be at least|weak|at least 6/i.test(msg)) return 'Use a password of at least 8 characters.';
  if (/email address .* is invalid/i.test(msg)) return 'That email address doesn’t look right.';
  if (/network|fetch/i.test(msg)) return new BackendError('NETWORK', '').message || 'Can’t reach EarlySignal right now.';
  return msg;
}
