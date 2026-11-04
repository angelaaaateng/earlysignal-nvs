import type { Db, Family, Role, User } from './types';

export class AccessDenied extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessDenied';
  }
}

export function userById(db: Db, id: string): User | undefined {
  return db.users.find((u) => u.id === id);
}

export function requireRole(db: Db, viewerId: string, role: Role): User {
  const u = userById(db, viewerId);
  if (!u || u.role !== role) throw new AccessDenied(`Requires role ${role}`);
  return u;
}

export function familyOfStudent(db: Db, studentId: string): Family | undefined {
  return db.families.find((f) => f.studentIds.includes(studentId));
}

export function familiesOfParent(db: Db, parentId: string): Family[] {
  return db.families.filter((f) => f.parents.some((p) => p.userId === parentId));
}

export function isParentOf(db: Db, parentId: string, studentId: string): boolean {
  const f = familyOfStudent(db, studentId);
  return !!f && f.parents.some((p) => p.userId === parentId);
}

/**
 * Rule: admins see only families that opted in, and only within their own org.
 * This is the single gate every admin read goes through.
 */
export function adminVisibleFamilies(db: Db, adminId: string): Family[] {
  const admin = requireRole(db, adminId, 'admin');
  if (!admin.orgId) return [];
  return db.families.filter((f) => f.orgId === admin.orgId && f.adminOptIn);
}

export function sharingFor(db: Db, studentId: string) {
  // Missing settings mean nothing is shared: fail closed.
  return (
    db.sharing.find((s) => s.studentId === studentId) ?? {
      studentId,
      moodTrend: false,
      questsFinished: false,
      streakAndLevel: false,
      upcomingTests: false,
      updatedAt: new Date(0).toISOString(),
    }
  );
}

/** "Ava Chen" → "A. Chen" */
export function initialName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length < 2) return displayName;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0];
}
