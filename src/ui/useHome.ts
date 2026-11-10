import { useEffect, useState } from 'react';
import { useApp, useLoad, useSession } from '@/data/AppStore';
import type { HomeData } from '@/data/backend';
import type { Kid } from '@/domain/types';

let lastKid: string | undefined;

/** Everything the parent's screens need, plus which kid is selected (kept while the app is open). */
export function useHome() {
  const session = useSession();
  const { version } = useApp();
  const home = useLoad<HomeData>((b, s, now) => b.home(s, now));
  const [selected, setSelected] = useState<string | undefined>(lastKid);
  const kids = home.data?.kids ?? [];
  const kid: Kid | undefined = kids.find((k) => k.id === selected) ?? kids[0];
  useEffect(() => {
    lastKid = kid?.id;
  }, [kid?.id]);
  return { session, me: session.user, version, ...home, kids, kid, selectKid: setSelected, events: home.data?.events ?? [], talks: home.data?.talks ?? [], weekReviews: home.data?.weekReviews ?? [] };
}
