import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp, useAuditView, useLoad } from '@/data/AppStore';
import type { ParentWeeklySummary } from '@/domain/parent';
import { Loading, LoadError } from '@/ui/Loading';
import { useParent } from '@/ui/parent';
import { ParentNav, Screen } from '@/ui/Screen';
import { body, C, display } from '@/ui/theme';
import { WeeklySummary } from '@/ui/WeeklySummary';

/** Canvas P1 · Parent: weekly summary. Shows only what the student shares. */
export default function ParentSummary() {
  const { studentId, kidsLoaded } = useParent();
  const { act } = useApp();
  const [sent, setSent] = useState(false);
  const sum = useLoad<ParentWeeklySummary | undefined>((b, sess, now) => (studentId ? b.parentWeeklySummary(sess, studentId, now) : Promise.resolve(undefined)), [studentId]);
  useAuditView('parent.summary.view', studentId);
  const s = sum.data;
  const pending = !kidsLoaded || (studentId && sum.loading && !s);

  return (
    <Screen bg={C.paperParent} footer={<ParentNav active="Summary" />} contentStyle={{ paddingTop: 26, gap: 12 }}>
      {pending ? (
        <Loading />
      ) : sum.error ? (
        <LoadError error={sum.error} retry={sum.reload} />
      ) : s ? (
        <>
          <WeeklySummary s={s} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              disabled={sent}
              onPress={() => {
                setSent(true);
                void act('cheer.send', (b, sess) => b.sendCheer(sess, s.studentId)).catch(() => setSent(false));
              }}
              style={[styles.cheer, { backgroundColor: sent ? C.greenSoft : C.greenParent }]}
            >
              <Text style={[body(800), { fontSize: 15, color: sent ? C.greenDeep : C.white }]}>
                {sent ? 'Pip will deliver it ✓' : 'Send a cheer'}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.replace('/parent/help')} style={styles.help}>
              <Text style={[body(800), { fontSize: 15, color: C.greenParent }]}>Get help</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={[display(800), { fontSize: 28, color: C.ink }]}>
            No child linked yet
          </Text>
          <Text style={[body(400), { fontSize: 15, color: C.muted }]}>Set up your child’s account from the Account tab.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cheer: { flex: 1.3, borderRadius: 16, padding: 13, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  help: { flex: 1, borderWidth: 1.5, borderColor: C.greenParent, borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
});
