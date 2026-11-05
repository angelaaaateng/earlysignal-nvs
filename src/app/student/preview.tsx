import { Text, View } from 'react-native';
import { useAuditView, useLoad, useViewer } from '@/data/AppStore';
import type { ParentWeeklySummary } from '@/domain/parent';
import { Loading, LoadError } from '@/ui/Loading';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { useStudentHome } from '@/ui/student';
import { body, C } from '@/ui/theme';
import { WeeklySummary } from '@/ui/WeeklySummary';

/** "Preview Mom’s Friday summary": the exact projection the parent receives. */
export default function Preview() {
  const me = useViewer('student');
  const home = useStudentHome();
  const s = useLoad<ParentWeeklySummary>((b, sess, now) => b.previewParentSummary(sess, now));
  useAuditView('student.summary_preview.view', me.id);
  return (
    <Screen bg={C.paperParent} contentStyle={{ paddingTop: 24, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton label="Back to privacy settings" onPress={() => goBack('/student/me')} />
        <Text style={[body(700), { fontSize: 14, color: C.muted, flex: 1 }]}>
          This is exactly what {home.data?.parentLabel ?? 'your parent'} sees. Change it on the Me tab.
        </Text>
      </View>
      {s.data ? <WeeklySummary s={s.data} /> : s.error ? <LoadError error={s.error} retry={s.reload} /> : <Loading />}
    </Screen>
  );
}
