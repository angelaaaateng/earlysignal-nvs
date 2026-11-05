import { useLoad, useSession } from '@/data/AppStore';
import type { ChildSummary } from '@/data/backend';

/** The signed-in parent and their children. The first child is the default view. */
export function useParent() {
  const session = useSession('parent');
  const kids = useLoad<ChildSummary[]>((b, s) => b.parentChildren(s));
  return { me: session.user, session, kids: kids.data ?? [], kidsLoaded: !kids.loading, studentId: kids.data?.[0]?.id as string | undefined };
}
