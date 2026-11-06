import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { weekdayLong } from '@/domain/dates';
import { Loading, LoadError } from '@/ui/Loading';
import { splitReason, type QuestView } from '@/domain/student';
import { Icon } from '@/ui/Icon';
import { Screen, StudentNav } from '@/ui/Screen';
import { CheckBox, QuestRow, useStudentHome } from '@/ui/student';
import { body, C, display, eyebrow } from '@/ui/theme';

/** Canvas S3 · Student: quest planner. */
export default function Quests() {
  const { data: h, error, reload } = useStudentHome();
  const { act } = useApp();
  if (!h) {
    return (
      <Screen bg={C.paper} footer={<StudentNav active="Quests" />}>
        {error ? <LoadError error={error} retry={reload} /> : <Loading />}
      </Screen>
    );
  }
  const [featured, ...rest] = h.open;
  const toggle = (stepId: string) => void act('quest.step.toggle', (b, s) => b.toggleQuestStep(s, stepId), { stepId });

  return (
    <Screen bg={C.paper} footer={<StudentNav active="Quests" />} contentStyle={{ paddingTop: 28, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text style={eyebrow(C.rust)}>Tonight’s plan · about {h.tonightMinutes} min</Text>
          <Text accessibilityRole="header" style={[display(800), { fontSize: 28, color: C.ink }]}>
            Quests
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Add a quest" onPress={() => router.push('/student/add-quest')} style={styles.add}>
          <Text style={[body(800), { fontSize: 14, color: C.card }]}>+ Add</Text>
        </Pressable>
      </View>

      {featured ? (
        <Featured q={featured} reason={featured.steps.length > 1 ? splitReason(h.todayScore) : undefined} onToggle={toggle} onRemove={() => void act('quest.delete', (b, s) => b.deleteQuest(s, featured.id), { questId: featured.id })} />
      ) : h.tonight.length === 0 && !h.boss ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/student/add-quest')} style={[styles.featured, { borderColor: C.line, borderWidth: 1.5, borderStyle: 'dashed' }]}>
          <Text style={[display(700), { fontSize: 20, color: C.ink }]}>Your plan is empty</Text>
          <Text style={[body(400), { fontSize: 14, color: C.muted }]}>Add tonight’s homework, or pick a study habit from the library. Pip handles the splitting.</Text>
          <Text style={[body(800), { fontSize: 15, color: C.rust }]}>Add a quest →</Text>
        </Pressable>
      ) : (
        <View style={[styles.featured, { borderColor: C.line, borderWidth: 1 }]}>
          <Text style={[display(700), { fontSize: 20, color: C.ink }]}>All done for tonight</Text>
          <Text style={[body(400), { fontSize: 14, color: C.muted }]}>Every quest is finished. Pip is proud of you.</Text>
        </View>
      )}

      {h.boss && (
        <View style={styles.boss} accessible accessibilityLabel={`Boss battle ${weekdayLong(h.boss.dueDate)}: ${h.boss.title}. ${h.boss.doneCount} of ${h.boss.steps.length} prep steps done`}>
          <View style={styles.bossIcon}>
            <Icon name="swords" size={26} color={C.gold} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={eyebrow(C.gold, 12)}>Boss battle · {weekdayLong(h.boss.dueDate)}</Text>
            <Text style={[body(800), { fontSize: 16, color: C.cream }]}>{h.boss.title}</Text>
            <Text style={[body(400), { fontSize: 13, color: C.creamMuted }]}>
              {h.boss.doneCount} of {h.boss.steps.length} prep steps done{h.boss.reward ? ` · ${h.boss.reward}` : ''}
            </Text>
          </View>
        </View>
      )}

      {rest.map((q) => (
        <QuestRow key={q.id} q={q} onToggle={() => toggle(q.steps[0].id)} />
      ))}
    </Screen>
  );
}

function Featured({ q, reason, onToggle, onRemove }: { q: QuestView; reason?: string; onToggle: (stepId: string) => void; onRemove: () => void }) {
  return (
    <View style={styles.featured}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text accessibilityRole="header" style={[display(700), { fontSize: 20, color: C.ink }]}>
            {q.title}
          </Text>
          <Text style={[body(400), { fontSize: 13, color: C.muted }]}>
            Due {q.dueLabel}
            {q.teacher ? ` · ${q.teacher}` : ''}
          </Text>
        </View>
        <Text style={[body(800), styles.reward]}>+{q.acorns} acorns</Text>
      </View>

      {reason && (
        <Text style={[body(400), styles.pipNote]}>
          <Text style={[body(800), { color: C.ink }]}>Pip split this into {q.steps.length} steps</Text> because {reason}.
        </Text>
      )}

      <View style={{ gap: 8 }}>
        {q.steps.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: s.done }}
            aria-checked={s.done}
            accessibilityLabel={`${s.label}, ${s.timeLabel}`}
            onPress={() => onToggle(s.id)}
            style={styles.step}
          >
            <CheckBox done={s.done} outline={C.fox} />
            <View style={{ flex: 1 }}>
              <Text style={[body(700), { fontSize: 15, color: C.ink, textDecorationLine: s.done ? 'line-through' : 'none' }]}>{s.label}</Text>
              <Text style={[body(400), { fontSize: 12, color: C.muted }]}>{s.timeLabel}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {q.nextStep >= 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/student/focus', params: { quest: q.id } })}
          style={styles.sprint}
        >
          <Text style={[body(800), { fontSize: 16, color: C.card }]}>
            Start a {Math.min(25, q.steps[q.nextStep].minutes)}-min focus sprint
          </Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${q.title}`} onPress={onRemove} style={{ alignSelf: 'flex-end', minHeight: 36, justifyContent: 'center' }}>
        <Text style={[body(700), { fontSize: 13, color: C.muted }]}>Remove quest</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  featured: { backgroundColor: C.card, borderWidth: 2, borderColor: C.fox, borderRadius: 22, padding: 18, gap: 12 },
  add: { backgroundColor: C.fox, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  reward: { fontSize: 13, color: C.rust, backgroundColor: C.foxSoft, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, overflow: 'hidden' },
  pipNote: { fontSize: 14, color: C.muted, backgroundColor: C.paper, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, overflow: 'hidden' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 2, minHeight: 44 },
  sprint: { backgroundColor: C.fox, borderRadius: 16, padding: 14, alignItems: 'center', minHeight: 44 },
  boss: { backgroundColor: C.burrow, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  bossIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.burrowEdge, alignItems: 'center', justifyContent: 'center' },
});
