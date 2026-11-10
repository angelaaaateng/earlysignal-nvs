import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { Button, ErrorLine, TextField } from '@/ui/Kit';
import { Screen } from '@/ui/Screen';
import { S, T } from '@/ui/theme';

/** Landing page of the recovery email: the link signs the parent in, this sets a new password. */
export default function ResetPassword() {
  const { backend, user } = useApp();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const save = async () => {
    setBusy(true);
    setErr('');
    const r = await backend.updatePassword(pw);
    setBusy(false);
    if (!r.ok) setErr(r.message ?? 'Couldn’t update the password.');
    else setDone(true);
  };
  return (
    <Screen narrow contentStyle={{ gap: S[5], paddingTop: 72 }}>
      <View>
        <Text style={T.overline}>Rooted</Text>
        <Text accessibilityRole="header" style={[T.title, { marginTop: S[1] }]}>
          {done ? 'Password updated' : 'Choose a new password'}
        </Text>
      </View>
      {!user && <Text style={T.body}>This link has expired or was already used. Go back and request a new one.</Text>}
      {user && !done && (
        <>
          <TextField label="New password" value={pw} onChange={setPw} secure placeholder="At least 8 characters" textContentType="newPassword" autoFocus />
          <TextField label="Again, to be sure" value={pw2} onChange={setPw2} secure placeholder="••••••••" error={pw2 && pw2 !== pw ? 'Those don’t match yet.' : undefined} />
          <ErrorLine>{err}</ErrorLine>
          <Button label="Save new password" size="lg" disabled={pw.length < 8 || pw !== pw2} busy={busy} onPress={() => void save()} />
        </>
      )}
      {done && <Button label="Go to tonight’s starter" size="lg" onPress={() => router.replace('/home')} />}
      {!user && <Button label="Back to sign in" variant="soft" onPress={() => router.replace('/')} />}
    </Screen>
  );
}
