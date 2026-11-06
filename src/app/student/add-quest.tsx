import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { addDays, toDateKey } from '@/domain/dates';
import { HABIT_LIBRARY, planQuest, QUEST_TYPES, type QuestType } from '@/domain/questTemplates';
import { Button, ErrorText, Field } from '@/ui/Form';
import { Pip } from '@/ui/Pip';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { body, C, display, eyebrow } from '@/ui/theme';

type Tab = 'homework' | 'library';
const DUE = [
  { key: 0, label: 'Today' },
  { key: 1, label: 'Tomorrow' },
  { key: 3, label: 'In 3 days' },
  { key: 7, label: 'Next week' },
];

/** Student: add a quest. Homework (Pip splits it into steps) or a habit from the library. */
export default function AddQuest() {
  const { act, now } = useApp();
  const [tab, setTab] = useState<Tab>('homework');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<QuestType>('worksheet');
  const [due, setDue] = useState(1);
  const [teacher, setTeacher] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const today = toDateKey(now);

  const plan = planQuest({ title: title || 'Your quest', type, dueDate: addDays(today, due), teacher });

  const save = async (key: string, p: Parameters<typeof planQuest>[0] | { habit: (typeof HABIT_LIBRARY)[number] }) => {
    setBusy(key);
    setErr('');
    try {
      const q = 'habit' in p
        ? { title: p.habit.title, kind: 'quest' as const, dueDate: addDays(today, 1), acorns: p.habit.acorns, when: p.habit.when, steps: p.habit.steps }
        : planQuest(p);
      await act('quest.create', (b, s) => b.createQuest(s, q), { kind: q.kind, steps: q.steps.length });
      router.replace('/student/quests');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen bg={C.paper} contentStyle={{ paddingTop: 16, gap: 14 }}>
      <BackButton onPress={() => goBack('/student/quests')} label="Back to quests" />
      <View style={{ gap: 2 }}>
        <Text style={eyebrow(C.rust)}>New quest</Text>
        <Text accessibilityRole="header" style={[display(800), { fontSize: 28, color: C.ink }]}>
          What’s on your plate?
        </Text>
      </View>

      <View style={styles.tabs}>
        {(['homework', 'library'] as Tab[]).map((t) => (
          <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[body(800), { fontSize: 14, color: tab === t ? C.card : C.ink }]}>{t === 'homework' ? 'Homework' : 'Study habits'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'homework' ? (
        <>
          <Field dark={false} label="What is it?" value={title} onChange={setTitle} placeholder="Math worksheet 4.2" autoCapitalize="sentences" autoFocus />
          <Text style={[body(800), { fontSize: 14, color: C.ink }]}>What kind?</Text>
          <View style={styles.chips}>
            {QUEST_TYPES.map((t) => (
              <Pressable key={t.key} accessibilityRole="radio" accessibilityState={{ selected: type === t.key }} onPress={() => setType(t.key)} style={[styles.chip, type === t.key && styles.chipOn]}>
                <Text style={[body(700), { fontSize: 13, color: type === t.key ? C.card : C.ink }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[body(800), { fontSize: 14, color: C.ink }]}>Due</Text>
          <View style={styles.chips}>
            {DUE.map((d) => (
              <Pressable key={d.key} accessibilityRole="radio" accessibilityState={{ selected: due === d.key }} onPress={() => setDue(d.key)} style={[styles.chip, due === d.key && styles.chipOn]}>
                <Text style={[body(700), { fontSize: 13, color: due === d.key ? C.card : C.ink }]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
          <Field dark={false} label="Teacher (optional)" value={teacher} onChange={setTeacher} placeholder="Ms. Ortiz" autoCapitalize="words" />

          <View style={styles.preview}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pip size={44} variant="burrow" label="" />
              <Text style={[body(800), { fontSize: 14, color: C.cream, flex: 1 }]}>
                {plan.kind === 'boss' ? 'Boss battle! ' : ''}Pip splits this into {plan.steps.length} step{plan.steps.length > 1 ? 's' : ''} · +{plan.acorns} acorns
              </Text>
            </View>
            {plan.steps.map((s, i) => (
              <Text key={i} style={[body(400), { fontSize: 13, color: C.creamMuted }]}>
                {i + 1}. {s.label} · {s.minutes} min
              </Text>
            ))}
          </View>
          <ErrorText>{err}</ErrorText>
          <Button label={busy ? 'Adding…' : 'Add to my plan'} disabled={!!busy || !title.trim()} onPress={() => void save('hw', { title, type, dueDate: addDays(today, due), teacher })} />
        </>
      ) : (
        <>
          <Text style={[body(400), { fontSize: 14, color: C.muted }]}>Small habits that make school lighter. Tap one to add it for tomorrow.</Text>
          <ErrorText>{err}</ErrorText>
          {HABIT_LIBRARY.map((h) => (
            <Pressable key={h.id} accessibilityRole="button" disabled={!!busy} onPress={() => void save(h.id, { habit: h })} style={styles.habit}>
              <View style={{ flex: 1 }}>
                <Text style={[body(800), { fontSize: 15, color: C.ink }]}>{h.title}</Text>
                <Text style={[body(400), { fontSize: 13, color: C.muted }]}>
                  {h.sub} · {h.steps.reduce((n, s) => n + s.minutes, 0)} min
                </Text>
              </View>
              <Text style={[body(800), { fontSize: 13, color: C.rust }]}>{busy === h.id ? 'Adding…' : `+${h.acorns}`}</Text>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.line },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  tabOn: { backgroundColor: C.fox },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, minHeight: 40, justifyContent: 'center' },
  chipOn: { backgroundColor: C.fox, borderColor: C.fox },
  preview: { backgroundColor: C.burrow, borderRadius: 20, padding: 16, gap: 6 },
  habit: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
