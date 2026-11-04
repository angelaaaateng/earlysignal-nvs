import { buildSeed, IDS } from '../../data/seed';
import { AccessDenied } from '../access';
import { adminDashboard } from '../admin';
import { ConsentRequiredError, createStudentAccount, recordParentalConsent } from '../coppa';
import { addDays, toDateKey } from '../dates';
import { adminSuggestCoach, sendCheer, setSharing, submitCheckIn, toggleQuestStep } from '../mutations';
import { parentWeeklySummary, previewOwnParentSummary } from '../parent';
import { burrowLevel } from '../rewards';
import { ownNoteForToday, studentHome } from '../student';
import type { Db } from '../types';

const NOW = new Date(2026, 10, 4, 19, 30); // Wed Nov 4 2026, evening
const fresh = (): Db => buildSeed(NOW);

describe('Rule: parents see only what the student shares', () => {
  it('omits every field whose sharing toggle is off', () => {
    let db = fresh();
    for (const k of ['moodTrend', 'questsFinished', 'streakAndLevel', 'upcomingTests'] as const) {
      db = setSharing(db, IDS.maya, IDS.maya, k, false, NOW);
    }
    const s = parentWeeklySummary(db, IDS.mom, IDS.maya, NOW);
    expect(s.checkIns).toBeUndefined();
    expect(s.moodWeeks).toBeUndefined();
    expect(s.questsFinished).toBeUndefined();
    expect(s.streak).toBeUndefined();
    expect(s.level).toBeUndefined();
    expect(s.upcomingTests).toBeUndefined();
    expect(s.win).toBeUndefined();
    expect(s.watch).toBeUndefined();
    expect(s.hidden).toHaveLength(4);
  });

  it('shows weekly averages, never a single day’s score', () => {
    const db = fresh();
    const s = parentWeeklySummary(db, IDS.mom, IDS.maya, NOW);
    expect(s.moodWeeks).toHaveLength(5);
    // No field is keyed by day, and nothing carries a raw check-in record.
    const json = JSON.stringify(s);
    expect(json).not.toMatch(/"score"/);
    expect(json).not.toMatch(/"date"/);
  });

  it('hides upcoming tests by default (the student’s fourth toggle is off)', () => {
    const s = parentWeeklySummary(fresh(), IDS.mom, IDS.maya, NOW);
    expect(s.upcomingTests).toBeUndefined();
    expect(s.watch ?? '').not.toMatch(/quiz/i);
  });

  it('reflects a toggle the moment the student flips it', () => {
    const db = setSharing(fresh(), IDS.maya, IDS.maya, 'upcomingTests', true, NOW);
    const s = parentWeeklySummary(db, IDS.mom, IDS.maya, NOW);
    expect(s.upcomingTests?.[0]?.title).toBe('Science quiz: Cells');
  });

  it('refuses a parent who is not in the student’s family', () => {
    const db = fresh();
    const stranger = db.users.find((u) => u.role === 'parent' && u.id !== IDS.mom)!;
    expect(() => parentWeeklySummary(db, stranger.id, IDS.maya, NOW)).toThrow(AccessDenied);
    expect(() => sendCheer(db, stranger.id, IDS.maya, NOW)).toThrow(AccessDenied);
  });

  it('lets only the student change sharing', () => {
    const db = fresh();
    expect(() => setSharing(db, IDS.mom, IDS.maya, 'moodTrend', false, NOW)).toThrow(AccessDenied);
    expect(() => setSharing(db, IDS.patel, IDS.maya, 'moodTrend', false, NOW)).toThrow(AccessDenied);
  });
});

describe('Rule: admins see only families that opted in', () => {
  it('excludes non-opted families from rows, counts and referrals', () => {
    const db = fresh();
    const d = adminDashboard(db, IDS.patel, NOW);
    const hidden = db.families.filter((f) => !f.adminOptIn);
    expect(hidden.length).toBeGreaterThan(0);
    const hiddenStudents = new Set(hidden.flatMap((f) => f.studentIds));
    expect(d.rows.some((r) => hiddenStudents.has(r.studentId))).toBe(false);
    expect(JSON.stringify(d)).not.toMatch(/Hidden/);
    expect(d.enrolled).toBe(db.families.filter((f) => f.adminOptIn && f.orgId === IDS.lincoln).length);
  });

  it('drops a family the moment it opts out', () => {
    let db = fresh();
    db = { ...db, families: db.families.map((f) => (f.id === IDS.mayaFamily ? { ...f, adminOptIn: false } : f)) };
    const d = adminDashboard(db, IDS.patel, NOW);
    expect(d.rows.some((r) => r.studentId === IDS.maya)).toBe(false);
    expect(() => adminSuggestCoach(db, IDS.patel, IDS.maya, NOW)).toThrow(AccessDenied);
  });

  it('applies the student’s own sharing settings inside opted-in families', () => {
    let db = fresh();
    for (const k of ['moodTrend', 'questsFinished', 'streakAndLevel', 'upcomingTests'] as const) {
      db = setSharing(db, IDS.maya, IDS.maya, k, false, NOW);
    }
    const row = adminDashboard(db, IDS.patel, NOW).rows.find((r) => r.studentId === IDS.maya)!;
    expect(row.status).toBe('Private');
  });

  it('flags the canvas patterns from shared data', () => {
    const rows = adminDashboard(fresh(), IDS.patel, NOW).rows;
    const by = (n: string) => rows.find((r) => r.name === n)!;
    expect(by('A. Chen').pattern).toBe('Stress 4+ on most days for 3 weeks');
    expect(by('D. Okafor').pattern).toBe('Check-ins stopped 9 days ago');
    expect(by('S. Haddad').pattern).toBe('Missed quest steps before every test');
    expect(by('J. Rivera').pattern).toBe('Steady; 12-day streak');
    expect(by('M. Lopez').status).toBe('Improving');
  });

  it('refuses non-admins', () => {
    expect(() => adminDashboard(fresh(), IDS.mom, NOW)).toThrow(AccessDenied);
  });
});

describe('Rule: private notes are never shared', () => {
  it('never appears in parent or admin output', () => {
    let db = fresh();
    db = submitCheckIn(db, IDS.maya, 5, 'SECRET-NOTE-XYZ', NOW);
    for (const k of ['moodTrend', 'questsFinished', 'streakAndLevel', 'upcomingTests'] as const) {
      db = setSharing(db, IDS.maya, IDS.maya, k, true, NOW);
    }
    const all = JSON.stringify([parentWeeklySummary(db, IDS.mom, IDS.maya, NOW), adminDashboard(db, IDS.patel, NOW)]);
    expect(all).not.toMatch(/SECRET-NOTE-XYZ/);
    for (const n of db.privateNotes) expect(all).not.toContain(n.text);
  });

  it('can be read back by the student only', () => {
    const db = submitCheckIn(fresh(), IDS.maya, 3, 'just for Pip', NOW);
    expect(ownNoteForToday(db, IDS.maya, NOW)).toBe('just for Pip');
    expect(() => ownNoteForToday(db, IDS.mom, NOW)).toThrow(AccessDenied);
    expect(() => ownNoteForToday(db, IDS.patel, NOW)).toThrow(AccessDenied);
  });
});

describe('Rule: COPPA consent before any under-13 account exists', () => {
  const tenYearOld = `${NOW.getFullYear() - 10}-01-15`;

  it('refuses an under-13 account without consent, and creates nothing', () => {
    const db = fresh();
    const before = db.users.length;
    expect(() =>
      createStudentAccount(db, IDS.mom, { familyId: IDS.mayaFamily, firstName: 'Leo', lastName: 'Santos', birthDate: tenYearOld }, NOW),
    ).toThrow(ConsentRequiredError);
    expect(db.users.length).toBe(before);
  });

  it('creates the account once a matching consent is recorded', () => {
    const { db: withConsent, consent } = recordParentalConsent(
      fresh(), IDS.mom,
      { familyId: IDS.mayaFamily, childFirstName: 'Leo', childBirthDate: tenYearOld, method: 'card_check', agreedToNotice: true }, NOW,
    );
    const { db, student } = createStudentAccount(
      withConsent, IDS.mom,
      { familyId: IDS.mayaFamily, firstName: 'Leo', lastName: 'Santos', birthDate: tenYearOld, consentId: consent.id }, NOW,
    );
    expect(db.consents.find((c) => c.id === consent.id)?.studentId).toBe(student.id);
    expect(db.families.find((f) => f.id === IDS.mayaFamily)?.studentIds).toContain(student.id);
    // A consent is single-use.
    expect(() =>
      createStudentAccount(db, IDS.mom, { familyId: IDS.mayaFamily, firstName: 'Leo', lastName: 'Santos', birthDate: tenYearOld, consentId: consent.id }, NOW),
    ).toThrow(ConsentRequiredError);
  });

  it('rejects consent for a different birth date or a revoked consent', () => {
    const { db, consent } = recordParentalConsent(
      fresh(), IDS.mom,
      { familyId: IDS.mayaFamily, childFirstName: 'Leo', childBirthDate: tenYearOld, method: 'signed_form', agreedToNotice: true }, NOW,
    );
    expect(() =>
      createStudentAccount(db, IDS.mom, { familyId: IDS.mayaFamily, firstName: 'Leo', lastName: 'S', birthDate: `${NOW.getFullYear() - 9}-01-15`, consentId: consent.id }, NOW),
    ).toThrow(ConsentRequiredError);
    const revoked = { ...db, consents: db.consents.map((c) => ({ ...c, revokedAt: NOW.toISOString() })) };
    expect(() =>
      createStudentAccount(revoked, IDS.mom, { familyId: IDS.mayaFamily, firstName: 'Leo', lastName: 'S', birthDate: tenYearOld, consentId: consent.id }, NOW),
    ).toThrow(ConsentRequiredError);
  });

  it('requires the parent to agree to the notice', () => {
    expect(() =>
      recordParentalConsent(fresh(), IDS.mom, { familyId: IDS.mayaFamily, childFirstName: 'Leo', childBirthDate: tenYearOld, method: 'card_check', agreedToNotice: false }, NOW),
    ).toThrow(ConsentRequiredError);
  });

  it('every under-13 student in the seed has consent on file', () => {
    const db = fresh();
    const today = toDateKey(NOW);
    const maya = db.users.find((u) => u.id === IDS.maya)!;
    expect(Number(today.slice(0, 4)) - Number(maya.birthDate!.slice(0, 4))).toBeLessThan(13);
    expect(db.consents.some((c) => c.studentId === IDS.maya && !c.revokedAt)).toBe(true);
  });
});

describe('Check-in and quest loop', () => {
  it('matches the canvas starting state', () => {
    const h = studentHome(fresh(), IDS.maya, NOW);
    expect(h.firstName).toBe('Maya');
    expect(h.acorns).toBe(124);
    expect(h.streak).toBe(9);
    expect(h.level).toMatchObject({ level: 3, acornsToNext: 36, nextRoom: 'garden room' });
    expect(Math.round(h.level.progress * 100)).toBe(68);
    expect(h.tonight.map((q) => q.title)).toEqual(['Math worksheet 4.2', 'Science lab write-up', 'Read ch. 6, Hatchet']);
    expect(h.tonightMinutes).toBe(55);
    expect(h.boss?.doneCount).toBe(2);
  });

  it('awards 5 acorns once per day and extends the streak', () => {
    let db = submitCheckIn(fresh(), IDS.maya, 4, '', NOW);
    db = submitCheckIn(db, IDS.maya, 3, '', NOW);
    const h = studentHome(db, IDS.maya, NOW);
    expect(h.acorns).toBe(129);
    expect(h.streak).toBe(10);
    expect(h.todayScore).toBe(3);
  });

  it('awards quest acorns when the last step is done, and takes them back if un-ticked', () => {
    let db = fresh();
    const lab = studentHome(db, IDS.maya, NOW).open[0];
    expect(lab.title).toBe('Science lab write-up');
    db = toggleQuestStep(db, IDS.maya, lab.steps[1].id, NOW);
    db = toggleQuestStep(db, IDS.maya, lab.steps[2].id, NOW);
    expect(studentHome(db, IDS.maya, NOW).acorns).toBe(139);
    db = toggleQuestStep(db, IDS.maya, lab.steps[2].id, NOW);
    expect(studentHome(db, IDS.maya, NOW).acorns).toBe(124);
  });

  it('refuses to tick someone else’s quest step', () => {
    const db = fresh();
    const other = db.questSteps.find((s) => db.quests.find((q) => q.id === s.questId)?.studentId !== IDS.maya)!;
    expect(() => toggleQuestStep(db, IDS.maya, other.id, NOW)).toThrow(AccessDenied);
  });

  it('burrow levels are monotonic', () => {
    expect(burrowLevel(0).level).toBe(1);
    expect(burrowLevel(160).level).toBe(4);
    expect(burrowLevel(10_000).progress).toBe(1);
    expect(addDays('2026-11-04', 1)).toBe('2026-11-05');
  });
});

describe('Student preview of the parent summary', () => {
  it('is identical to what the parent receives', () => {
    const db = fresh();
    expect(previewOwnParentSummary(db, IDS.maya, NOW)).toEqual(parentWeeklySummary(db, IDS.mom, IDS.maya, NOW));
    expect(() => previewOwnParentSummary(db, IDS.mom, NOW)).toThrow(AccessDenied);
  });
});
