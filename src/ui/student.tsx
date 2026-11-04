import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp, useViewer } from '@/data/AppStore';
import { studentHome, type QuestView } from '@/domain/student';
import { Icon } from './Icon';
import { body, C } from './theme';

/** The signed-in student's own view, recomputed as data changes. */
export function useStudentHome() {
  const me = useViewer('student');
  const { db, now } = useApp();
  return useMemo(() => studentHome(db, me.id, now), [db, me.id, now]);
}

/** Checkbox square from the canvas: green filled when done, outlined otherwise. */
export function CheckBox({ done, outline = C.faint }: { done: boolean; outline?: string }) {
  return (
    <View style={[styles.box, done ? { backgroundColor: C.green } : { borderWidth: 2, borderColor: outline }]}>
      {done && <Icon name="check" size={14} color={C.card} strokeWidth={3.5} />}
    </View>
  );
}

/** A compact quest row (Burrow list, and the single-step quest on the planner). */
export function QuestRow({
  q,
  active,
  onToggle,
}: {
  q: QuestView;
  active?: boolean;
  /** Single-step quests can be ticked straight from the row. */
  onToggle?: () => void;
}) {
  const multi = q.steps.length > 1;
  const sub = q.done
    ? `Done · ${q.totalMinutes} min`
    : multi
      ? `Step ${q.nextStep + 1} of ${q.steps.length} · due ${q.dueLabel}`
      : `${q.totalMinutes} min · ${q.when ?? `due ${q.dueLabel}`}`;
  const reward = q.done ? C.greenParent : active ? C.rust : C.muted;
  const content = (
    <>
      <CheckBox done={q.done} outline={active ? C.fox : C.faint} />
      <View style={{ flex: 1 }}>
        <Text
          style={[
            body(active ? 800 : 700),
            { fontSize: 16, color: q.done ? C.muted : C.ink, textDecorationLine: q.done ? 'line-through' : 'none' },
          ]}
        >
          {q.title}
        </Text>
        <Text style={[body(400), { fontSize: 12, color: C.muted }]}>{sub}</Text>
      </View>
      <Text style={[body(800), { fontSize: 13, color: reward }]}>+{q.acorns}</Text>
    </>
  );
  const style = [styles.row, active ? { borderWidth: 2, borderColor: C.fox, paddingVertical: 13, paddingHorizontal: 15 } : null];
  if (onToggle && !multi) {
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: q.done }}
        aria-checked={q.done}
        accessibilityLabel={`${q.title}, ${sub}`}
        onPress={onToggle}
        style={style}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
  box: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  row: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
