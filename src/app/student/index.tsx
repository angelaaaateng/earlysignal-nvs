import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { Loading, LoadError } from '@/ui/Loading';
import { Acorn, Flame, Icon } from '@/ui/Icon';
import { Pip } from '@/ui/Pip';
import { Screen, StudentNav } from '@/ui/Screen';
import { QuestRow, useStudentHome } from '@/ui/student';
import { body, C, display, eyebrow } from '@/ui/theme';

/** Canvas S1 · Student: the Burrow (home). */
export default function Burrow() {
  const { data: h, error, reload } = useStudentHome();
  const { act } = useApp();
  if (!h) {
    return (
      <Screen bg={C.paper} footer={<StudentNav active="Burrow" />}>
        {error ? <LoadError error={error} retry={reload} /> : <Loading />}
      </Screen>
    );
  }
  const checkedIn = h.todayScore !== undefined;

  return (
    <Screen bg={C.paper} footer={<StudentNav active="Burrow" />} contentStyle={{ paddingTop: 28 }}>
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Text style={[body(700), { fontSize: 13, color: C.muted }]}>{h.dayLabel}</Text>
          <Text accessibilityRole="header" style={[display(800), { fontSize: 28, color: C.ink }]}>
            Hi, {h.firstName}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={styles.pill} accessibilityLabel={`${h.acorns} acorns`}>
            <Acorn />
            <Text style={[body(800), styles.pillText]}>{h.acorns}</Text>
          </View>
          <View style={styles.pill} accessibilityLabel={`${h.streak} day streak`}>
            <Flame />
            <Text style={[body(800), styles.pillText]}>{h.streak} days</Text>
          </View>
        </View>
      </View>

      <View style={styles.burrow}>
        <Pip size={112} variant="burrow" label="Pip the fox in the Burrow" />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={eyebrow(C.gold, 12)}>Burrow level {h.level.level}</Text>
          <Text style={[display(700), { fontSize: 19, lineHeight: 23, color: C.cream }]}>
            {checkedIn ? '“Nice check-in. One quest at a time.”' : '“Ready when you are. Small steps tonight.”'}
          </Text>
          <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(h.level.progress * 100) }}>
            <View style={[styles.fill, { width: `${Math.round(h.level.progress * 100)}%` }]} />
          </View>
          <Text style={[body(400), { fontSize: 12, color: C.creamMuted }]}>
            {h.level.acornsToNext} acorns to the {h.level.nextRoom}
          </Text>
        </View>
      </View>

      <Pressable accessibilityRole="link" onPress={() => router.push('/student/check-in')} style={styles.checkIn}>
        <View style={styles.checkInIcon}>
          <Icon name="smile" size={22} color={C.card} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[body(800), { fontSize: 16, color: C.ink }]}>How heavy is today?</Text>
          <Text style={[body(400), { fontSize: 13, color: C.muted }]}>
            {checkedIn ? `You said ${h.todayScore} today · tap to change` : 'One-tap check-in · +5 acorns'}
          </Text>
        </View>
        <Text style={[body(800), { fontSize: 15, color: C.rust }]}>{checkedIn ? 'Update' : 'Check in'}</Text>
      </Pressable>

      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={[display(700), { fontSize: 20, color: C.ink }]}>
          Tonight’s quests
        </Text>
        <Pressable accessibilityRole="link" onPress={() => router.replace('/student/quests')} hitSlop={12}>
          <Text style={[body(800), { fontSize: 14, color: C.rust }]}>See plan</Text>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        {h.tonight.length === 0 && (
          <Text style={[body(400), { fontSize: 14, color: C.muted }]}>No quests tonight. Enjoy the Burrow.</Text>
        )}
        {h.tonight.map((q) => (
          <QuestRow
            key={q.id}
            q={q}
            active={q.id === h.activeQuestId}
            onToggle={() => void act('quest.step.toggle', (b, s) => b.toggleQuestStep(s, q.steps[0].id), { stepId: q.steps[0].id })}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillText: { fontSize: 14, color: C.ink },
  burrow: { backgroundColor: C.burrow, borderRadius: 28, padding: 20, flexDirection: 'row', gap: 14, alignItems: 'center' },
  track: { height: 10, backgroundColor: C.burrowEdge, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.gold, borderRadius: 999 },
  checkIn: { backgroundColor: C.foxSoft, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  checkInIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.fox, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
