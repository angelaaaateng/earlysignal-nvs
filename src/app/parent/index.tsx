import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { sendCheer } from '@/domain/mutations';
import { parentWeeklySummary } from '@/domain/parent';
import { useParent } from '@/ui/parent';
import { ParentNav, Screen } from '@/ui/Screen';
import { body, C, display } from '@/ui/theme';
import { WeeklySummary } from '@/ui/WeeklySummary';

/** Canvas P1 · Parent: weekly summary. Shows only what the student shares. */
export default function ParentSummary() {
  const { me, studentId } = useParent();
  const { db, now, act } = useApp();
  const [sent, setSent] = useState(false);
  const s = useMemo(() => (studentId ? parentWeeklySummary(db, me.id, studentId, now) : undefined), [db, me.id, studentId, now]);

  return (
    <Screen bg={C.paperParent} footer={<ParentNav active="Summary" />} contentStyle={{ paddingTop: 26, gap: 12 }}>
      {s ? (
        <>
          <WeeklySummary s={s} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              disabled={sent}
              onPress={() => {
                act((d, t) => sendCheer(d, me.id, s.studentId, t));
                setSent(true);
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
