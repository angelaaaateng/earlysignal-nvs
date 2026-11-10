import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { allNotes } from '@/data/notes';
import { addDays, rangeLabel, relativeDay, toDateKey, weekStart } from '@/domain/dates';
import { promptById, TOPIC_LABEL } from '@/domain/library';
import { monthCount, promptFeedback, topTopic, weeksWithATalk, weekView } from '@/domain/stats';
import { OUTCOME_LABEL } from '@/domain/types';
import { Button, Card, LoadError, Loading, PromptCard, StatTile, WeekRow } from '@/ui/Kit';
import { Screen } from '@/ui/Screen';
import { C, R, S, T } from '@/ui/theme';
import { useHome } from '@/ui/useHome';

/** Grow: the Sunday check-in. What happened this week, what worked, plan the next. */
export default function Grow() {
  const { now, act } = useApp();
  const h = useHome();
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    void allNotes().then(setNotes);
  }, [h.version]);
  const today = toDateKey(now);
  if (!h.data) return <Screen tabs="Grow">{h.error ? <LoadError error={h.error} retry={h.reload} /> : <Loading />}</Screen>;

  const week = weekView(h.talks, today);
  const weeks = weeksWithATalk(h.talks, today);
  const top = topTopic(h.talks);
  const nextStart = addDays(weekStart(today), 7);
  const nextPlanned = h.weekReviews.some((w) => w.weekStart === nextStart);
  const recent = [...h.talks].sort((a, b) => b.askedAt.localeCompare(a.askedAt)).slice(0, 6);
  const worked = [...promptFeedback(h.talks).entries()]
    .filter(([, r]) => r.asked >= 1 && r.worked > 0)
    .sort((a, b) => b[1].worked - a[1].worked || b[1].asked - a[1].asked)
    .slice(0, 3);
  const kidName = (id: string) => h.kids.find((k) => k.id === id)?.name ?? 'your kid';

  const aside = (
    <>
      <Pressable accessibilityRole="link" onPress={() => router.push('/pilot')} style={{ backgroundColor: C.sparkTint, borderRadius: R.lg, padding: S[5], gap: 6 }}>
        <Text style={T.overline}>Founding-family pilot</Text>
        <Text style={T.subhead}>{h.data?.pilotInterested ? 'You’re on the list for the four-week pilot.' : 'Four weeks of reviewed questions for $59. Help us learn if this earns a place in your week.'}</Text>
        <Text style={[T.label, { color: C.moss }]}>{h.data?.pilotInterested ? 'See what’s included' : 'Tell me more'}</Text>
      </Pressable>
      {h.me.pilotMode && (
        <View style={{ backgroundColor: C.bubble, borderRadius: R.lg, padding: S[5], gap: 6 }}>
          <Text style={T.overline}>The experiment</Text>
          <Text style={T.subhead}>
            {(() => { const a = h.talks.filter((t) => t.arm === 'event').length; const g = h.talks.filter((t) => t.arm === 'generic').length; const ia = h.data!.impressions.filter((i) => i.arm === 'event').length; const ig = h.data!.impressions.filter((i) => i.arm === 'generic').length; return `Event questions asked ${a} of ${ia} shown · generic ${g} of ${ig}`; })()}
          </Text>
          <Text style={T.bodySm}>Some days the starter is about the week, some days it’s general. We’re testing whether entering the schedule earns its keep. Turn this off in Family.</Text>
        </View>
      )}
      {worked.length > 0 && (
        <View style={{ gap: S[3] }}>
          <Text accessibilityRole="header" style={T.heading}>
            Questions that worked
          </Text>
          {worked.map(([id, r]) => {
            const p = promptById(id);
            return (
              <Card key={id}>
                <Text style={T.subhead}>{p ? p.question.replace('{title}', 'it').replace('{name}', 'them') : id}</Text>
                <Text style={T.caption}>
                  {TOPIC_LABEL[p?.topic ?? 'school']} · landed {r.worked} of {r.asked} time{r.asked === 1 ? '' : 's'}
                </Text>
              </Card>
            );
          })}
        </View>
      )}

      <View style={{ gap: S[3] }}>
        <Text accessibilityRole="header" style={T.heading}>
          Recent talks
        </Text>
        {recent.length === 0 && <Text style={T.body}>Your first talk shows up here, with your note.</Text>}
        {recent.map((t) => (
          <PromptCard key={t.id} tone={notes[t.id] ? 'bark' : 'bubble'} tail={notes[t.id] ? 'right' : 'left'} eyebrow={notes[t.id] ? `Your note · ${kidName(t.kidId)}` : undefined} topic={notes[t.id] ? undefined : `${kidName(t.kidId)} · ${relativeDay(today, t.askedAt.slice(0, 10))}`} meta={OUTCOME_LABEL[t.outcome]} question={notes[t.id] ? notes[t.id] : t.question} tip={notes[t.id] ? `You asked: “${t.question}” · ${relativeDay(today, t.askedAt.slice(0, 10))}` : undefined} tipIcon="bookmark" />
        ))}
      </View>
      <Text style={T.caption}>Notes stay on this device. Rooted never sends them anywhere.</Text>
    </>
  );

  return (
    <Screen tabs="Grow" contentStyle={{ gap: S[5] }} aside={aside}>
      <View>
        <Text style={T.overline}>{rangeLabel(week.weekStart, addDays(week.weekStart, 6))}</Text>
        <Text accessibilityRole="header" style={[T.display, { marginTop: S[1] }]}>
          {week.talks === 0 ? 'A quiet week' : `${week.talks} talk${week.talks === 1 ? '' : 's'} this week`}
        </Text>
      </View>

      <WeekRow title={week.realTalks > 0 ? `${week.realTalks} that really landed` : 'Pick up whenever you’re ready'} note="Small moments count. There’s nothing to catch up on." days={week.days} />

      <View style={{ flexDirection: 'row', gap: S[3], flexWrap: 'wrap' }}>
        <StatTile label="This month" value={monthCount(h.talks, today)} note="talks" />
        <StatTile label="Weeks with a talk" value={`${weeks.n} of ${weeks.of}`} note="last four weeks" />
        <StatTile label="Top topic" value={top ?? '—'} note={top ? 'what landed best' : 'after a few talks'} />
      </View>

      <View style={{ backgroundColor: nextPlanned ? C.sprout : C.canopy, borderRadius: R.xl, padding: S[6], gap: S[3] }}>
        <Text style={[T.overline, { color: nextPlanned ? C.moss : C.spark }]}>Sunday check-in</Text>
        <Text style={[T.title, { color: nextPlanned ? C.soil : C.onCanopy }]}>{nextPlanned ? 'Next week is planned.' : 'Plan next week in two minutes.'}</Text>
        <Text style={[T.body, { color: nextPlanned ? C.soilMuted : '#bfd9c9' }]}>
          {nextPlanned ? 'Add anything new as it comes up. Tonight’s starter will follow the calendar.' : 'Add what’s coming up and Rooted writes the questions. Tests, games, tryouts, a dance.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: S[2], flexWrap: 'wrap' }}>
          <Button label={nextPlanned ? 'Add another' : 'Add next week’s events'} variant={nextPlanned ? 'primary' : 'spark'} onPress={() => router.push({ pathname: '/event', params: { ...(h.kid ? { kid: h.kid.id } : {}), date: nextStart } })} />
          {!nextPlanned && <Button label="Nothing new" variant="onCanopy" onPress={() => void act('week.review', (b, s) => b.markWeekReviewed(s, addDays(today, 7)))} />}
        </View>
      </View>

    </Screen>
  );
}
