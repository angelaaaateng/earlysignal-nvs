import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { ACTIVITY_OPTIONS, INTEREST_OPTIONS, type Kid } from '@/domain/types';
import { Button, Chip, ErrorLine, Loading, TextField } from '@/ui/Kit';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { S, T } from '@/ui/theme';
import { useHome } from '@/ui/useHome';

const GRADES = [6, 7, 8, 9, 10, 11, 12];

/** Add or edit a kid: name, grade, interests, activities. That's all Rooted knows. */
export default function KidForm() {
  const p = useLocalSearchParams<{ id?: string; first?: string }>();
  const h = useHome();
  const existing = h.kids.find((k) => k.id === p.id);
  if (p.id && !h.data) return <Screen><Loading /></Screen>;
  return <Form key={existing?.id ?? 'new'} existing={existing} first={!!p.first} />;
}

function Form({ existing, first }: { existing?: Kid; first: boolean }) {
  const p = { first: first ? '1' : undefined };
  const { backend, session, act } = useApp();
  const [name, setName] = useState(existing?.name ?? '');
  const [grade, setGrade] = useState(existing?.grade ?? 6);
  const [interests, setInterests] = useState<string[]>(existing?.interests ?? []);
  const [activities, setActivities] = useState<string[]>(existing?.activities ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toggle = (list: string[], set: (v: string[]) => void, x: string) => set(list.includes(x) ? list.filter((i) => i !== x) : [...list, x]);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      if (existing) {
        await act('kid.update', (b, s) => b.updateKid(s, existing.id, { name, grade, interests, activities }));
        goBack('/family');
      } else {
        const id = await backend.addKid(session!, { name, grade, interests, activities });
        await act('kid.add', async () => undefined, { grade });
        if (p.first) router.replace({ pathname: '/event', params: { kid: id, first: '1' } });
        else goBack('/family');
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = () => {
    if (!existing) return;
    const go = () => void act('kid.delete', (b, s) => b.deleteKid(s, existing.id)).then(() => router.replace('/family'));
    const msg = `This removes ${existing.name}’s profile, events and talks. It can’t be undone.`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(msg)) go();
    } else Alert.alert(`Remove ${existing.name}?`, msg, [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  return (
    <Screen contentStyle={{ gap: S[5] }}>
      {!p.first && <BackButton onPress={() => goBack('/family')} label="Back" />}
      <View>
        <Text style={T.overline}>{p.first ? 'Step 1 of 2' : existing ? 'Edit' : 'New'}</Text>
        <Text accessibilityRole="header" style={[T.title, { marginTop: S[1] }]}>
          {existing ? existing.name : 'Tell us about your kid'}
        </Text>
      </View>
      <TextField label="First name" value={name} onChange={setName} placeholder="Ava" autoCapitalize="words" hint="Starters use it: “What part of the test felt ready, Ava?”" autoFocus={!existing} />
      <View style={{ gap: S[2] }}>
        <Text style={T.label}>Grade</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S[2] }}>
          {GRADES.map((g) => (
            <Chip key={g} label={`Grade ${g}`} selected={grade === g} onPress={() => setGrade(g)} />
          ))}
        </View>
      </View>
      <View style={{ gap: S[2] }}>
        <Text style={T.label}>What are they into?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S[2] }}>
          {INTEREST_OPTIONS.map((x) => (
            <Chip key={x} label={x} tone="bark" selected={interests.includes(x)} onPress={() => toggle(interests, setInterests, x)} />
          ))}
        </View>
      </View>
      <View style={{ gap: S[2] }}>
        <Text style={T.label}>Regular activities</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S[2] }}>
          {ACTIVITY_OPTIONS.map((x) => (
            <Chip key={x} label={x} tone="moss" selected={activities.includes(x)} onPress={() => toggle(activities, setActivities, x)} />
          ))}
        </View>
      </View>
      <ErrorLine>{err}</ErrorLine>
      <Button label={p.first ? 'Next: their week' : existing ? 'Save' : 'Add kid'} size="lg" disabled={!name.trim()} busy={busy} onPress={() => void save()} />
      {existing && <Button label={`Remove ${existing.name}’s profile`} variant="danger" icon="trash" onPress={remove} />}
    </Screen>
  );
}
