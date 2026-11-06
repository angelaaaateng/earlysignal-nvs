import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { Button, ErrorText, Field } from '@/ui/Form';
import { LinkKidCard } from '@/ui/LinkKid';
import { Loading } from '@/ui/Loading';
import { useParent } from '@/ui/parent';
import { ParentNav, Screen } from '@/ui/Screen';
import { body, C, display, eyebrow } from '@/ui/theme';

/** Parent account: linked kids, password help, sign out. */
export default function ParentAccount() {
  const { me, kids, kidsLoaded } = useParent();
  const { signOut, act, backend } = useApp();
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const [linking, setLinking] = useState(false);

  const confirm = (title: string, msg: string, go: () => void) => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(msg)) go();
    } else Alert.alert(title, msg, [{ text: 'Keep', style: 'cancel' }, { text: 'Continue', style: 'destructive', onPress: go }]);
  };

  const reset = async (id: string, name: string) => {
    setBusy(id);
    setErr('');
    try {
      await act('child.password.reset', (b, s) => b.resetChildPassword(s, id, pw), { studentId: id });
      setDone(`${name}’s password is updated. Tell them the new one.`);
      setResetFor(null);
      setPw('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
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
        <Text style={[body(800), { fontSize: 15, color: C.ink }]}>Your kids</Text>
        {!kidsLoaded && <Loading />}
        {kidsLoaded && kids.length === 0 && <Text style={[body(400), { fontSize: 13, color: C.muted }]}>No kid linked yet. Ask them for the code on their Me screen.</Text>}
        {!!done && <Text style={[body(700), { fontSize: 13, color: C.greenDeep }]}>{done}</Text>}
        <ErrorText>{err}</ErrorText>
        {kids.map((k) => (
          <View key={k.id} style={styles.kid}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={[body(800), { fontSize: 15, color: C.ink }]}>{k.name}</Text>
                {!!k.username && <Text style={[body(400), { fontSize: 13, color: C.muted }]}>signs in as {k.username}</Text>}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Reset ${k.name}’s password`} disabled={busy === k.id} onPress={() => { setResetFor(resetFor === k.id ? null : k.id); setPw(''); setDone(''); }} style={styles.smallBtn}>
                <Text style={[body(800), { fontSize: 13, color: C.white }]}>Reset password</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unlink ${k.name}`}
                disabled={busy === k.id}
                onPress={() => confirm(`Unlink ${k.name}?`, `You’ll stop seeing ${k.name}’s summary. Their account and data stay theirs.`, () => void act('parent.unlink', (b, s) => b.unlinkStudent(s, k.id), { studentId: k.id }))}
                style={styles.outlineBtn}
              >
                <Text style={[body(700), { fontSize: 12, color: C.rustDeep }]}>Unlink</Text>
              </Pressable>
            </View>
            {resetFor === k.id && (
              <View style={{ gap: 10, paddingTop: 6 }}>
                <Field dark={false} label={`New password for ${k.name}`} value={pw} onChange={setPw} placeholder="At least 8 characters" secure textContentType="newPassword" />
                <Button tone="parent" label={busy === k.id ? 'Saving…' : 'Save new password'} disabled={busy === k.id || pw.length < 8} onPress={() => void reset(k.id, k.name)} />
              </View>
            )}
          </View>
        ))}
      </View>

      {linking || kids.length === 0 ? (
        <LinkKidCard onLinked={() => setLinking(false)} />
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setLinking(true)} style={styles.primary}>
          <Text style={[body(800), { fontSize: 15, color: C.white }]}>Link another kid</Text>
        </Pressable>
      )}

      <View style={{ flexGrow: 1 }} />
      {backend.kind === 'mock' && <Text style={[body(400), { fontSize: 12, color: C.muted }]}>Demo data. Changes stay on this device.</Text>}
      <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.secondary}>
        <Text style={[body(800), { fontSize: 15, color: C.greenParent }]}>Sign out</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => confirm('Delete your account?', 'This deletes your parent account. Your kid’s account is not affected.', () => void act('account.delete', (b, s) => b.deleteMyAccount(s)).then(() => signOut()))} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={[body(400), { fontSize: 12, color: C.muted }]}>Delete my account</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.lineParent, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  kid: { gap: 4, paddingVertical: 4 },
  smallBtn: { backgroundColor: C.greenParent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  outlineBtn: { borderWidth: 1, borderColor: C.foxLine, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, minHeight: 36, justifyContent: 'center' },
  primary: { backgroundColor: C.greenParent, borderRadius: 16, padding: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  secondary: { borderWidth: 1.5, borderColor: C.greenParent, borderRadius: 16, padding: 12, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
});
