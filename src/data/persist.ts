import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Db } from '../domain/types';
import { log } from '../observability/logger';

/**
 * Device-local persistence for the mock build, so the installed web app and
 * the native app keep their state between launches. Bump SCHEMA when the Db
 * shape changes; older saves are discarded rather than migrated.
 *
 * This holds mock data only. With a real backend, the device keeps a session
 * token and the parent's own notes (src/data/notes.ts), nothing else.
 */
const KEY = 'rooted.state';
const SCHEMA = 3;

interface Saved {
  schema: number;
  savedAt: string;
  userId: string | null;
  db: Db;
}

export async function loadState(): Promise<Saved | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    if (s.schema !== SCHEMA || !s.db?.parents) {
      log.warn('state.discarded', { reason: 'schema', schema: s.schema });
      return null;
    }
    return s;
  } catch (e) {
    log.error('state.load_failed', e);
    return null;
  }
}

/**
 * Writes immediately. A debounce here once lost a sign-out when the app was
 * closed right after (caught by e2e); the payload is small enough to write per change.
 */
export async function saveState(db: Db, userId: string | null): Promise<void> {
  try {
    const s: Saved = { schema: SCHEMA, savedAt: new Date().toISOString(), userId, db };
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    log.error('state.save_failed', e);
  }
}

export async function clearState() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    log.error('state.clear_failed', e);
  }
}
