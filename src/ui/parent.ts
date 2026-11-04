import { useApp, useViewer } from '@/data/AppStore';
import { parentStudents } from '@/domain/parent';
import { useMemo } from 'react';

/** The signed-in parent and their children. The first child is the default view. */
export function useParent() {
  const me = useViewer('parent');
  const { db } = useApp();
  const kids = useMemo(() => parentStudents(db, me.id), [db, me.id]);
  return { me, kids, studentId: kids[0]?.id as string | undefined };
}
