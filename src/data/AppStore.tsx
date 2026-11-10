import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type DependencyList, type ReactNode } from 'react';
import type { Parent } from '../domain/types';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import { log, setLogContext } from '../observability/logger';
import type { Backend, Session, SignInResult } from './backend';
import { toBackendError } from './backend';
import { MockBackend } from './mockBackend';
import { SupabaseBackend } from './supabaseBackend';

/**
 * Picks the backend once: Supabase when EXPO_PUBLIC_SUPABASE_URL is set,
 * otherwise the on-device mock. Screens never know which one they talk to.
 */
const USE_SUPABASE = SUPABASE_CONFIGURED && process.env.EXPO_PUBLIC_FORCE_MOCK !== '1';

function makeBackend(): Backend {
  return USE_SUPABASE ? new SupabaseBackend() : new MockBackend();
}

/** True when the app runs on demo data. Screens show an "Example data" badge. */
export const USING_MOCK_DATA = !USE_SUPABASE;

interface Store {
  backend: Backend;
  session: Session | null;
  user: Parent | null;
  now: Date;
  /** False until the saved session has been checked. */
  hydrated: boolean;
  /** Bumped after every successful write so data hooks refetch. */
  version: number;
  signIn: (fn: (b: Backend) => Promise<SignInResult>) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  /**
   * Run a write as the signed-in user. `event` names it in the audit log.
   * Errors are logged and rethrown as BackendError so the screen can show them.
   */
  act: (event: string, fn: (b: Backend, s: Session) => Promise<unknown>, data?: Record<string, unknown>) => Promise<void>;
  resetDemo: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children, backend: given }: { children: ReactNode; backend?: Backend }) {
  const backend = useMemo(() => given ?? makeBackend(), [given]);
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const sessionRef = useRef<Session | null>(null);

  const apply = useCallback((s: Session | null) => {
    sessionRef.current = s;
    setSession(s);
    setLogContext(s ? { userId: s.user.id, role: 'parent' } : {});
  }, []);

  useEffect(() => {
    let alive = true;
    backend
      .restoreSession()
      .then((s) => alive && apply(s))
      .catch((e) => log.error('session.restore_failed', e))
      .finally(() => alive && setHydrated(true));
    const t = setInterval(() => setNow(new Date()), 60_000);
    const unsub = backend.subscribe?.(() => setVersion((v) => v + 1));
    return () => {
      alive = false;
      clearInterval(t);
      unsub?.();
    };
  }, [backend, apply]);

  const signIn = useCallback(
    async (fn: (b: Backend) => Promise<SignInResult>) => {
      const r = await fn(backend);
      if (r.ok) {
        apply(r.session);
        log.audit('auth.sign_in', { backend: backend.kind });
      } else {
        log.warn('auth.sign_in_failed', { backend: backend.kind });
      }
      return r;
    },
    [backend, apply],
  );

  const signOut = useCallback(async () => {
    log.audit('auth.sign_out', {});
    await backend.signOut();
    apply(null);
  }, [backend, apply]);

  const act = useCallback(
    async (event: string, fn: (b: Backend, s: Session) => Promise<unknown>, data?: Record<string, unknown>) => {
      const s = sessionRef.current;
      if (!s) throw toBackendError(new Error('ACCESS_DENIED: not signed in'));
      const t0 = Date.now();
      try {
        await fn(backend, s);
        log.audit(event, { ...data, ok: true, ms: Date.now() - t0 });
        setVersion((v) => v + 1);
      } catch (e) {
        const err = toBackendError(e);
        log.audit(event, { ...data, ok: false, errorName: err.code });
        log.error(`${event}.failed`, err);
        throw err;
      }
    },
    [backend],
  );

  const resetDemo = useCallback(async () => {
    await backend.resetDemo?.();
    apply(null);
    setVersion((v) => v + 1);
    log.audit('demo.reset', {});
  }, [backend, apply]);

  const value = useMemo<Store>(
    () => ({ backend, session, user: session?.user ?? null, now, hydrated, version, signIn, signOut, act, resetDemo }),
    [backend, session, now, hydrated, version, signIn, signOut, act, resetDemo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useApp outside AppProvider');
  return s;
}

/** The signed-in parent. Layout guards make this safe. */
export function useSession(): Session {
  const { session } = useApp();
  if (!session) throw new Error('Expected a signed-in parent');
  return session;
}

export interface Loaded<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Load a projection through the backend. Refetches after every `act`, when
 * the clock ticks, and when `deps` change. Keeps the last data while reloading.
 */
export function useLoad<T>(fn: (b: Backend, s: Session, now: Date) => Promise<T>, deps: DependencyList = []): Loaded<T> {
  const { backend, session, now, version } = useApp();
  const [tick, setTick] = useState(0);
  // Result keyed by the request number it answered, so a stale response can't win.
  const [result, setResult] = useState<{ req: string; data?: T; error: Error | null }>({ req: '', error: null });
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  // A new request number whenever any input changes; "loading" = result lags behind it.
  const depsKey = JSON.stringify(deps);
  const req = useMemo(() => `${version}:${tick}:${now.getTime()}:${session?.user.id ?? ''}:${backend.kind}:${depsKey}`, [backend, session, now, version, tick, depsKey]);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    const t0 = Date.now();
    fnRef
      .current(backend, session, now)
      .then((data) => {
        if (!alive) return;
        setResult({ req, data, error: null });
        log.metric('load_ms', Date.now() - t0, { backend: backend.kind });
      })
      .catch((e) => {
        if (!alive) return;
        const err = toBackendError(e);
        log.error('load.failed', err);
        setResult((r) => ({ req, data: r.data, error: err }));
      });
    return () => {
      alive = false;
    };
  }, [backend, session, now, req]);

  return { data: result.data, error: result.req === req ? result.error : null, loading: result.req !== req, reload: () => setTick((n) => n + 1) };
}

/** Record that the signed-in user viewed someone's data (once per subject). */
export function useAuditView(event: string, subjectId: string | undefined) {
  useEffect(() => {
    if (subjectId) log.audit(event, { subjectId });
  }, [event, subjectId]);
}
