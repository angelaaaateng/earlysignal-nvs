import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useApp, useViewer } from '@/data/AppStore';
import { previewOwnParentSummary } from '@/domain/parent';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { useStudentHome } from '@/ui/student';
import { body, C } from '@/ui/theme';
import { WeeklySummary } from '@/ui/WeeklySummary';

/** "Preview Mom’s Friday summary": the exact projection the parent receives. */
export default function Preview() {
  const me = useViewer('student');
  const { db, now } = useApp();
  const h = useStudentHome();
  const s = useMemo(() => previewOwnParentSummary(db, me.id, now), [db, me.id, now]);
  return (
    <Screen bg={C.paperParent} contentStyle={{ paddingTop: 24, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton label="Back to privacy settings" onPress={() => goBack('/student/me')} />
        <Text style={[body(700), { fontSize: 14, color: C.muted, flex: 1 }]}>
          This is exactly what {h.parentLabel} sees. Change it on the Me tab.
        </Text>
      </View>
      <WeeklySummary s={s} />
    </Screen>
  );
}
