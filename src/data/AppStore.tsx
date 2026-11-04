import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Db, Role, User } from '../domain/types';
import { buildSeed, IDS } from './seed';

/**
 * In-memory store + mock auth. This is the seam a real backend replaces:
 * keep the same shape (current user, `act` for writes), swap the internals.
 * The domain functions it calls already enforce every access rule, and the
 * backend must enforce the same rules server-side.
 */
export const USING_MOCK_DATA = true;

const DEMO_ACCOUNTS: Record<Role, string> = { student: IDS.maya, parent: IDS.mom, admin: IDS.patel };

export const HOME_FOR: Record<Role, '/student' | '/parent' | '/admin'> = {
  student: '/student',
  parent: '/parent',
  admin: '/admin',
};

interface Store {
  db: Db;
  now: Date;
  user: User | null;
  signInAs: (role: Role) => User;
  signOut: () => void;
  /** Apply a domain mutation as the signed-in user. Errors propagate to the caller. */
  act: (fn: (db: Db, now: Date) => Db) => void;
}

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children, initialNow }: { children: ReactNode; initialNow?: Date }) {
  const [now, setNow] = useState(() => initialNow ?? new Date());
  const [db, setDb] = useState(() => buildSeed(initialNow ?? new Date()));
  const [userId, setUserId] = useState<string | null>(null);
  const dbRef = useRef(db);

  useEffect(() => {
    if (initialNow) return;
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [initialNow]);

  const signInAs = useCallback(
    (role: Role) => {
      const u = db.users.find((x) => x.id === DEMO_ACCOUNTS[role])!;
      setUserId(u.id);
      return u;
    },
    [db.users],
  );

  const act = useCallback((fn: (db: Db, now: Date) => Db) => {
    // Run synchronously so AccessDenied / ConsentRequiredError reach the caller.
    const next = fn(dbRef.current, new Date());
    dbRef.current = next;
    setDb(next);
  }, []);

  const value = useMemo<Store>(
    () => ({
      db,
      now,
      user: userId ? db.users.find((u) => u.id === userId) ?? null : null,
      signInAs,
      signOut: () => setUserId(null),
      act,
    }),
    [db, now, userId, signInAs, act],
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
