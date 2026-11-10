import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { Button, Card, ErrorLine } from '@/ui/Kit';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { C, R, S, T } from '@/ui/theme';
import { useHome } from '@/ui/useHome';

const CHECKOUT = process.env.EXPO_PUBLIC_CHECKOUT_URL ?? '';

/** The founding-family pilot: a real offer, counted against everyone who sees it. */
export default function Pilot() {
  const { act } = useApp();
  const h = useHome();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const reserve = async () => {
    setBusy(true);
    setErr('');
    try {
      await act('pilot.interest', (b, s) => b.registerPilotInterest(s), { checkout: !!CHECKOUT });
      if (CHECKOUT) void Linking.openURL(CHECKOUT);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen narrow contentStyle={{ gap: S[5] }}>
      <BackButton onPress={() => goBack('/grow')} label="Back" />
      <View style={{ backgroundColor: C.canopy, borderRadius: R.xl, padding: S[6], gap: S[3] }}>
        <Text style={[T.overline, { color: C.spark }]}>Founding-family pilot</Text>
        <Text style={[T.display, { color: C.onCanopy, fontSize: 32, lineHeight: 36 }]}>Four weeks of questions a person on our team reviews.</Text>
        <Text style={[T.body, { color: '#bfd9c9' }]}>$59 once. You get every question for your kid’s week, a Sunday check-in with the team, and a say in what Rooted becomes. We get to learn whether this earns a place in your week.</Text>
        <View style={{ gap: S[2], marginTop: S[2] }}>
          {h.data?.pilotInterested ? (
            <View style={{ backgroundColor: C.canopyRaised, borderRadius: R.md, padding: S[4] }}>
              <Text style={[T.subhead, { color: C.onCanopy }]}>You’re on the list.</Text>
              <Text style={[T.bodySm, { color: '#bfd9c9' }]}>{CHECKOUT ? 'Finish checkout any time; we’ll be in touch the same day.' : 'We’ll reach out with the next step. Nothing is charged yet.'}</Text>
            </View>
          ) : (
            <Button label={busy ? 'Saving…' : CHECKOUT ? 'Reserve my spot · $59' : 'Count me in'} variant="spark" size="lg" busy={busy} onPress={() => void reserve()} />
          )}
          <ErrorLine>{err}</ErrorLine>
        </View>
      </View>
      <Card>
        <Text style={T.subhead}>What’s included</Text>
        <Text style={T.body}>Unlimited questions. Reminders at your pickup time. Photo and calendar import. Your notes stay on your device, as always.</Text>
      </Card>
      <Card>
        <Text style={T.subhead}>What we’ll ask of you</Text>
        <Text style={T.body}>One tap after each talk and a two-minute Sunday check-in. At week four, whether you’d pay to continue. That answer matters more than the $59.</Text>
      </Card>
      <Text style={T.caption}>Prices are proposals; paid demand is what the pilot tests. Nothing about your kid is ever shared.</Text>
    </Screen>
  );
}
