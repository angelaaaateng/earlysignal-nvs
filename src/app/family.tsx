import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { NUDGE_HOURS } from '@/domain/types';
import { pushSupported, subscribeToPush, unsubscribeFromPush } from '@/pwa/push';
import { useApp } from '@/data/AppStore';
import { clearNotes } from '@/data/notes';
import { Button, Card, Chip, LoadError, Loading } from '@/ui/Kit';
import { Screen } from '@/ui/Screen';
import { C, R, S, T } from '@/ui/theme';
import { useHome } from '@/ui/useHome';

/** Family: the kids as the parent describes them, and the parent's account. */
export default function Family() {
  const { signOut, act, backend, session } = useApp();
  const h = useHome();
  const [nudgeErr, setNudgeErr] = useState('');
  const nudge = h.me.nudge ?? { enabled: false, hour: 17, tz: 'America/New_York' };
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || nudge.tz; } catch { return nudge.tz; } })();
  const setNudge = async (enabled: boolean, hour = nudge.hour) => {
    setNudgeErr('');
    try {
      if (enabled && pushSupported()) {
        const sub = await subscribeToPush();
        if (!sub) { setNudgeErr('Notifications are blocked in this browser. Allow them in the address bar, then try again.'); return; }
        await backend.savePushSubscription(session!, sub);
      }
      if (!enabled && pushSupported()) { const ep = await unsubscribeFromPush(); if (ep) await backend.removePushSubscription(session!, ep); }
      await act('nudge.set', (b, s) => b.setNudge(s, { enabled, hour, tz }), { enabled, hour });
    } catch (e) {
      setNudgeErr((e as Error).message);
    }
  };
  if (!h.data) return <Screen tabs="Family">{h.error ? <LoadError error={h.error} retry={h.reload} /> : <Loading />}</Screen>;

  const confirm = (title: string, msg: string, go: () => void) => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(msg)) go();
    } else Alert.alert(title, msg, [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };

  const aside = (
      <Card style={{ backgroundColor: C.sprout }}>
        <Text style={T.subhead}>What Rooted knows</Text>
        <Text style={T.body}>A first name, a grade, interests and the events you type in. Your kid never uses the app. Your notes stay on this device and are never uploaded.</Text>
      </Card>
  );

  return (
    <Screen tabs="Family" contentStyle={{ gap: S[5] }} aside={aside}>
      <View>
        <Text style={T.overline}>Family</Text>
        <Text accessibilityRole="header" style={[T.display, { marginTop: S[1] }]}>
          {h.me.displayName.split(' ')[0]}’s kids
        </Text>
      </View>

      {h.kids.map((k, i) => (
        <Card key={k.id} style={{ gap: S[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S[3] }}>
            <View style={{ width: 48, height: 48, borderRadius: R.pill, backgroundColor: i % 2 ? C.moss : C.bark, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[T.heading, { color: C.onBark }]}>{k.name.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={T.subhead}>{k.name}</Text>
              <Text style={T.caption}>Grade {k.grade}</Text>
            </View>
            <Button label="Edit" variant="soft" size="sm" onPress={() => router.push({ pathname: '/kid', params: { id: k.id } })} />
          </View>
          {(k.interests.length > 0 || k.activities.length > 0) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S[2] }}>
              {k.interests.map((x) => (
                <Chip key={x} label={x} tone="bark" />
              ))}
              {k.activities.map((x) => (
                <Chip key={x} label={x} tone="moss" />
              ))}
            </View>
          )}
        </Card>
      ))}
      <Button label={h.kids.length ? 'Add another kid' : 'Add your kid'} icon="plus" variant={h.kids.length ? 'soft' : 'primary'} onPress={() => router.push('/kid')} />

      <Card style={{ gap: S[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S[3] }}>
          <View style={{ flex: 1 }}>
            <Text style={T.subhead}>Reminder</Text>
            <Text style={T.bodySm}>One nudge a day with your kid’s name and the event. Never the question, never anything they said.</Text>
          </View>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: nudge.enabled }} aria-checked={nudge.enabled} accessibilityLabel="Daily reminder" onPress={() => void setNudge(!nudge.enabled)} style={{ width: 52, height: 30, borderRadius: R.pill, backgroundColor: nudge.enabled ? C.moss : C.oat, padding: 3, justifyContent: 'center' }}>
            <View style={{ width: 24, height: 24, borderRadius: R.pill, backgroundColor: C.bubble, alignSelf: nudge.enabled ? 'flex-end' : 'flex-start' }} />
          </Pressable>
        </View>
        {nudge.enabled && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S[2] }}>
            {NUDGE_HOURS.map((o) => (
              <Chip key={o.hour} label={o.label} selected={nudge.hour === o.hour} onPress={() => void setNudge(true, o.hour)} />
            ))}
          </View>
        )}
        {nudge.enabled && <Text style={T.caption}>{pushSupported() ? `Sent to this browser at ${nudge.hour > 12 ? nudge.hour - 12 : nudge.hour} ${nudge.hour >= 12 ? 'pm' : 'am'} (${tz}).` : backend.kind === 'mock' ? 'Demo: reminders are saved but not sent.' : 'This browser can’t receive notifications. Open Rooted in Chrome or add it to your home screen.'}</Text>}
        {!!nudgeErr && <Text style={[T.bodySm, { color: C.rust }]}>{nudgeErr}</Text>}
      </Card>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S[3] }}>
        <View style={{ flex: 1 }}>
          <Text style={T.subhead}>Pilot mode</Text>
          <Text style={T.bodySm}>Alternates event questions with general ones so we can learn which earn their keep. Off means always about the week.</Text>
        </View>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: !!h.me.pilotMode }} aria-checked={!!h.me.pilotMode} accessibilityLabel="Pilot mode" onPress={() => void act('pilot.mode', (b, s) => b.setPilotMode(s, !h.me.pilotMode), { on: !h.me.pilotMode })} style={{ width: 52, height: 30, borderRadius: R.pill, backgroundColor: h.me.pilotMode ? C.moss : C.oat, padding: 3, justifyContent: 'center' }}>
          <View style={{ width: 24, height: 24, borderRadius: R.pill, backgroundColor: C.bubble, alignSelf: h.me.pilotMode ? 'flex-end' : 'flex-start' }} />
        </Pressable>
      </Card>


      <View style={{ gap: S[2], marginTop: S[4] }}>
        <Text style={T.overline}>Account</Text>
        <Text style={T.body}>{h.me.displayName}</Text>
        {backend.kind === 'mock' && <Text style={T.caption}>Demo data. Changes stay on this device.</Text>}
        <Button label="Sign out" variant="soft" onPress={() => void signOut()} />
        <Button
          label="Delete my account and notes"
          variant="danger"
          onPress={() =>
            confirm('Delete your account?', 'This deletes your account, your kids’ profiles, events, talks and the notes on this device. It can’t be undone.', () =>
              void act('account.delete', async (b, s) => {
                await clearNotes();
                await b.deleteMyAccount(s);
              }).then(() => signOut()),
            )
          }
        />
      </View>
    </Screen>
  );
}
