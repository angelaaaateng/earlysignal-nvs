import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { addDays, monthDay, toDateKey, weekdayShort } from '@/domain/dates';
import { EVENT_KIND_LABEL, type EventKind } from '@/domain/types';
import { Button, Chip, ErrorLine, KidChip, TextField } from '@/ui/Kit';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { C, R, S, T } from '@/ui/theme';
import { useHome } from '@/ui/useHome';

/** Add something to a kid's week. Three questions appear for it right away. */
export default function EventForm() {
  const p = useLocalSearchParams<{ kid?: string; date?: string; first?: string }>();
  const { now, act } = useApp();
  const h = useHome();
  const today = toDateKey(now);
  const [kidId, setKidId] = useState<string | undefined>(p.kid);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('test');
  const [date, setDate] = useState(p.date && p.date >= today ? p.date : addDays(today, 1));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [added, setAdded] = useState(0);
  const kid = h.kids.find((k) => k.id === kidId) ?? h.kids[0];
  const days = Array.from({ length: 21 }, (_, i) => addDays(p.date && p.date > today ? p.date : today, i));

  const save = async (andAnother: boolean) => {
    if (!kid) return;
    setBusy(true);
    setErr('');
    try {
      await act('event.add', (b, s) => b.addEvent(s, { kidId: kid.id, title, kind, date }), { kind });
      if (andAnother) {
        setTitle('');
        setAdded((n) => n + 1);
      } else router.replace(p.first ? '/home' : '/week');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen narrow contentStyle={{ gap: S[5] }}>
      {!p.first && <BackButton onPress={() => goBack('/week')} label="Back" />}
      <View>
        <Text style={T.overline}>{p.first ? 'Step 2 of 2' : 'Add to the week'}</Text>
        <Text accessibilityRole="header" style={[T.title, { marginTop: S[1] }]}>
          {kid ? `What’s on ${kid.name}’s week?` : 'What’s coming up?'}
        </Text>
        {p.first && <Text style={[T.body, { marginTop: S[2] }]}>A test, a game, a tryout. Rooted turns each one into questions for before and after.</Text>}
      </View>
      {h.kids.length > 1 && (
        <View style={{ flexDirection: 'row', gap: S[2], flexWrap: 'wrap' }}>
          {h.kids.map((k, i) => (
            <KidChip key={k.id} name={k.name} detail={`Grade ${k.grade}`} tone={i % 2 ? 'moss' : 'bark'} selected={k.id === kid?.id} onPress={() => setKidId(k.id)} />
          ))}
        </View>
      )}
      <TextField label="What is it?" value={title} onChange={setTitle} placeholder="Math test" autoFocus />
      <View style={{ gap: S[2] }}>
        <Text style={T.label}>Kind</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S[2] }}>
          {(Object.keys(EVENT_KIND_LABEL) as EventKind[]).map((k) => (
            <Chip key={k} label={EVENT_KIND_LABEL[k]} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>
      </View>
      <View style={{ gap: S[2] }}>
        <Text style={T.label}>When</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S[2] }}>
          {days.map((d) => {
            const on = d === date;
            return (
              <Chip key={d} label={`${weekdayShort(d)} ${monthDay(d).split(' ')[1]}${d === today ? ' · today' : ''}`} selected={on} onPress={() => setDate(d)} />
            );
          })}
        </ScrollView>
      </View>
      {added > 0 && (
        <View style={{ backgroundColor: C.sprout, borderRadius: R.md, padding: S[3] }}>
          <Text style={[T.bodySm, { color: C.soil }]}>
            Added {added}. Keep going or finish.
          </Text>
        </View>
      )}
      <ErrorLine>{err}</ErrorLine>
      <View style={{ flexDirection: 'row', gap: S[2], flexWrap: 'wrap' }}>
        <Button label={p.first ? 'Add and finish' : 'Add'} size="lg" disabled={!title.trim() || !kid} busy={busy} onPress={() => void save(false)} />
        <Button label="Add another" variant="soft" size="lg" disabled={!title.trim() || !kid} onPress={() => void save(true)} />
      </View>
      {p.first && <Button label={added ? 'Finish' : 'Skip for now'} variant="quiet" onPress={() => router.replace('/home')} />}
    </Screen>
  );
}
