import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { monthDay, toDateKey } from '@/domain/dates';
import { useParent } from '@/ui/parent';
import { ParentNav, Screen } from '@/ui/Screen';
import { body, C, display, eyebrow } from '@/ui/theme';

const METHOD = { card_check: 'card check', signed_form: 'signed form', video_call: 'video call' } as const;

/** Parent account. Not on the canvas; built in the same style. Hosts the COPPA setup flow. */
export default function ParentAccount() {
  const { me, kids } = useParent();
  const { db, signOut } = useApp();

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
        {kids.map((k) => {
          const consent = db.consents.find((c) => c.studentId === k.id && !c.revokedAt);
          return (
            <View key={k.id} style={styles.kid}>
              <Text style={[body(800), { fontSize: 15, color: C.ink }]}>{k.name}</Text>
              <Text style={[body(400), { fontSize: 13, color: C.muted }]}>
                {consent
                  ? `Parental consent on file · ${METHOD[consent.method]}, ${monthDay(toDateKey(new Date(consent.grantedAt)))}`
                  : '13 or older · no consent needed'}
              </Text>
            </View>
          );
        })}
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/parent/add-child')} style={styles.primary}>
        <Text style={[body(800), { fontSize: 15, color: C.white }]}>Set up a child’s account</Text>
      </Pressable>
      <Text style={[body(400), { fontSize: 13, color: C.muted }]}>
        Under 13, you give consent first. We don’t create the account until you do.
      </Text>

      <View style={{ flexGrow: 1 }} />
      <Pressable accessibilityRole="button" onPress={signOut} style={styles.secondary}>
        <Text style={[body(800), { fontSize: 15, color: C.greenParent }]}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.lineParent, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  kid: { gap: 2 },
  primary: { backgroundColor: C.greenParent, borderRadius: 16, padding: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  secondary: { borderWidth: 1.5, borderColor: C.greenParent, borderRadius: 16, padding: 12, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
});
