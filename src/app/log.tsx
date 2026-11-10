import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { setNote } from '@/data/notes';
import { promptById, SECOND_MOVE } from '@/domain/library';
import { COUNTS_AS_TALK, MOMENT_LABEL, type Arm, type Moment, type Outcome } from '@/domain/types';
import { Button, CheckIn, Chip, ErrorLine, PromptCard, TextField } from '@/ui/Kit';
import { C } from '@/ui/theme';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { S, T } from '@/ui/theme';
import { useHome } from '@/ui/useHome';

/** After "I asked it": how did it go, where were you, and a note that stays on the device. */
export default function LogTalk() {
  const p = useLocalSearchParams<{ kid: string; prompt: string; question: string; context?: string; event?: string; moment?: Moment; arm?: Arm }>();
  const { act, backend, session } = useApp();
  const h = useHome();
  const [outcome, setOutcome] = useState<Outcome | undefined>();
  const [moment, setMoment] = useState<Moment | undefined>(p.moment);
  const [note, setNoteText] = useState('');
  const [usedFollowUp, setUsedFollowUp] = useState(false);
  const topic = promptById(p.prompt)?.topic ?? 'school';
  const move = SECOND_MOVE[topic];
  const answered = !!outcome && COUNTS_AS_TALK[outcome];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const kid = h.kids.find((k) => k.id === p.kid);

  const save = async () => {
    if (!outcome || !kid) return;
    setBusy(true);
    setErr('');
    try {
      const id = await backend.logTalk(session!, { kidId: kid.id, eventId: p.event, promptId: p.prompt, question: p.question, moment, outcome, arm: p.arm ?? (p.event ? 'event' : 'generic'), followUpUsed: usedFollowUp });
      await setNote(id, note);
      await act('talk.log', async () => undefined, { outcome, moment, event: !!p.event, arm: p.arm, followUp: usedFollowUp, hasNote: note.trim().length > 0 });
      router.replace('/home');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen narrow contentStyle={{ gap: S[5] }}>
      <BackButton onPress={() => goBack('/home')} label="Back" />
      <View>
        <Text style={T.overline}>{kid ? `You asked ${kid.name}` : 'You asked'}</Text>
        <Text accessibilityRole="header" style={[T.title, { marginTop: S[1] }]}>
          Nice. That’s the whole job.
        </Text>
      </View>
      <PromptCard question={p.question} topic={p.context} />
      <CheckIn value={outcome} onChange={setOutcome} />
      {outcome === 'wrong_moment' && <Text style={T.bodySm}>Fair. The question comes back another day, and this never counts against you.</Text>}
      {answered && (
        <PromptCard tone="bark" eyebrow="The second move" question={move.followUp} tip={move.listen} tipIcon="talk">
          <Button label={usedFollowUp ? 'Asked the follow-up' : 'I asked this too'} variant={usedFollowUp ? 'soft' : 'onCanopy'} size="sm" icon="check" style={{ alignSelf: 'flex-start', backgroundColor: usedFollowUp ? C.oat : C.trunkRaised }} onPress={() => setUsedFollowUp((v) => !v)} />
        </PromptCard>
      )}
      <View style={{ gap: S[3] }}>
        <Text style={T.subhead}>Where were you?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S[2] }}>
          {(Object.keys(MOMENT_LABEL) as Moment[]).map((m) => (
            <Chip key={m} label={MOMENT_LABEL[m]} selected={moment === m} onPress={() => setMoment(moment === m ? undefined : m)} />
          ))}
        </View>
      </View>
      <TextField label="A note for you (optional)" value={note} onChange={setNoteText} multiline placeholder={kid ? `What ${kid.name} said, or what to ask next time` : 'What to ask next time'} hint="Stays on this device. Never uploaded, never shared." />
      <ErrorLine>{err}</ErrorLine>
      <Button label="Save" size="lg" disabled={!outcome} busy={busy} onPress={() => void save()} />
      <Button label="Skip for now" variant="quiet" onPress={() => goBack('/home')} />
    </Screen>
  );
}
