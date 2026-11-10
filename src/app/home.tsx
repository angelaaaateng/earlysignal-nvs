import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { partOfDay, relativeDay, toDateKey, weekdayShort } from '@/domain/dates';
import { TOPIC_LABEL } from '@/domain/library';
import { monthCount, topTopic, weekView } from '@/domain/stats';
import { tonight } from '@/domain/suggest';
import { EVENT_KIND_LABEL, MOMENT_LABEL, type Moment } from '@/domain/types';
import { Button, Chip, KidChip, LoadError, Loading, PromptCard, StatTile, WeekRow } from '@/ui/Kit';
import { Screen } from '@/ui/Screen';
import { C, R, S, T } from '@/ui/theme';
import { useHome } from '@/ui/useHome';

/** Home: tonight's starter for the selected kid. */
export default function Home() {
  const { now, backend } = useApp();
  const h = useHome();
  const [variant, setVariant] = useState(0);
  const [moment, setMoment] = useState<Moment | undefined>();
  const today = toDateKey(now);
  const part = partOfDay(now);

  if (!h.data) return <Screen tabs="Home">{h.error ? <LoadError error={h.error} retry={h.reload} /> : <Loading />}</Screen>;

  if (h.kids.length === 0) {
    return (
      <Screen tabs="Home" contentStyle={{ gap: S[6] }}>
        <View>
          <Text style={T.overline}>Welcome</Text>
          <Text accessibilityRole="header" style={[T.display, { marginTop: S[1] }]}>
            Hi, {h.me.displayName.split(' ')[0]}
          </Text>
        </View>
        <View style={{ backgroundColor: C.canopy, borderRadius: R.xl, padding: S[6], gap: S[4] }}>
          <Text style={[T.overline, { color: C.spark }]}>Two minutes to set up</Text>
          <Text style={[T.title, { color: C.onCanopy }]}>Tell us about your kid, then what’s on their week.</Text>
          <Text style={[T.body, { color: '#bfd9c9' }]}>Rooted turns a math test or a tryout into a question you can actually use at pickup. Nothing here is shared with your kid or anyone else.</Text>
          <Button label="Add your kid" variant="spark" size="lg" onPress={() => router.push('/kid?first=1')} />
        </View>
        {backend.kind === 'mock' && <Text style={T.caption}>Demo mode: everything stays on this device.</Text>}
      </Screen>
    );
  }

  const kid = h.kid!;
  const s = tonight(kid, h.events, h.talks, today, variant);
  const week = weekView(h.talks, today);
  const upcoming = h.events.filter((e) => e.kidId === kid.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const top = topTopic(h.talks, kid);
  const askedToday = h.talks.some((t) => t.kidId === kid.id && t.askedAt.slice(0, 10) === today && t.outcome !== 'not_tonight');
  const logHref = { pathname: '/log' as const, params: { kid: kid.id, prompt: s.promptId, question: s.question, context: s.context, ...(s.eventId ? { event: s.eventId } : {}), ...(moment ? { moment } : {}) } };

  return (
    <Screen tabs="Home" contentStyle={{ gap: S[5] }}>
      <View>
        <Text style={T.overline}>
          {weekdayShort(today)} · {part}
        </Text>
        <Text accessibilityRole="header" style={[T.display, { marginTop: S[1] }]}>
          Good {part}
        </Text>
      </View>

      {h.kids.length > 1 && (
        <View style={{ flexDirection: 'row', gap: S[2], flexWrap: 'wrap' }}>
          {h.kids.map((k, i) => (
            <KidChip key={k.id} name={k.name} detail={`Grade ${k.grade}`} tone={i % 2 ? 'moss' : 'bark'} selected={k.id === kid.id} onPress={() => h.selectKid(k.id)} />
          ))}
        </View>
      )}

      <PromptCard
        tone="moss"
        eyebrow={askedToday ? `Another one for ${kid.name}` : `Tonight with ${kid.name}`}
        meta="2 min"
        question={s.question}
        tip={s.tip}
        actions={
          <>
            <Button label="I asked it" variant="spark" icon="check" onPress={() => router.push(logHref)} />
            <Button label="Try another" variant="onCanopy" icon="shuffle" onPress={() => setVariant((v) => v + 1)} />
          </>
        }
      >
        <Text style={[T.caption, { color: '#bfd9c9' }]}>
          {s.context} · {TOPIC_LABEL[s.topic]}
        </Text>
      </PromptCard>

      <View style={{ gap: S[3] }}>
        <Text accessibilityRole="header" style={T.heading}>
          Where are you two {part === 'evening' ? 'tonight' : 'today'}?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S[2] }}>
          {(Object.keys(MOMENT_LABEL) as Moment[]).filter((m) => m !== 'other').map((m) => (
            <Chip key={m} label={MOMENT_LABEL[m]} icon={m === 'car' ? 'car' : undefined} selected={moment === m} onPress={() => setMoment(moment === m ? undefined : m)} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: S[3], flexWrap: 'wrap' }}>
        <StatTile label="Talks this month" value={monthCount(h.talks, today)} note={`Since ${today.slice(5, 7) === '11' ? 'Nov' : 'the'} 1`} />
        <StatTile label="Top topic" value={top ?? '—'} note={top ? `${kid.name}’s favorite` : 'After a few talks'} />
      </View>

      <WeekRow title={`${week.talks} talk${week.talks === 1 ? '' : 's'} this week`} note="No streaks to protect. Every talk counts." days={week.days} />

      <View style={{ gap: S[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text accessibilityRole="header" style={T.heading}>
            Coming up for {kid.name}
          </Text>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/week')} hitSlop={12}>
            <Text style={[T.label, { color: C.moss }]}>The week</Text>
          </Pressable>
        </View>
        {upcoming.length === 0 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/event', params: { kid: kid.id } })} style={{ backgroundColor: C.bubble, borderRadius: R.lg, padding: S[5], gap: 6 }}>
            <Text style={T.subhead}>Nothing on the calendar yet</Text>
            <Text style={T.bodySm}>Add a test, a game or a tryout and tonight’s starter will be about it.</Text>
            <Text style={[T.label, { color: C.moss }]}>Add to {kid.name}’s week</Text>
          </Pressable>
        ) : (
          upcoming.map((e) => (
            <View key={e.id} style={{ backgroundColor: C.bubble, borderRadius: R.md, paddingVertical: S[3], paddingHorizontal: S[4], flexDirection: 'row', alignItems: 'center', gap: S[3] }}>
              <View style={{ flex: 1 }}>
                <Text style={T.subhead}>{e.title}</Text>
                <Text style={T.caption}>{EVENT_KIND_LABEL[e.kind]}</Text>
              </View>
              <Text style={T.monoSm}>{relativeDay(today, e.date)}</Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
