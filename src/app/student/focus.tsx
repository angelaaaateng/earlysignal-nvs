import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '@/data/AppStore';
import { toggleQuestStep } from '@/domain/mutations';
import { Icon } from '@/ui/Icon';
import { Pip } from '@/ui/Pip';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { useStudentHome } from '@/ui/student';
import type { QuestView, StepView } from '@/domain/student';
import { body, C, display, eyebrow } from '@/ui/theme';

/** Sprints cap at 25 minutes (canvas copy). */
const MAX_SPRINT_MIN = 25;
const R = 122;
const CIRC = 2 * Math.PI * R;

/** Canvas S4 · Student: focus sprint. */
export default function Focus() {
  const h = useStudentHome();
  const { quest: questId } = useLocalSearchParams<{ quest?: string }>();
  const q = h.open.find((x) => x.id === questId) ?? h.open.find((x) => x.id === h.activeQuestId) ?? h.open[0];
  const step = q && q.nextStep >= 0 ? q.steps[q.nextStep] : undefined;

  if (!q || !step) {
    return (
      <Screen bg={C.burrowDeep} contentStyle={{ gap: 18, alignItems: 'center', justifyContent: 'center' }}>
        <Pip size={120} variant="focus" />
        <Text style={[display(700), { fontSize: 22, color: C.cream, textAlign: 'center' }]}>Nothing to focus on right now</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/student/quests')} style={[styles.done, { flex: 0, paddingHorizontal: 24 }]}>
          <Text style={[body(800), { fontSize: 16, color: C.ink }]}>See tonight’s plan</Text>
        </Pressable>
      </Screen>
    );
  }

  // Keyed by step: a new step starts a fresh timer.
  return <Sprint key={step.id} q={q} step={step} studentId={h.studentId} />;
}

function Sprint({ q, step, studentId }: { q: QuestView; step: StepView; studentId: string }) {
  const { act } = useApp();
  const total = Math.min(MAX_SPRINT_MIN, step.minutes) * 60;
  const [left, setLeft] = useState(total);
  const [paused, setPaused] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const finished = left <= 0;

  useEffect(() => {
    if (paused || finished) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [paused, finished]);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  const status = left === 0 ? 'Time’s up. Pip calls a break.' : paused ? 'Paused. Take a breath.' : 'Pip is studying with you';

  const finish = () => {
    act((db, now) => toggleQuestStep(db, studentId, step.id, now));
    router.replace('/student');
  };

  return (
    <Screen bg={C.burrowDeep} contentStyle={{ gap: 18 }}>
      <View style={styles.top}>
        <BackButton dark label="Back to quests" onPress={() => goBack('/student/quests')} />
        <Text style={eyebrow(C.creamMuted)}>Focus sprint</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[body(400), { fontSize: 13, color: C.creamMuted }]}>
          {q.title} · step {q.nextStep + 1} of {q.steps.length}
        </Text>
        <Text accessibilityRole="header" style={[display(700), { fontSize: 22, color: C.cream, textAlign: 'center', maxWidth: 300 }]}>
          {step.label}
        </Text>
      </View>

      <View
        style={styles.ring}
        accessible
        accessibilityRole="timer"
        accessibilityLabel={`${mm} minutes ${left % 60} seconds left of ${total / 60}`}
      >
        <Svg width={280} height={280} viewBox="0 0 280 280">
          <Circle cx="140" cy="140" r={R} fill="none" stroke={C.burrow} strokeWidth={18} />
          <Circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke={C.gold}
            strokeWidth={18}
            strokeLinecap="round"
            strokeDasharray={`${CIRC}`}
            strokeDashoffset={CIRC * (1 - left / total)}
            transform="rotate(-90 140 140)"
          />
        </Svg>
        <View style={styles.ringInner}>
          <Pip size={96} variant="focus" />
          <Text style={[display(800), { fontSize: 48, lineHeight: 50, color: C.cream, fontVariant: ['tabular-nums'] }]}>
            {mm}:{ss}
          </Text>
          <Text style={[body(400), { fontSize: 13, color: C.creamMuted }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.hintCard}>
        <Icon name="bulb" size={22} color={C.gold} />
        <Text style={[body(400), { fontSize: 14, color: C.creamMuted, flex: 1 }]} aria-live="polite">
          {showHint ? step.hint ?? 'Try the very first tiny piece. What’s one word you could write?' : 'Stuck? Pip gives hints, never answers.'}
        </Text>
        {!showHint && (
          <Pressable accessibilityRole="button" onPress={() => setShowHint(true)} style={styles.hintBtn}>
            <Text style={[body(800), { fontSize: 14, color: C.gold }]}>Get a hint</Text>
          </Pressable>
        )}
      </View>

      <View style={{ flexGrow: 1 }} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" onPress={() => setPaused((p) => !p)} style={styles.pause}>
          <Text style={[body(800), { fontSize: 16, color: C.cream }]}>{paused ? 'Resume' : 'Pause'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={finish} style={styles.done}>
          <Text style={[body(800), { fontSize: 16, color: C.ink }]}>I finished this step</Text>
        </Pressable>
      </View>
      <Text style={[body(400), { fontSize: 13, color: C.creamMuted, textAlign: 'center' }]}>
        Sprints cap at 25 minutes, then Pip calls a break.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ring: { width: 280, height: 280, alignSelf: 'center' },
  ringInner: { position: 'absolute', left: 0, top: 0, width: 280, height: 280, alignItems: 'center', justifyContent: 'center', gap: 6 },
  hintCard: { backgroundColor: C.burrow, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  hintBtn: { borderWidth: 1.5, borderColor: C.gold, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  pause: { flex: 1, backgroundColor: C.burrow, borderRadius: 18, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  done: { flex: 1.4, backgroundColor: C.gold, borderRadius: 18, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
});
