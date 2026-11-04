/**
 * Mock data, generated relative to "now" so the app always looks current.
 * Deterministic: the same `now` always yields the same Db.
 */
import { addDays, fromDateKey, toDateKey } from '../domain/dates';
import { defaultSharing } from '../domain/coppa';
import type {
  AcornEntry, CheckIn, CheckInScore, Db, Family, HelpContact, PrivateNote, Quest, QuestStep, Referral, SharingSettings, User,
} from '../domain/types';

export const IDS = {
  maya: 'stu_maya',
  mom: 'par_ana',
  patel: 'adm_patel',
  lincoln: 'org_lincoln',
  mayaFamily: 'fam_santos',
} as const;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Liam', 'Noah', 'Emma', 'Olivia', 'Aiden', 'Sofia', 'Ethan', 'Mia', 'Lucas', 'Zara', 'Leo', 'Nora', 'Kai', 'Isla', 'Omar', 'Priya', 'Jonah', 'Ruby', 'Mateo', 'Hana', 'Eli', 'Grace', 'Theo', 'Ada'];
const LAST = ['Nguyen', 'Kim', 'Osei', 'Garcia', 'Brooks', 'Silva', 'Ward', 'Ito', 'Mensah', 'Reyes', 'Cohen', 'Ali', 'Park', 'Hughes', 'Baker', 'Diaz', 'Foster', 'Shah', 'Moreno', 'Lee', 'Price', 'Khan', 'Ross', 'Young'];

export function buildSeed(now: Date): Db {
  const rnd = mulberry32(20261104);
  const today = toDateKey(now);
  const iso = (dayOffset: number, hour = 17, min = 0) => {
    const d = fromDateKey(addDays(today, dayOffset));
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };
  const dowToday = (fromDateKey(today).getDay() + 6) % 7; // Mon=0
  const friday = addDays(today, ((4 - dowToday + 7) % 7) || 7);

  const users: User[] = [];
  const families: Family[] = [];
  const checkIns: CheckIn[] = [];
  const privateNotes: PrivateNote[] = [];
  const quests: Quest[] = [];
  const questSteps: QuestStep[] = [];
  const acorns: AcornEntry[] = [];
  const sharing: SharingSettings[] = [];
  const referrals: Referral[] = [];
  const helpContacts: HelpContact[] = [];

  let seq = 0;
  const id = (p: string) => `${p}_${++seq}`;

  const addCheckIn = (studentId: string, dayOffset: number, score: CheckInScore) => {
    const c: CheckIn = { id: id('ci'), studentId, date: addDays(today, dayOffset), score, createdAt: iso(dayOffset, 16, 30) };
    checkIns.push(c);
    acorns.push({ id: id('ac'), studentId, amount: 5, reason: 'check_in', refId: c.id, at: c.createdAt });
    return c;
  };

  const addQuest = (q: Omit<Quest, 'id' | 'createdAt'> & { createdOffset?: number }, steps: { label: string; minutes: number; hint?: string; doneOffset?: number }[]) => {
    const quest: Quest = { ...q, id: id('q'), createdAt: iso(q.createdOffset ?? -3, 15) };
    delete (quest as { createdOffset?: number }).createdOffset;
    quests.push(quest);
    steps.forEach((s, i) =>
      questSteps.push({
        id: id('step'), questId: quest.id, order: i, label: s.label, minutes: s.minutes, hint: s.hint,
        doneAt: s.doneOffset === undefined ? undefined : iso(s.doneOffset, 18),
      }),
    );
    if (quest.completedAt) {
      acorns.push({ id: id('ac'), studentId: quest.studentId, amount: quest.acorns, reason: 'quest', refId: quest.id, at: quest.completedAt });
    }
    return quest;
  };

  // ---- Org, admin --------------------------------------------------------
  const orgs = [{ id: IDS.lincoln, name: 'Lincoln Middle School', kind: 'school' as const }];
  users.push({ id: IDS.patel, role: 'admin', displayName: 'Ms. Patel', orgId: IDS.lincoln, createdAt: iso(-200) });

  // ---- Maya's family (the demo student + parent) -------------------------
  const mayaBirth = `${fromDateKey(today).getFullYear() - 11}-03-14`;
  users.push({ id: IDS.maya, role: 'student', displayName: 'Maya Santos', birthDate: mayaBirth, grade: 6, createdAt: iso(-60) });
  users.push({ id: IDS.mom, role: 'parent', displayName: 'Ana Santos', createdAt: iso(-61) });
  families.push({
    id: IDS.mayaFamily, parents: [{ userId: IDS.mom, relationship: 'Mom' }], studentIds: [IDS.maya],
    orgId: IDS.lincoln, adminOptIn: true, enrolledAt: iso(-61),
  });
  const consents = [{
    id: 'consent_maya', parentId: IDS.mom, familyId: IDS.mayaFamily, childFirstName: 'Maya', childBirthDate: mayaBirth,
    method: 'card_check' as const, noticeVersion: '2026-11-v1', grantedAt: iso(-61, 9), studentId: IDS.maya,
  }];
  sharing.push(defaultSharing(IDS.maya, iso(-60)));

  // 9-day streak through yesterday; lighter weeks before, a little heavier this week.
  for (let d = -35; d <= -11; d++) { // day -10 stays empty so the streak is exactly 9
    if (rnd() < 0.65) addCheckIn(IDS.maya, d, (1 + Math.floor(rnd() * 3)) as CheckInScore);
  }
  const recent: CheckInScore[] = [2, 3, 2, 2, 3, 2, 3, 3, 4];
  recent.forEach((s, i) => addCheckIn(IDS.maya, -9 + i, s));
  const n1 = checkIns[checkIns.length - 1];
  privateNotes.push({ id: id('note'), checkInId: n1.id, studentId: IDS.maya, text: 'nervous about the science quiz, didn’t tell anyone', createdAt: n1.createdAt });

  // Tonight's quests (canvas: Burrow + Quests)
  addQuest({ studentId: IDS.maya, title: 'Math worksheet 4.2', kind: 'quest', dueDate: addDays(today, 1), acorns: 10, completedAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), createdOffset: -1 },
    [{ label: 'Math worksheet 4.2', minutes: 20, doneOffset: 0 }]);
  addQuest({ studentId: IDS.maya, title: 'Science lab write-up', kind: 'quest', dueDate: addDays(today, 1), teacher: 'Ms. Ortiz', acorns: 15, createdOffset: -2 }, [
    { label: 'Fill in the data table', minutes: 10, doneOffset: 0, hint: 'Copy each measurement from your lab sheet into its row first.' },
    { label: 'Write 3 sentences: what happened?', minutes: 15, hint: 'Start with “First, we…”. Then say what changed, and what you noticed at the end.' },
    { label: 'Answer the 2 conclusion questions', minutes: 15, hint: 'Look back at your data table. Which number changed the most?' },
  ]);
  addQuest({ studentId: IDS.maya, title: 'Read ch. 6, Hatchet', kind: 'quest', dueDate: addDays(today, 1), acorns: 5, when: 'before bed', createdOffset: -1 },
    [{ label: 'Read ch. 6, Hatchet', minutes: 15, hint: 'Pause after each page and picture where Brian is.' }]);
  addQuest({ studentId: IDS.maya, title: 'Science quiz: Cells', kind: 'boss', dueDate: friday, acorns: 30, reward: 'rare item waiting', createdOffset: -5 }, [
    { label: 'List the parts of a cell', minutes: 10, doneOffset: -3 },
    { label: 'Make 10 flashcards', minutes: 15, doneOffset: -1 },
    { label: 'Quiz yourself with the flashcards', minutes: 15 },
    { label: 'Explain mitosis to someone', minutes: 10 },
  ]);
  // Finished earlier this week and in past weeks (feeds "quests finished").
  for (let d = -34; d <= -1; d++) {
    if (rnd() < 0.45 || (d >= -dowToday && d < 0)) {
      const dueIn = rnd() < 0.3 ? 2 : 0;
      addQuest({ studentId: IDS.maya, title: 'Homework', kind: 'quest', dueDate: addDays(today, d + dueIn), acorns: 5, completedAt: iso(d, 18), createdOffset: d - 1 },
        [{ label: 'Homework', minutes: 15, doneOffset: d }]);
    }
  }
  // Top up to the canvas balance of 124 acorns.
  const mayaAcorns = acorns.filter((a) => a.studentId === IDS.maya).reduce((n, a) => n + a.amount, 0);
  if (mayaAcorns !== 124) acorns.push({ id: id('ac'), studentId: IDS.maya, amount: 124 - mayaAcorns, reason: 'bonus', at: iso(-30) });

  helpContacts.push(
    { id: 'help_1', familyId: IDS.mayaFamily, name: 'School counselor', sub: 'Ms. Patel · Lincoln Middle School', tag: 'Free',
      draft: 'Hi Ms. Patel,\nMaya has said school feels heavy most days this month, especially before quizzes. Could we find 15 minutes to talk about what you’re seeing?' },
    { id: 'help_2', familyId: IDS.mayaFamily, name: 'Executive-function coach', sub: 'Vetted coaches near you', tag: 'Paid',
      draft: 'Hi,\nMy 6th grader struggles with planning and starting homework. Do you have openings for a first session?' },
    { id: 'help_3', familyId: IDS.mayaFamily, name: 'Partner clinic', sub: '[Partner clinic name]', tag: 'Referral',
      draft: 'Hello,\nWe were referred by our school. My daughter has had high stress about school for several weeks. Could we join your intake list?' },
  );

  // ---- School roster ----------------------------------------------------
  const addFamily = (name: string, grade: number, opts: { optIn?: boolean; enrolled?: number; share?: Partial<SharingSettings> } = {}) => {
    const sid = id('stu');
    const pid = id('par');
    users.push({ id: sid, role: 'student', displayName: name, grade, birthDate: `${fromDateKey(today).getFullYear() - 6 - grade}-06-01`, createdAt: iso(opts.enrolled ?? -90) });
    users.push({ id: pid, role: 'parent', displayName: `Parent of ${name.split(' ')[0]}`, createdAt: iso(opts.enrolled ?? -90) });
    const fid = id('fam');
    families.push({ id: fid, parents: [{ userId: pid, relationship: 'Mom' }], studentIds: [sid], orgId: IDS.lincoln, adminOptIn: opts.optIn ?? true, enrolledAt: iso(opts.enrolled ?? -90) });
    sharing.push({ ...defaultSharing(sid, iso(-90)), ...opts.share });
    return { sid, fid };
  };
  const ref = (fid: string, sid: string, target: Referral['target'], targetLabel: string, status: Referral['status'], created: number, when?: string) =>
    referrals.push({ id: id('ref'), familyId: fid, studentId: sid, orgId: IDS.lincoln, target, targetLabel, status, when, createdAt: iso(created, 10) });

  const allOn = { moodTrend: true, questsFinished: true, streakAndLevel: true, upcomingTests: true };

  const chen = addFamily('Ava Chen', 7, { share: allOn });
  for (let d = -24; d <= -1; d++) if (rnd() < 0.85) addCheckIn(chen.sid, d, (rnd() < 0.75 ? 4 + Math.floor(rnd() * 2) : 3) as CheckInScore);
  ref(chen.fid, chen.sid, 'clinic', '[Partner clinic]', 'waitlist', -6);

  const okafor = addFamily('David Okafor', 6, { share: allOn });
  for (let d = -30; d <= -9; d++) if (rnd() < 0.7) addCheckIn(okafor.sid, d, 3);
  addCheckIn(okafor.sid, -9, 3);
  ref(okafor.fid, okafor.sid, 'counselor', 'Counselor', 'scheduled', -1, 'Today 2pm');

  const haddad = addFamily('Sami Haddad', 8, { share: allOn });
  for (let d = -20; d <= -1; d++) if (rnd() < 0.6) addCheckIn(haddad.sid, d, 2);
  addCheckIn(haddad.sid, -1, 2);
  [-26, -12].forEach((due) =>
    addQuest({ studentId: haddad.sid, title: 'Unit test', kind: 'boss', dueDate: addDays(today, due), acorns: 30, createdOffset: due - 6 }, [
      { label: 'Review notes', minutes: 15, doneOffset: due - 3 },
      { label: 'Practice problems', minutes: 20 },
      { label: 'Self-quiz', minutes: 10 },
    ]),
  );

  const rivera = addFamily('Jordan Rivera', 7, { share: allOn });
  for (let d = -11; d <= -1; d++) addCheckIn(rivera.sid, d, 2);
  addCheckIn(rivera.sid, 0, 2);
  ref(rivera.fid, rivera.sid, 'ef_coach', 'EF coach', 'booked', -10);

  const lopez = addFamily('Marco Lopez', 6, { share: allOn });
  for (let d = -28; d <= -15; d++) if (rnd() < 0.8) addCheckIn(lopez.sid, d, 4);
  for (let d = -14; d <= -1; d++) if (rnd() < 0.8) addCheckIn(lopez.sid, d, (2 + Math.floor(rnd() * 2)) as CheckInScore);
  addCheckIn(lopez.sid, -1, 2);
  ref(lopez.fid, lopez.sid, 'ef_coach', 'EF coach', 'booked', -25);

  // 42 more opted-in families with a self-start rate that climbs over six weeks.
  for (let i = 0; i < 42; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i + Math.floor(i / FIRST.length) * 5) % LAST.length]}`;
    const grade = 6 + (i % 3);
    const privateKid = i % 14 === 13;
    const fam = addFamily(name, grade, {
      enrolled: i < 5 ? -3 - i * 5 : -45 - i,
      share: privateKid ? { moodTrend: false, questsFinished: false, streakAndLevel: false, upcomingTests: false } : undefined,
    });
    const propensity = 0.22 + rnd() * 0.3;
    for (let back = 6; back >= 1; back--) {
      const p = Math.min(0.95, propensity + (6 - back) * 0.04);
      for (let wd = 0; wd < 5; wd++) {
        const d = -dowToday - 7 * back + wd;
        if (rnd() < p) addCheckIn(fam.sid, d, (1 + Math.floor(rnd() * 3)) as CheckInScore);
      }
    }
    for (let d = -dowToday; d < 0; d++) if (rnd() < propensity) addCheckIn(fam.sid, d, (1 + Math.floor(rnd() * 3)) as CheckInScore);
    if (!checkIns.some((c) => c.studentId === fam.sid && c.date >= addDays(today, -3))) addCheckIn(fam.sid, -2, 2);
    if (i === 7) ref(fam.fid, fam.sid, 'clinic', '[Partner clinic]', 'waitlist', -3);
  }

  // Families at the same school that did NOT opt in. Admins must never see them.
  for (let i = 0; i < 4; i++) {
    const fam = addFamily(`Hidden ${LAST[i]}`, 7, { optIn: false, share: allOn });
    for (let d = -20; d <= -1; d++) addCheckIn(fam.sid, d, 5);
    const c = checkIns[checkIns.length - 1];
    privateNotes.push({ id: id('note'), checkInId: c.id, studentId: fam.sid, text: `private note of non-opted family ${i}`, createdAt: c.createdAt });
  }

  return {
    users, orgs, families, consents, checkIns, privateNotes, quests, questSteps, acorns, sharing,
    cheers: [], referrals, helpContacts,
  };
}
