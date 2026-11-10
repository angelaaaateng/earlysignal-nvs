import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { monthDay, toDateKey, weekdayShort } from '@/domain/dates';
import type { EventCandidate } from '@/domain/importEvents';
import { EVENT_KIND_LABEL, type EventKind } from '@/domain/types';
import { Button, Chip, ErrorLine, KidChip, TextField } from '@/ui/Kit';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { C, R, S, T } from '@/ui/theme';
import { useHome } from '@/ui/useHome';

type Tab = 'text' | 'photo' | 'calendar';
const KINDS = Object.keys(EVENT_KIND_LABEL) as EventKind[];

/** Import the week: paste a newsletter, snap a schedule, or paste a calendar link. The parent approves every row. */
export default function ImportEvents() {
  const p = useLocalSearchParams<{ kid?: string }>();
  const { now, backend, session, act } = useApp();
  const h = useHome();
  const today = toDateKey(now);
  const [tab, setTab] = useState<Tab>('text');
  const [kidId, setKidId] = useState<string | undefined>(p.kid);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState<(EventCandidate & { keep: boolean })[] | null>(null);
  const kid = h.kids.find((k) => k.id === kidId) ?? h.kids[0];

  const run = async (fn: () => Promise<EventCandidate[]>) => {
    setBusy(true);
    setErr('');
    try {
      const found = await fn();
      if (found.length === 0) setErr('No dated events found. Try a line like “Math test Thursday” or “Nov 20: band concert”.');
      setRows(found.map((c) => ({ ...c, keep: true })));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
    if (res.canceled || !res.assets[0]?.base64) return;
    const a = res.assets[0];
    await run(() => backend.extractEvents(session!, { kind: 'photo', base64: a.base64!, mediaType: a.mimeType ?? 'image/jpeg' }, today));
  };
  const save = async () => {
    if (!kid || !rows) return;
    const keep = rows.filter((r) => r.keep && r.title.trim());
    setBusy(true);
    try {
      await act('events.import', (b, s) => b.addEvents(s, keep.map((r) => ({ kidId: kid.id, title: r.title, kind: r.kind, date: r.date }))), { count: keep.length, source: tab });
      router.replace('/week');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const update = (i: number, patch: Partial<EventCandidate & { keep: boolean }>) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Screen narrow contentStyle={{ gap: S[5] }}>
      <BackButton onPress={() => goBack('/week')} label="Back" />
      <View>
        <Text style={T.overline}>Import the week</Text>
        <Text accessibilityRole="header" style={[T.title, { marginTop: S[1] }]}>
          {kid ? `What’s on ${kid.name}’s week?` : 'What’s coming up?'}
        </Text>
        <Text style={[T.body, { marginTop: S[2] }]}>Paste the school newsletter, snap the team schedule, or paste a calendar link. You approve every row before it lands.</Text>
      </View>
      {h.kids.length > 1 && (
        <View style={{ flexDirection: 'row', gap: S[2], flexWrap: 'wrap' }}>
          {h.kids.map((k, i) => (
            <KidChip key={k.id} name={k.name} detail={`Grade ${k.grade}`} tone={i % 2 ? 'moss' : 'bark'} selected={k.id === kid?.id} onPress={() => setKidId(k.id)} />
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', backgroundColor: C.bubble, borderRadius: R.pill, padding: 4, gap: 4 }}>
        {(['text', 'photo', 'calendar'] as Tab[]).map((t) => (
          <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => { setTab(t); setRows(null); setErr(''); }} style={{ flex: 1, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center', backgroundColor: tab === t ? C.soil : 'transparent', minHeight: 44, justifyContent: 'center' }}>
            <Text style={[T.label, { color: tab === t ? C.paper : C.soil }]}>{t === 'text' ? 'Paste text' : t === 'photo' ? 'Photo' : 'Calendar link'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'text' && (
        <>
          <TextField label="Newsletter, syllabus or a few lines" value={text} onChange={setText} multiline placeholder={'Math test Thursday\nSoccer vs. Newton 11/14\nBand concert Nov 20'} hint="One event per line works best. Dates can be “Thursday”, “11/14” or “Nov 20”." />
          <Button label={busy ? 'Reading…' : 'Find events'} disabled={!text.trim()} busy={busy} onPress={() => void run(() => backend.extractEvents(session!, { kind: 'text', text }, today))} />
        </>
      )}
      {tab === 'photo' && (
        <>
          <Text style={T.body}>A photo of the syllabus, the team schedule or the fridge calendar. Claude reads the dates; nothing is stored but the events you approve.</Text>
          <Button label={busy ? 'Reading…' : 'Choose a photo'} busy={busy} onPress={() => void pickPhoto()} />
          {backend.kind === 'mock' && <Text style={T.caption}>The demo can’t read photos. The real app does.</Text>}
        </>
      )}
      {tab === 'calendar' && (
        <>
          <TextField label="Calendar link (.ics)" value={url} onChange={setUrl} placeholder="https://calendar.google.com/…/basic.ics" autoCapitalize="none" hint="Google Calendar: Settings → your calendar → Secret address in iCal format. Many school portals offer one too." />
          <Button label={busy ? 'Fetching…' : 'Fetch events'} disabled={!/^(https?|webcal):\/\//i.test(url.trim())} busy={busy} onPress={() => void run(() => backend.extractEvents(session!, { kind: 'calendar', url: url.trim() }, today))} />
        </>
      )}
      <ErrorLine>{err}</ErrorLine>

      {rows && rows.length > 0 && (
        <View style={{ gap: S[3] }}>
          <Text accessibilityRole="header" style={T.heading}>
            {rows.filter((r) => r.keep).length} to add
          </Text>
          {rows.map((r, i) => (
            <View key={i} style={{ backgroundColor: C.bubble, borderRadius: R.lg, padding: S[4], gap: S[2], opacity: r.keep ? 1 : 0.5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S[2] }}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: r.keep }} accessibilityLabel={`Keep ${r.title}`} onPress={() => update(i, { keep: !r.keep })} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: r.keep ? C.moss : C.oat, alignItems: 'center', justifyContent: 'center' }}>
                  {r.keep && <Text style={[T.label, { color: C.onMoss }]}>✓</Text>}
                </Pressable>
                <Text style={[T.subhead, { flex: 1 }]}>{r.title}</Text>
                <Text style={T.monoSm}>
                  {weekdayShort(r.date)} {monthDay(r.date)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {KINDS.map((k) => (
                  <Chip key={k} label={EVENT_KIND_LABEL[k]} selected={r.kind === k} onPress={() => update(i, { kind: k })} />
                ))}
              </View>
            </View>
          ))}
          <Button label={busy ? 'Adding…' : `Add ${rows.filter((r) => r.keep).length} to ${kid?.name ?? 'the week'}`} size="lg" disabled={!rows.some((r) => r.keep) || !kid} busy={busy} onPress={() => void save()} />
        </View>
      )}
    </Screen>
  );
}
