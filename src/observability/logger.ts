/**
 * Structured, vendor-neutral logging.
 *
 * - Every entry is a JSON-safe object: { ts, level, event, ctx, session, ... }.
 * - Sensitive fields are redacted before an entry leaves this module, so a
 *   private note or a child's name can never reach a log sink by accident.
 * - Sinks are pluggable. Today: console (dev), an in-memory ring buffer (for
 *   the diagnostics screen and tests) and an optional HTTP sink enabled with
 *   EXPO_PUBLIC_LOG_ENDPOINT. A Sentry / Datadog / OpenTelemetry adapter is a
 *   new sink, not a rewrite.
 */

export type Level = 'debug' | 'info' | 'warn' | 'error';
export type Category = 'app' | 'audit' | 'metric' | 'error' | 'nav';

export interface LogEntry {
  ts: string;
  level: Level;
  category: Category;
  event: string;
  session: string;
  release: string;
  platform: string;
  userId?: string;
  role?: string;
  data?: Record<string, unknown>;
}

export type Sink = (e: LogEntry) => void;

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Keys whose values are never logged. Matching is case-insensitive and on
 * substrings, so `noteText`, `privateNote` and `draftMessage` are all caught.
 */
const REDACT_KEYS = ['note', 'text', 'draft', 'name', 'birth', 'email', 'phone', 'password', 'token', 'secret', 'message'];
/** Keys that look sensitive but are safe identifiers or enums. */
const ALLOW_KEYS = new Set(['event', 'screen', 'route', 'pathname', 'errorName', 'errorMessage', 'role', 'method', 'key', 'action', 'level']);

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[depth]';
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      out[k] = !ALLOW_KEYS.has(k) && REDACT_KEYS.some((r) => lower.includes(r)) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 300) return `${value.slice(0, 300)}…`;
  return value;
}

const RING_SIZE = 500;
const ring: LogEntry[] = [];
const sinks: Sink[] = [];
let minLevel: Level = 'debug';
let context: { userId?: string; role?: string } = {};

const session = Math.random().toString(36).slice(2, 10);
const release = process.env.EXPO_PUBLIC_RELEASE ?? 'dev';
const platform = typeof navigator !== 'undefined' && navigator.product !== 'ReactNative' ? 'web' : 'native';

export const ringSink: Sink = (e) => {
  ring.push(e);
  if (ring.length > RING_SIZE) ring.shift();
};

/**
 * Web only: keep the last entries in localStorage so the diagnostics screen
 * still shows what happened before a reload or crash. Entries are already
 * redacted when they reach a sink.
 */
const STORE_KEY = 'earlysignal.logs';
const STORE_SIZE = 200;

export function restorePersistedLogs() {
  try {
    const raw = globalThis.localStorage?.getItem(STORE_KEY);
    if (raw) ring.push(...(JSON.parse(raw) as LogEntry[]).slice(-STORE_SIZE));
  } catch {
    /* unavailable or corrupt: start empty */
  }
}

export const persistentSink: Sink = () => {
  try {
    globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(ring.slice(-STORE_SIZE)));
  } catch {
    /* quota or private mode */
  }
};

export const consoleSink: Sink = (e) => {
  if (process.env.NODE_ENV === 'test') return;
  const line = `[${e.category}] ${e.event}`;
  const fn = e.level === 'error' ? console.error : e.level === 'warn' ? console.warn : console.log;
  fn(line, e.data ?? '');
};

/** Batches entries and POSTs them as JSON. Drops on failure; logging must never break the app. */
export function httpSink(endpoint: string, { batch = 20, intervalMs = 5000 } = {}): Sink {
  let buf: LogEntry[] = [];
  const flush = () => {
    if (!buf.length) return;
    const body = JSON.stringify({ entries: buf });
    buf = [];
    try {
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { sendBeacon?: (u: string, d: string) => boolean }) : undefined;
      if (nav?.sendBeacon && nav.sendBeacon(endpoint, body)) return;
      void fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch {
      /* swallow */
    }
  };
  setInterval(flush, intervalMs);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', flush);
  }
  return (e) => {
    buf.push(e);
    if (buf.length >= batch) flush();
  };
}

export function addSink(s: Sink) {
  sinks.push(s);
}

export function setMinLevel(l: Level) {
  minLevel = l;
}

/** Attach the signed-in user to every following entry. Ids only, never names. */
export function setLogContext(c: { userId?: string; role?: string }) {
  context = c;
}

function emit(level: Level, category: Category, event: string, data?: Record<string, unknown>) {
  if (LEVELS[level] < LEVELS[minLevel]) return;
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    category,
    event,
    session,
    release,
    platform,
    ...context,
    data: data ? (redact(data) as Record<string, unknown>) : undefined,
  };
  for (const s of sinks) {
    try {
      s(entry);
    } catch {
      /* a broken sink must not take the app down */
    }
  }
}

export const log = {
  debug: (event: string, data?: Record<string, unknown>) => emit('debug', 'app', event, data),
  info: (event: string, data?: Record<string, unknown>) => emit('info', 'app', event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit('warn', 'app', event, data),
  error: (event: string, err?: unknown, data?: Record<string, unknown>) =>
    emit('error', 'error', event, { ...data, ...serializeError(err) }),
  /** Who looked at or changed whose data. Required for COPPA/FERPA-style reviews. */
  audit: (event: string, data: Record<string, unknown>) => emit('info', 'audit', event, data),
  /** Numeric measurements, e.g. render timings. */
  metric: (event: string, value: number, data?: Record<string, unknown>) => emit('info', 'metric', event, { ...data, value }),
  nav: (pathname: string) => emit('info', 'nav', 'screen.view', { pathname }),
};

export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { errorName: err.name, errorMessage: err.message.slice(0, 300), stack: err.stack?.split('\n').slice(0, 8).join('\n') };
  }
  return err === undefined ? {} : { errorValue: String(err).slice(0, 300) };
}

export function recentLogs(): LogEntry[] {
  return ring.slice();
}

export function clearLogs() {
  ring.length = 0;
  try {
    globalThis.localStorage?.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

export const LOG_SESSION = session;
