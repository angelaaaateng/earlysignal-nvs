import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { log } from '@/observability/logger';

/**
 * The Supabase client, created only when the app is configured for it.
 * Both values are safe to ship: row-level security is what protects data.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const SUPABASE_CONFIGURED = /^https:\/\//.test(SUPABASE_URL) && SUPABASE_KEY.length > 20;

let client: SupabaseClient | null = null;

/** Gives React Native a `localStorage` for session persistence (Expo's recommended setup). Web has one already. */
function installNativeLocalStorage() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('expo-sqlite/localStorage/install');
}

export function supabase(): SupabaseClient {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase is not configured (EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY).');
  if (client) return client;
  if (Platform.OS !== 'web') installNativeLocalStorage();
  client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: globalThis.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Web reads the magic-link session from the URL; native has no URL.
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
    global: { headers: { 'x-client-info': `rooted/${process.env.EXPO_PUBLIC_RELEASE ?? 'dev'}` } },
  });
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  client.auth.onAuthStateChange((event) => log.info('auth.state', { event }));
  return client;
}
