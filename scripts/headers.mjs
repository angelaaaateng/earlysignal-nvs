// Security and caching headers, shared by the local server and vercel.json.
export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    // react-native-web injects <style> tags at runtime.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Supabase API + realtime; add your log endpoint's origin when EXPO_PUBLIC_LOG_ENDPOINT is set.
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export function cacheControl(pathname) {
  if (pathname.startsWith('/_expo/static/')) return 'public, max-age=31536000, immutable';
  if (pathname === '/sw.js' || pathname.endsWith('.html') || pathname === '/') return 'no-cache';
  return 'public, max-age=3600';
}
