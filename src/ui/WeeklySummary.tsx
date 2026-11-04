import { StyleSheet, Text, View } from 'react-native';
import { USING_MOCK_DATA } from '@/data/AppStore';
import type { ParentWeeklySummary } from '@/domain/parent';
import { body, C, display, eyebrow } from './theme';

/** Canvas P1 body. Renders only what the projection contains; hidden fields say so. */
export function WeeklySummary({ s }: { s: ParentWeeklySummary }) {
  const tiles = [
    { value: s.checkIns ? `${s.checkIns.done}/${s.checkIns.of}` : '–', label: s.checkIns ? 'days checked in' : 'check-ins private' },
    { value: s.questsFinished !== undefined ? String(s.questsFinished) : '–', label: s.questsFinished !== undefined ? 'quests finished' : 'quests private' },
    { value: s.streak !== undefined ? String(s.streak) : '–', label: s.streak !== undefined ? 'day streak' : 'streak private' },
  ];

  return (
    <>
      <View style={styles.head}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text style={eyebrow(C.greenParent)}>Friday summary · {s.weekLabel}</Text>
          <Text accessibilityRole="header" style={[display(800), { fontSize: 28, color: C.ink }]}>
            {s.studentName}’s week
          </Text>
        </View>
        {USING_MOCK_DATA && <Text style={[body(800), styles.badge]}>Example data</Text>}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {tiles.map((t) => (
          <View key={t.label} style={styles.tile}>
            <Text style={[display(800), { fontSize: 24, color: C.ink, fontVariant: ['tabular-nums'] }]}>{t.value}</Text>
            <Text style={[body(400), { fontSize: 12, color: C.muted }]}>{t.label}</Text>
          </View>
        ))}
      </View>

      {s.moodWeeks ? (
        <View style={styles.card}>
          <View style={{ gap: 2 }}>
            <Text style={[body(800), { fontSize: 13, color: C.ink }]}>How heavy school felt (1 light, 5 a lot)</Text>
            <Text style={[body(400), { fontSize: 12, color: C.muted }]}>Weekly average, last 5 weeks</Text>
          </View>
          <View style={styles.chart} accessible accessibilityLabel={s.moodWeeks.map((w) => `Week of ${w.label}: ${w.avg ?? 'no check-ins'}`).join('. ')}>
            {s.moodWeeks.map((w) => (
              <View key={w.label} style={styles.barCol}>
                <View
                  style={{
                    width: '100%',
                    height: w.avg === null ? 6 : Math.max(6, w.avg * 13),
                    backgroundColor: w.avg === null ? C.lineParent : w.avg >= 3.5 ? C.fox : C.gold,
                    borderRadius: 6,
                  }}
                />
                <Text style={[body(w.current ? 800 : 400), { fontSize: 11, color: C.muted }]}>
                  {w.current ? 'This wk' : w.label}
                </Text>
                <Text style={[body(800), { fontSize: 11, color: C.ink }]}>{w.avg ?? '–'}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={[body(400), { fontSize: 13, color: C.muted }]}>{s.studentName} keeps the mood trend private.</Text>
        </View>
      )}

      {s.win && (
        <View style={[styles.note, { backgroundColor: C.greenSoft }]}>
          <Text style={eyebrow(C.greenDeep, 12)}>Win</Text>
          <Text style={[body(700), { fontSize: 15, color: C.ink }]}>{s.win}</Text>
        </View>
      )}
      {s.watch && (
        <View style={[styles.note, { backgroundColor: C.goldSoft }]}>
          <Text style={eyebrow(C.goldInk, 12)}>Watch</Text>
          <Text style={[body(700), { fontSize: 15, color: C.ink }]}>{s.watch}</Text>
        </View>
      )}
      {!!s.upcomingTests?.length && (
        <View style={[styles.note, { backgroundColor: C.white, borderWidth: 1, borderColor: C.lineParent }]}>
          <Text style={eyebrow(C.greenParent, 12)}>Coming up</Text>
          {s.upcomingTests.map((t) => (
            <Text key={t.title} style={[body(700), { fontSize: 15, color: C.ink }]}>
              {t.title} · {t.dueLabel}
            </Text>
          ))}
        </View>
      )}
      <View style={[styles.note, { backgroundColor: C.burrow, gap: 6 }]}>
        <Text style={eyebrow(C.gold, 12)}>Try saying tonight</Text>
        <Text style={[display(600), { fontSize: 17, lineHeight: 22, color: C.cream }]}>{s.trySaying}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { fontSize: 12, color: C.muted, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  tile: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.lineParent, borderRadius: 16, padding: 12, gap: 2 },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.lineParent, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 100 },
  barCol: { flex: 1, alignItems: 'center', gap: 2 },
  note: { borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 4 },
});
