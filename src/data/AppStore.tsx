import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Db, Role, User } from '../domain/types';
import { log, setLogContext } from '../observability/logger';
import { loadState, saveState, clearState } from './persist';
import { buildSeed, IDS } from './seed';

/**
 * In-memory store + mock auth. This is the seam a real backend replaces:
 * keep the same shape (current user, `act` for writes), swap the internals.
 * The domain functions it calls already enforce every access rule, and the
 * backend must enforce the same rules server-side.
 */
export const USING_MOCK_DATA = true;

const DEMO_ACCOUNTS: Record<Role, string> = { student: IDS.maya, parent: IDS.mom, admin: IDS.patel };

interface Store {
  db: Db;
  now: Date;
  user: User | null;
  /** False until saved state has been read from the device. */
  hydrated: boolean;
  signInAs: (role: Role) => User;
  signOut: () => void;
  /**
   * Apply a domain mutation as the signed-in user. `event` names the action
   * in the audit log; `data` adds ids/enums (redacted by the logger anyway).
   * Errors are logged and rethrown so the screen can show them.
   */
  act: (event: string, fn: (db: Db, now: Date) => Db, data?: Record<string, unknown>) => void;
  /** Wipe saved data and start again from fresh mock data. */
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children, initialNow }: { children: ReactNode; initialNow?: Date }) {
  const [now, setNow] = useState(() => initialNow ?? new Date());
  const [db, setDb] = useState(() => buildSeed(initialNow ?? new Date()));
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const dbRef = useRef(db);
  const userRef = useRef<string | null>(null);

  // Restore the last session on this device.
  useEffect(() => {
    let alive = true;
    loadState().then((s) => {
      if (!alive) return;
      if (s) {
        dbRef.current = s.db;
        setDb(s.db);
        if (s.userId && s.db.users.some((u) => u.id === s.userId)) {
          userRef.current = s.userId;
          setUserId(s.userId);
          const u = s.db.users.find((x) => x.id === s.userId)!;
          setLogContext({ userId: u.id, role: u.role });
        }
        log.info('state.restored', { savedAt: s.savedAt });
      }
      setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist after every change, once hydrated.
  useEffect(() => {
    if (hydrated) void saveState(db, userId);
  }, [db, userId, hydrated]);

  useEffect(() => {
    if (initialNow) return;
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [initialNow]);

  const signInAs = useCallback((role: Role) => {
    const u = dbRef.current.users.find((x) => x.id === DEMO_ACCOUNTS[role])!;
    userRef.current = u.id;
    setUserId(u.id);
    setLogContext({ userId: u.id, role: u.role });
    log.audit('auth.sign_in', { role, method: 'demo' });
    return u;
  }, []);

  const signOut = useCallback(() => {
    log.audit('auth.sign_out', {});
    userRef.current = null;
    setUserId(null);
    setLogContext({});
  }, []);

  const act = useCallback((event: string, fn: (db: Db, now: Date) => Db, data?: Record<string, unknown>) => {
    const t0 = Date.now();
    try {
      // Run synchronously so AccessDenied / ConsentRequiredError reach the caller.
      const next = fn(dbRef.current, new Date());
      dbRef.current = next;
      setDb(next);
      log.audit(event, { ...data, ok: true, ms: Date.now() - t0 });
    } catch (e) {
      log.audit(event, { ...data, ok: false, errorName: (e as Error)?.name });
      log.error(`${event}.failed`, e);
      throw e;
    }
  }, []);

  const resetDemo = useCallback(() => {
    void clearState();
    const fresh = buildSeed(new Date());
    dbRef.current = fresh;
    setDb(fresh);
    userRef.current = null;
    setUserId(null);
    setLogContext({});
    log.audit('demo.reset', {});
  }, []);

  const value = useMemo<Store>(
    () => ({
      db,
      now,
      hydrated,
      user: userId ? db.users.find((u) => u.id === userId) ?? null : null,
      signInAs,
      signOut,
      act,
      resetDemo,
    }),
    [db, now, hydrated, userId, signInAs, signOut, act, resetDemo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useApp outside AppProvider');
  return s;
}

/** The signed-in user, asserted to have `role`. Layout guards make this safe. */
export function useViewer(role: Role): User {
  const { user } = useApp();
  if (!user || user.role !== role) throw new Error(`Expected a signed-in ${role}`);
  return user;
}

/** Record that the signed-in user viewed someone's data (once per subject). */
export function useAuditView(event: string, subjectId: string | undefined) {
  useEffect(() => {
    if (subjectId) log.audit(event, { subjectId });
  }, [event, subjectId]);
}
