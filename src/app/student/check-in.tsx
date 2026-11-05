import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp, useLoad } from '@/data/AppStore';
import { CHECK_IN_LEVELS } from '@/domain/student';
import { Loading, LoadError } from '@/ui/Loading';
import type { CheckInScore } from '@/domain/types';
import { Pip } from '@/ui/Pip';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { useStudentHome } from '@/ui/student';
import { body, C, display, eyebrow } from '@/ui/theme';

/** Canvas S2 · Student: daily check-in. */
export default function CheckInScreen() {
  const { data: h, error, reload } = useStudentHome();
  const note0 = useLoad((b, s, now) => b.ownNoteForToday(s, now));
  if (!h || note0.data === undefined) {
    return <Screen bg={C.paper}>{error ? <LoadError error={error} retry={reload} /> : <Loading />}</Screen>;
  }
  return <CheckInForm key={`${h.todayScore ?? ''}:${note0.data}`} todayScore={h.todayScore} initialNote={note0.data} />;
}

function CheckInForm({ todayScore, initialNote }: { todayScore?: CheckInScore; initialNote: string }) {
  const { act } = useApp();
  const [picked, setPicked] = useState<CheckInScore | undefined>(todayScore);
  const [note, setNote] = useState(initialNote);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const cur = picked ? CHECK_IN_LEVELS[picked - 1] : undefined;
  const firstToday = todayScore === undefined;

  const submit = async () => {
    if (!picked || busy) return;
    setBusy(true);
    setErr('');
    try {
      await act('checkin.submit', (b, s) => b.submitCheckIn(s, picked, note), { score: picked, hasNote: note.trim().length > 0 });
      router.replace('/student/quests');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen bg={C.paper} contentStyle={{ paddingTop: 24, gap: 18 }}>
      <View style={styles.top}>
        <BackButton label="Back to the Burrow" onPress={() => goBack('/student')} />
        <Text style={eyebrow(C.muted)}>Daily check-in</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={[styles.sky, { backgroundColor: cur?.sky ?? C.burrow }]} aria-live="polite">
        <Pip size={120} variant="plain" />
        <Text style={eyebrow(C.gold, 12)}>{cur?.weather ?? 'Pip is listening'}</Text>
        <Text style={[display(700), { fontSize: 21, lineHeight: 26, color: C.cream, textAlign: 'center', maxWidth: 300 }]}>
          {cur?.reply ?? 'Tap a number. There’s no wrong answer.'}
        </Text>
      </View>

      <Text accessibilityRole="header" style={[display(800), { fontSize: 26, color: C.ink, textAlign: 'center' }]}>
        How heavy is today?
      </Text>

      <View accessibilityRole="radiogroup" aria-label="How heavy is today, 1 to 5" style={styles.levels}>
        {CHECK_IN_LEVELS.map((l) => {
          const on = l.n === picked;
          return (
            <Pressable
              key={l.n}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              accessibilityLabel={`${l.n}, ${l.label}`}
              onPress={() => setPicked(l.n)}
              style={[styles.level, { backgroundColor: on ? C.fox : C.card, borderColor: on ? C.fox : C.line }]}
            >
              <Text style={[display(800), { fontSize: 26, color: on ? C.card : C.ink }]}>{l.n}</Text>
              <Text style={[body(800), { fontSize: 12, color: on ? C.card : C.ink }]}>{l.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text nativeID="noteLabel" style={[body(800), { fontSize: 14, color: C.ink }]}>
        Anything on your mind? <Text style={[body(600), { color: C.muted }]}>(optional, only Pip sees this)</Text>
      </Text>
      <TextInput
        aria-labelledby="noteLabel"
        accessibilityLabel="Anything on your mind? Optional, only Pip sees this"
        value={note}
        onChangeText={setNote}
        placeholder="e.g. big science thing tomorrow"
        placeholderTextColor={C.faint}
        maxLength={500}
        style={[body(400), styles.input]}
      />

      <View style={{ flexGrow: 1 }} />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !picked || busy }}
        disabled={!picked || busy}
        onPress={() => void submit()}
        style={[styles.cta, (!picked || busy) && { opacity: 0.5 }]}
      >
        <Text style={[body(800), { fontSize: 17, color: C.cream }]}>{busy ? 'Saving…' : cur?.cta ?? 'Pick a number first'}</Text>
      </Pressable>
      {!!err && <Text accessibilityRole="alert" style={[body(700), { fontSize: 13, color: C.rustDeep, textAlign: 'center' }]}>{err}</Text>}
      <Text style={[body(400), { fontSize: 13, color: C.muted, textAlign: 'center' }]}>
        {firstToday ? '+5 acorns · your streak stays safe' : 'Already checked in today · your streak is safe'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sky: { borderRadius: 28, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center', gap: 10 },
  levels: { flexDirection: 'row', gap: 8 },
  level: { flex: 1, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', gap: 4, minHeight: 76, borderWidth: 2 },
  input: {
    fontSize: 15,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.card,
    color: C.ink,
    minHeight: 48,
  },
  cta: { backgroundColor: C.ink, borderRadius: 18, padding: 16, alignItems: 'center', minHeight: 44 },
});
