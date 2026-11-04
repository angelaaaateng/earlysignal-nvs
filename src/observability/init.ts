import { Platform } from 'react-native';
import { addSink, consoleSink, httpSink, log, persistentSink, restorePersistedLogs, ringSink, setMinLevel } from './logger';

let started = false;

/** Wire sinks and global error handlers. Safe to call more than once. */
export function initObservability() {
  if (started) return;
  started = true;

  addSink(ringSink);
  if (Platform.OS === 'web') {
    restorePersistedLogs();
    addSink(persistentSink); // must come after ringSink: it snapshots the ring
  }
  if (process.env.NODE_ENV !== 'production') addSink(consoleSink);
  else setMinLevel('info');

  const endpoint = process.env.EXPO_PUBLIC_LOG_ENDPOINT;
  if (endpoint) addSink(httpSink(endpoint));

  // Uncaught errors and promise rejections.
  const g = globalThis as unknown as {
    addEventListener?: (t: string, f: (e: unknown) => void) => void;
    ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (f: (e: unknown, fatal?: boolean) => void) => void };
  };
  if (typeof g.addEventListener === 'function' && typeof window !== 'undefined') {
    g.addEventListener('error', (e) => log.error('uncaught.error', (e as ErrorEvent).error ?? (e as ErrorEvent).message));
    g.addEventListener('unhandledrejection', (e) => log.error('uncaught.rejection', (e as PromiseRejectionEvent).reason));
  }
  if (g.ErrorUtils) {
    const prev = g.ErrorUtils.getGlobalHandler();
    g.ErrorUtils.setGlobalHandler((e, fatal) => {
      log.error(fatal ? 'uncaught.fatal' : 'uncaught.error', e);
      prev(e, fatal);
    });
  }

  log.info('app.start', { endpointConfigured: !!endpoint });
}
