import { Platform } from 'react-native';
import { log } from '@/observability/logger';

/** Web push for the smart-timing nudge. Public VAPID key is public by design. */
export const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export function pushSupported() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_PUBLIC_KEY;
}

function urlBase64ToUint8Array(b64: string) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush(): Promise<{ endpoint: string; p256dh: string; auth: string; userAgent?: string } | null> {
  if (!pushSupported()) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    log.info('push.permission', { action: permission });
    return null;
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
  const j = sub.toJSON();
  log.info('push.subscribed', {});
  return { endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '', userAgent: navigator.userAgent.slice(0, 120) };
}

export async function currentPushEndpoint(): Promise<string | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}

export async function unsubscribeFromPush(): Promise<string | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  await sub.unsubscribe();
  return sub.endpoint;
}
