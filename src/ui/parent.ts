import { useEffect, useState } from 'react';
import { useLoad, useSession } from '@/data/AppStore';
import type { ChildSummary } from '@/data/backend';

let lastSelected: string | undefined;

/** The signed-in parent and their linked kids. The selected kid persists while the app is open. */
export function useParent() {
  const session = useSession('parent');
  const kids = useLoad<ChildSummary[]>((b, s) => b.parentChildren(s));
  const [selected, setSelected] = useState<string | undefined>(lastSelected);
  const list = kids.data ?? [];
  const studentId = (selected && list.some((k) => k.id === selected) ? selected : list[0]?.id) as string | undefined;
  useEffect(() => {
    lastSelected = studentId;
  }, [studentId]);
  return { me: session.user, session, kids: list, kidsLoaded: !kids.loading, studentId, select: setSelected, reloadKids: kids.reload };
}
