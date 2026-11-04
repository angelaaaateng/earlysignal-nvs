import { familyOfStudent, firstName, requireRole } from './access';
import { daysBetween, dueLabel, partOfDay, toDateKey, weekdayLong } from './dates';
import { acornBalance, burrowLevel, currentStreak, type BurrowLevel } from './rewards';
import type { CheckInScore, Db, DateKey, Quest, QuestStep, SharingSettings } from './types';

export interface StepView {
  id: string;
  label: string;
  minutes: number;
  hint?: string;
  done: boolean;
  /** "10 min · done", "15 min · next up", "15 min" */
  timeLabel: string;
}

export interface QuestView {
  id: string;
  title: string;
  kind: Quest['kind'];
  dueDate: DateKey;
  dueLabel: string;
  teacher?: string;
  when?: string;
  reward?: string;
  acorns: number;
  steps: StepView[];
  doneCount: number;
  totalMinutes: number;
  done: boolean;
  /** Index of the next step to do, or -1 when done. */
  nextStep: number;
}

export const CHECK_IN_LEVELS: {
  n: CheckInScore;
  label: string;
  weather: string;
  reply: string;
  cta: string;
  sky: string;
}[] = [
  { n: 1, label: 'Light', weather: 'Sunny in the Burrow', reply: 'Nice! Want to get ahead on something?', cta: 'Plan a light night', sky: '#5E7F46' },
  { n: 2, label: 'Okay', weather: 'Clear skies', reply: 'Steady day. Let’s keep it that way.', cta: 'See tonight’s plan', sky: '#4A6E5B' },
  { n: 3, label: 'Medium', weather: 'A few clouds', reply: 'Got it. We’ll start with the hardest thing first.', cta: 'See tonight’s plan', sky: '#5A4A38' },
  { n: 4, label: 'Heavy', weather: 'Cloudy in the Burrow', reply: 'That’s a lot. Let’s break it into tiny steps.', cta: 'Make it smaller', sky: '#3A2416' },
  { n: 5, label: 'A lot', weather: 'Stormy in the Burrow', reply: 'Thanks for telling me. Let’s pick just ONE thing tonight.', cta: 'Pick one thing', sky: '#2A1B12' },
];

function stepsOf(db: Db, questId: string): QuestStep[] {
  return db.questSteps.filter((s) => s.questId === questId).sort((a, b) => a.order - b.order);
}

export function questView(db: Db, q: Quest, today: DateKey): QuestView {
  const steps = stepsOf(db, q.id);
  const nextStep = steps.findIndex((s) => !s.doneAt);
  return {
    id: q.id,
    title: q.title,
    kind: q.kind,
    dueDate: q.dueDate,
    dueLabel: dueLabel(today, q.dueDate),
    teacher: q.teacher,
    when: q.when,
    reward: q.reward,
    acorns: q.acorns,
    done: !!q.completedAt,
    nextStep,
    doneCount: steps.filter((s) => s.doneAt).length,
    totalMinutes: steps.reduce((n, s) => n + s.minutes, 0),
    steps: steps.map((s, i) => ({
      id: s.id,
      label: s.label,
      minutes: s.minutes,
      hint: s.hint,
      done: !!s.doneAt,
      timeLabel: `${s.minutes} min${s.doneAt ? ' · done' : i === nextStep ? ' · next up' : ''}`,
    })),
  };
}

export interface StudentHome {
  studentId: string;
  firstName: string;
  /** "Tuesday evening" */
  dayLabel: string;
  acorns: number;
  streak: number;
  level: BurrowLevel;
  todayScore?: CheckInScore;
  /** Tonight's regular quests: finished-today first, then by due date. */
  tonight: QuestView[];
  /** The quest to feature (first open multi-step one), if any. */
  activeQuestId?: string;
  /** Open quests only, for the planner. */
  open: QuestView[];
  boss?: QuestView;
  tonightMinutes: number;
  /** How the student refers to their first parent, e.g. "Mom". */
  parentLabel: string;
  sharing: SharingSettings;
}

/** The student's own view. Only the student themself may call this. */
export function studentHome(db: Db, viewerId: string, now: Date): StudentHome {
  const me = requireRole(db, viewerId, 'student');
  const today = toDateKey(now);
  const mine = db.quests.filter((q) => q.studentId === me.id);

  const tonight = mine
    .filter((q) => q.kind === 'quest')
    .filter((q) => (q.completedAt ? toDateKey(new Date(q.completedAt)) === today : daysBetween(today, q.dueDate) <= 7))
    .map((q) => questView(db, q, today))
    .sort((a, b) => Number(b.done) - Number(a.done) || a.dueDate.localeCompare(b.dueDate));
  const open = tonight.filter((q) => !q.done);
  const active = open.find((q) => q.steps.length > 1) ?? open[0];

  const boss = mine
    .filter((q) => q.kind === 'boss' && !q.completedAt && q.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  const fam = familyOfStudent(db, me.id);
  const acorns = acornBalance(db, me.id);
  const todays = db.checkIns.find((c) => c.studentId === me.id && c.date === today);
  const sharing = db.sharing.find((s) => s.studentId === me.id)!;

  return {
    studentId: me.id,
    firstName: firstName(me.displayName),
    dayLabel: `${weekdayLong(today)} ${partOfDay(now)}`,
    acorns,
    streak: currentStreak(db, me.id, today),
    level: burrowLevel(acorns),
    todayScore: todays?.score,
    tonight,
    activeQuestId: active?.id,
    open: active ? [active, ...open.filter((q) => q.id !== active.id)] : open,
    boss: boss ? questView(db, boss, today) : undefined,
    tonightMinutes: open.reduce((n, q) => n + q.totalMinutes, 0),
    parentLabel: fam?.parents[0]?.relationship ?? 'Your parent',
    sharing,
  };
}

/** The student's own private note for today. Only the student may read it. */
export function ownNoteForToday(db: Db, viewerId: string, now: Date): string {
  const me = requireRole(db, viewerId, 'student');
  const today = toDateKey(now);
  const ci = db.checkIns.find((c) => c.studentId === me.id && c.date === today);
  if (!ci) return '';
  return db.privateNotes.find((n) => n.checkInId === ci.id && n.studentId === me.id)?.text ?? '';
}

/** Why Pip split the quest, tied to today's check-in. */
export function splitReason(score?: CheckInScore): string | undefined {
  if (score === 4) return 'you said today feels heavy';
  if (score === 5) return 'you said today is a lot';
  return undefined;
}
