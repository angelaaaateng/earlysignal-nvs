import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { addDays, monthDay, relativeDay, toDateKey, weekStart, weekdayLong } from '@/domain/dates';
import { suggestForEvent } from '@/domain/suggest';
import { EVENT_KIND_LABEL, type KidEvent } from '@/domain/types';
import { Button, LoadError, Loading, PromptCard } from '@/ui/Kit';
import { Screen } from '@/ui/Screen';
import { C, R, S, T } from '@/ui/theme';
import { useHome } from '@/ui/useHome';

/** The week: what's on each kid's calendar, with three questions per event. */
export default function Week() {
  const { now, act } = useApp();
  const h = useHome();
  const [open, setOpen] = useState<string | null>(null);
  const today = toDateKey(now);
  if (!h.data) return <Screen tabs="Week">{h.error ? <LoadError error={h.error} retry={h.reload} /> : <Loading />}</Screen>;

  const start = weekStart(today);
  const end = addDays(start, 13);
  const events = h.events.filter((e) => e.date >= addDays(today, -3) && e.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  const byDay = new Map<string, KidEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const kidOf = (id: string) => h.kids.find((k) => k.id === id);

  const aside = (
    <View style={{ backgroundColor: C.bubble, borderRadius: R.lg, padding: S[5], gap: S[3] }}>
      <Text style={T.overline}>How this works</Text>
      <Text style={T.subhead}>One event, three questions</Text>
      <Text style={T.bodySm}>Before it happens you get questions that open the door. After, questions about what actually happened. Tonight’s starter on Home follows whichever is nearest.</Text>
      <Text style={T.bodySm}>Tip: add the whole week on Sunday. It takes two minutes and keeps the questions specific.</Text>
    </View>
  );

  return (
    <Screen tabs="Week" contentStyle={{ gap: S[5] }} aside={aside}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={T.overline}>
            {monthDay(start)} – {monthDay(end)}
          </Text>
          <Text accessibilityRole="header" style={[T.display, { marginTop: S[1] }]}>
            The week
          </Text>
        </View>
        <Button label="Add" icon="plus" size="sm" onPress={() => router.push({ pathname: '/event', params: h.kid ? { kid: h.kid.id } : {} })} />
      </View>

      {events.length === 0 && (
        <View style={{ backgroundColor: C.canopy, borderRadius: R.xl, padding: S[6], gap: S[3] }}>
          <Text style={[T.overline, { color: C.spark }]}>Sunday planning</Text>
          <Text style={[T.title, { color: C.onCanopy }]}>What’s on {h.kid?.name ?? 'their'} week?</Text>
          <Text style={[T.body, { color: '#bfd9c9' }]}>A test, a game, a tryout, a dance. Each one gets three questions: some for before, some for after.</Text>
          <Button label="Add the first one" variant="spark" onPress={() => router.push({ pathname: '/event', params: h.kid ? { kid: h.kid.id } : {} })} />
        </View>
      )}

      {[...byDay.entries()].map(([date, list]) => (
        <View key={date} style={{ gap: S[2] }}>
          <Text style={T.overline}>
            {weekdayLong(date)} · {monthDay(date)} · {relativeDay(today, date)}
          </Text>
          {list.map((e) => {
            const kid = kidOf(e.kidId);
            if (!kid) return null;
            const isOpen = open === e.id;
            const qs = isOpen ? suggestForEvent(kid, e, h.talks, today, 3) : [];
            return (
              <View key={e.id} style={{ gap: S[2] }}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpen(isOpen ? null : e.id)} style={{ backgroundColor: C.bubble, borderRadius: R.lg, padding: S[4], flexDirection: 'row', alignItems: 'center', gap: S[3] }}>
                  <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.bark, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[T.label, { color: C.onBark }]}>{kid.name.slice(0, 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={T.subhead}>{e.title}</Text>
                    <Text style={T.caption}>
                      {kid.name} · {EVENT_KIND_LABEL[e.kind]}
                    </Text>
                  </View>
                  <Text style={[T.label, { color: C.moss }]}>{isOpen ? 'Hide' : '3 questions'}</Text>
                </Pressable>
                {isOpen && (
                  <View style={{ gap: S[2], paddingLeft: S[2] }}>
                    {qs.map((q) => (
                      <PromptCard
                        key={q.promptId}
                        topic={q.context}
                        question={q.question}
                        tip={q.tip}
                        actions={<Button label="I asked it" variant="soft" size="sm" icon="check" onPress={() => router.push({ pathname: '/log', params: { kid: kid.id, prompt: q.promptId, question: q.question, context: q.context, event: e.id } })} />}
                      />
                    ))}
                    <Button label={`Remove ${e.title}`} variant="danger" size="sm" icon="trash" style={{ alignSelf: 'flex-start' }} onPress={() => void act('event.delete', (b, s) => b.deleteEvent(s, e.id), { kind: e.kind })} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}
