import { addSink, log, recentLogs, redact, ringSink, setLogContext, type LogEntry } from '../logger';

describe('logger', () => {
  const seen: LogEntry[] = [];
  beforeAll(() => {
    addSink(ringSink);
    addSink((e) => seen.push(e));
  });

  it('redacts notes, names, drafts and messages at any depth', () => {
    const out = redact({
      studentId: 'stu_1',
      note: 'secret',
      privateNoteText: 'secret',
      displayName: 'Maya Santos',
      nested: { draft: 'Hi Ms. Patel', list: [{ childFirstName: 'Leo' }] },
      score: 4,
      pathname: '/student/quests',
    }) as Record<string, unknown>;
    const s = JSON.stringify(out);
    expect(s).not.toMatch(/secret|Maya|Patel|Leo/);
    expect(out.studentId).toBe('stu_1');
    expect(out.score).toBe(4);
    expect(out.pathname).toBe('/student/quests');
  });

  it('attaches user context and keeps entries JSON-safe', () => {
    setLogContext({ userId: 'stu_maya', role: 'student' });
    log.audit('checkin.submit', { score: 3, note: 'do not log me' });
    const e = seen[seen.length - 1];
    expect(e).toMatchObject({ category: 'audit', event: 'checkin.submit', userId: 'stu_maya', role: 'student' });
    expect(e.data).toEqual({ score: 3, note: '[redacted]' });
    expect(() => JSON.stringify(e)).not.toThrow();
    expect(recentLogs().some((x) => x.event === 'checkin.submit')).toBe(true);
  });

  it('serializes errors without leaking long payloads', () => {
    log.error('boom', new TypeError('x'.repeat(1000)));
    const e = seen[seen.length - 1];
    expect(e.level).toBe('error');
    expect(e.data?.errorName).toBe('TypeError');
    expect(String(e.data?.errorMessage).length).toBeLessThanOrEqual(300);
  });

  it('a throwing sink never breaks logging', () => {
    addSink(() => {
      throw new Error('sink down');
    });
    expect(() => log.info('still.works')).not.toThrow();
  });
});
