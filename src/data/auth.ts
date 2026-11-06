/** Students sign in with a username; the auth service wants an address. Nobody can mail this. */
export const STUDENT_DOMAIN = 'students.earlysignal.invalid';
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export function normalizeUsername(u: string) {
  return u.trim().toLowerCase();
}
export function studentEmail(username: string) {
  return `${normalizeUsername(username)}@${STUDENT_DOMAIN}`;
}
