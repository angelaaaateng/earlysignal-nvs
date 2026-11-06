import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp, useLoad } from '@/data/AppStore';
import { ErrorText } from '@/ui/Form';
import { Loading, LoadError } from '@/ui/Loading';
import type { SharingKey } from '@/domain/types';
import { Icon } from '@/ui/Icon';
import { Screen, StudentNav } from '@/ui/Screen';
import { useStudentHome } from '@/ui/student';
import { body, C, display, eyebrow } from '@/ui/theme';

const ROWS: { key: SharingKey; label: string; sub: string }[] = [
  { key: 'moodTrend', label: 'Weekly mood trend', sub: 'The average, not each day’s answer' },
  { key: 'questsFinished', label: 'Quests finished', sub: 'How many, not what you wrote' },
  { key: 'streakAndLevel', label: 'Streak and Burrow level', sub: 'So she can cheer you on' },
  { key: 'upcomingTests', label: 'Upcoming tests', sub: 'Boss battles on your plan' },
];

/** Canvas S5 · Student: what's shared. The student is the only one who can change these. */
export default function Me() {
  const { data: h, error, reload } = useStudentHome();
  const { act, signOut, backend, session } = useApp();
  const parents = useLoad((b, s) => b.myParents(s));
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const showCode = async () => {
    setBusy(true);
    setErr('');
    try {
      setCode(await backend.createParentLinkCode(session!));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const deleteAccount = () => {
    const go = () => void act('account.delete', (b, s) => b.deleteMyAccount(s)).then(() => signOut());
    const msg = 'This deletes your account, check-ins, notes and quests for good.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(msg)) go();
    } else Alert.alert('Delete your account?', msg, [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };
  if (!h) {
    return (
      <Screen bg={C.paper} footer={<StudentNav active="Me" />}>
        {error ? <LoadError error={error} retry={reload} /> : <Loading />}
      </Screen>
    );
  }
  const linked = parents.data ?? [];
  const who = linked.length === 0 ? 'a parent' : linked.length === 1 ? linked[0].name.split(' ')[0] : 'your parents';

  return (
    <Screen bg={C.paper} footer={<StudentNav active="Me" />} contentStyle={{ paddingTop: 28, gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text style={eyebrow(C.rust)}>Me · Privacy</Text>
        <Text accessibilityRole="header" style={[display(800), { fontSize: 28, color: C.ink }]}>
          What {who} can see
        </Text>
        <Text style={[body(400), { fontSize: 15, color: C.muted }]}>
          You decide. Nothing is shared unless you switch it on here.
        </Text>
      </View>

      <View style={styles.list}>
        {ROWS.map((r, i) => {
          const on = h.sharing[r.key];
          return (
            <View key={r.key} style={[styles.row, i < ROWS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.line }]}>
              <View style={{ flex: 1 }}>
                <Text style={[body(800), { fontSize: 15, color: C.ink }]}>{r.label}</Text>
                <Text style={[body(400), { fontSize: 13, color: C.muted }]}>{r.sub}</Text>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                accessibilityLabel={r.label}
                onPress={() => void act('sharing.update', (b, s) => b.setSharing(s, r.key, !on), { key: r.key, value: !on })}
                style={styles.switchHit}
              >
                <View style={[styles.track, { backgroundColor: on ? C.green : C.faint, justifyContent: on ? 'flex-end' : 'flex-start' }]}>
                  <View style={styles.knob} />
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.family}>
        <Text style={[body(800), { fontSize: 15, color: C.ink }]}>Family</Text>
        {linked.length === 0 ? (
          <Text style={[body(400), { fontSize: 13, color: C.muted }]}>No parent linked. If you want one to see your weekly summary, show them a code. They’ll only ever see what you switch on above.</Text>
        ) : (
          linked.map((p) => (
            <Text key={p.id} style={[body(400), { fontSize: 14, color: C.ink }]}>
              {p.name} <Text style={{ color: C.muted }}>· linked</Text>
            </Text>
          ))
        )}
        {code ? (
          <View style={styles.codeBox} accessible accessibilityLabel={`Parent code ${code.code.split('').join(' ')}`}>
            <Text style={[display(800), { fontSize: 34, letterSpacing: 6, color: C.cream }]}>{code.code}</Text>
            <Text style={[body(400), { fontSize: 13, color: C.creamMuted, textAlign: 'center' }]}>Your parent signs up at the same link, taps “I’m a parent”, and types this code. Good for 7 days, one use.</Text>
          </View>
        ) : (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void showCode()} style={styles.linkBtn}>
            <Text style={[body(800), { fontSize: 14, color: C.card }]}>{busy ? 'Making a code…' : linked.length ? 'Add another parent' : 'Add a parent'}</Text>
          </Pressable>
        )}
        <ErrorText>{err}</ErrorText>
      </View>

      <View style={styles.private}>
        <Icon name="lock" size={24} color={C.gold} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[body(800), { fontSize: 15, color: C.cream }]}>Always private</Text>
          <Text style={[body(400), { fontSize: 13, color: C.creamMuted }]}>
            Your notes to Pip, your messages and your location. Never shared.
          </Text>
        </View>
      </View>

      <View style={styles.hard}>
        <Text style={[body(800), { fontSize: 15, color: C.ink }]}>If a week is really hard</Text>
        <Text style={[body(400), { fontSize: 13, color: C.ink }]}>
          Pip asks you first before telling your parent. The only exception is if you might be unsafe.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/student/preview')} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={[body(800), { fontSize: 15, color: C.rust }]}>Preview {who}’s Friday summary →</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={[body(700), { fontSize: 14, color: C.muted }]}>Sign out</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={deleteAccount} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={[body(400), { fontSize: 12, color: C.muted }]}>Delete my account</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, paddingVertical: 6, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  switchHit: { width: 56, height: 44, alignItems: 'center', justifyContent: 'center' },
  track: { width: 52, height: 30, borderRadius: 999, flexDirection: 'row', alignItems: 'center', padding: 3 },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.card },
  family: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16, gap: 10 },
  codeBox: { backgroundColor: C.burrow, borderRadius: 18, padding: 16, alignItems: 'center', gap: 8 },
  linkBtn: { backgroundColor: C.fox, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 16, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  private: { backgroundColor: C.burrow, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  hard: { backgroundColor: C.greenSoft, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 4 },
});
