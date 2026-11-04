import { Platform } from 'react-native';
import { log } from '@/observability/logger';

/**
 * Registers /sw.js on web production builds. In development the service
 * worker is skipped so Metro's hot reload is never served from cache.
 */
export function registerServiceWorker() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;
  const register = () =>
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        log.info('pwa.sw.registered', { scope: reg.scope });
        // When a new version finishes installing, tell the user on next launch.
        reg.addEventListener('updatefound', () => log.info('pwa.sw.update_found'));
      })
      .catch((e) => log.error('pwa.sw.register_failed', e));
  // The bundle can finish loading after the page's load event; register right away in that case.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
}

/** True when launched from the home screen rather than a browser tab. */
export function isStandalone(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!nav.standalone || window.matchMedia?.('(display-mode: standalone)').matches;
}

/* ---- Install prompt ---------------------------------------------------- */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Chrome / Edge / Android fire this when the app is installable.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    log.info('pwa.installed');
    listeners.forEach((f) => f());
  });
}

export function onInstallAvailabilityChange(f: () => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

export function canPromptInstall() {
  return !!deferred;
}

export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  log.info('pwa.install_prompt', { action: outcome });
  deferred = null;
  listeners.forEach((f) => f());
}

/** iPhone / iPad Safari has no install prompt: people use Share → Add to Home Screen. */
export function isIosSafari(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}
