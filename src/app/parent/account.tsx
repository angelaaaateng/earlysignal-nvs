import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp, useLoad } from '@/data/AppStore';
import { monthDay, toDateKey } from '@/domain/dates';
import { Loading } from '@/ui/Loading';
import { log } from '@/observability/logger';
import { useParent } from '@/ui/parent';
import { ParentNav, Screen } from '@/ui/Screen';
import { body, C, display, eyebrow } from '@/ui/theme';

const METHOD = { card_check: 'card check', signed_form: 'signed form', video_call: 'video call' } as const;

/** Parent account. Not on the canvas; built in the same style. Hosts the COPPA setup flow. */
export default function ParentAccount() {
  const { me, session, kids, kidsLoaded } = useParent();
  const { signOut, signIn, act, backend } = useApp();
  const optIn = useLoad<boolean>((b, s) => b.familyOptIn(s));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  /**
   * The parent's tap is the child's sign-in: mint a one-time token for this
   * child and open their Burrow on this device. The child types nothing.
   */
  const openBurrow = async (id: string) => {
    setBusy(id);
    try {
      const token = await backend.issueChildSignIn(session, id);
      log.audit('child.sign_in.issue', { studentId: id });
      const r = await signIn((b) => b.redeemChildSignIn(token));
      if (!r.ok) setErr(r.message);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = (id: string, name: string) => {
    const go = () => {
      setBusy(id);
      void act('student.account.delete', (b, s) => b.deleteStudent(s, id), { studentId: id }).finally(() => setBusy(null));
    };
    const msg = `This withdraws your consent and permanently deletes ${name}’s check-ins, notes and quests. It can’t be undone.`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(msg)) go();
    } else {
      Alert.alert(`Delete ${name}’s account?`, msg, [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
    }
  };

  return (
    <Screen bg={C.paperParent} footer={<ParentNav active="Account" />} contentStyle={{ paddingTop: 26, gap: 14 }}>
      <View style={{ gap: 2 }}>
        <Text style={eyebrow(C.greenParent)}>Account</Text>
        <Text accessibilityRole="header" style={[display(800), { fontSize: 28, color: C.ink }]}>
          {me.displayName}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={[body(800), { fontSize: 13, color: C.ink }]}>Your children</Text>
        {!kidsLoaded && <Loading />}
        {kidsLoaded && kids.length === 0 && <Text style={[body(400), { fontSize: 13, color: C.muted }]}>No child account yet.</Text>}
        {kids.length > 0 && <Text style={[body(400), { fontSize: 13, color: C.muted }]}>Tap Open Burrow to sign your child in on this device. They never need a password.</Text>}
        {!!err && <Text accessibilityRole="alert" style={[body(700), { fontSize: 13, color: C.rustDeep }]}>{err}</Text>}
        {kids.map((k) => (
          <View key={k.id} style={styles.kid}>
            <View style={{ flex: 1 }}>
              <Text style={[body(800), { fontSize: 15, color: C.ink }]}>{k.name}</Text>
              <Text style={[body(400), { fontSize: 13, color: C.muted }]}>
                {k.consent
                  ? `Parental consent on file · ${METHOD[k.consent.method]}, ${monthDay(toDateKey(new Date(k.consent.grantedAt)))}`
                  : '13 or older · no consent needed'}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${k.name}’s Burrow`} disabled={busy === k.id} onPress={() => void openBurrow(k.id)} style={styles.openBtn}>
              <Text style={[body(800), { fontSize: 13, color: C.white }]}>{busy === k.id ? 'Opening…' : 'Open Burrow'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${k.name}’s account`} disabled={busy === k.id} onPress={() => confirmDelete(k.id, k.name)} style={styles.deleteBtn}>
              <Text style={[body(700), { fontSize: 12, color: C.rustDeep }]}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[body(800), { fontSize: 15, color: C.ink }]}>Share with the school</Text>
          <Text style={[body(400), { fontSize: 13, color: C.muted }]}>
            Lets the counselor see the signals your child shares. Never notes, messages or grades. You can turn this off any time.
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: !!optIn.data }}
          aria-checked={!!optIn.data}
          accessibilityLabel="Share with the school"
          onPress={() => void act('family.admin_opt_in', (b, s) => b.setAdminOptIn(s, !optIn.data), { optIn: !optIn.data })}
          style={styles.switchHit}
        >
          <View style={[styles.track, { backgroundColor: optIn.data ? C.greenParent : C.faint, justifyContent: optIn.data ? 'flex-end' : 'flex-start' }]}>
            <View style={styles.knob} />
          </View>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/parent/add-child')} style={styles.primary}>
        <Text style={[body(800), { fontSize: 15, color: C.white }]}>Set up a child’s account</Text>
      </Pressable>
      <Text style={[body(400), { fontSize: 13, color: C.muted }]}>
        Under 13, you give consent first. We don’t create the account until you do.
      </Text>

      <View style={{ flexGrow: 1 }} />
      {backend.kind === 'mock' && <Text style={[body(400), { fontSize: 12, color: C.muted }]}>Demo data. Changes stay on this device.</Text>}
      <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.secondary}>
        <Text style={[body(800), { fontSize: 15, color: C.greenParent }]}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.lineParent, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  kid: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  openBtn: { backgroundColor: C.greenParent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  deleteBtn: { borderWidth: 1, borderColor: C.foxLine, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, minHeight: 36, justifyContent: 'center' },
  switchHit: { width: 56, height: 44, alignItems: 'center', justifyContent: 'center' },
  track: { width: 52, height: 30, borderRadius: 999, flexDirection: 'row', alignItems: 'center', padding: 3 },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.white },
  primary: { backgroundColor: C.greenParent, borderRadius: 16, padding: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  secondary: { borderWidth: 1.5, borderColor: C.greenParent, borderRadius: 16, padding: 12, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
});
