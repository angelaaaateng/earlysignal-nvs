import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '@/observability/logger';

/**
 * The parent's own reflections after a talk. Device-only by design (product
 * principle 6: share effort, never content). Nothing here is ever synced.
 */
const KEY = 'rooted.notes';

async function all(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}');
  } catch (e) {
    log.error('notes.load_failed', e);
    return {};
  }
}
export async function getNote(talkId: string) {
  return (await all())[talkId] ?? '';
}
export async function setNote(talkId: string, text: string) {
  const n = await all();
  if (text.trim()) n[talkId] = text.trim();
  else delete n[talkId];
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(n));
  } catch (e) {
    log.error('notes.save_failed', e);
  }
}
export async function allNotes() {
  return all();
}
export async function clearNotes() {
  await AsyncStorage.removeItem(KEY);
}
