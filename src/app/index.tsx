import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { InstallBanner } from '@/pwa/InstallBanner';
import { Button, ErrorLine, TextField } from '@/ui/Kit';
import { Screen, useLayout } from '@/ui/Screen';
import { C, R, S, T } from '@/ui/theme';

type Mode = 'pick' | 'signin' | 'signup';

/** Sign in. Parents only: email + password. Kids never have an account. */
export default function SignIn() {
  const { signIn, backend } = useApp();
  const demo = backend.kind === 'mock';
  const [mode, setMode] = useState<Mode>('pick');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const go = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(true);
    setError('');
    try {
      const r = await fn();
      if (!r.ok) setError(r.message ?? 'Something went wrong.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const switchTo = (m: Mode) => {
    setMode(m);
    setError('');
  };
  const { wide } = useLayout();
  const validEmail = /^\S+@\S+\.\S+$/.test(email);
  const validPassword = password.length >= 8;

  return (
    <Screen narrow contentStyle={{ paddingTop: 72, gap: S[6] }} aside={wide ? <WhyRooted /> : undefined}>
      <InstallBanner />
      <View style={{ gap: S[2] }}>
        <Text style={[T.display, { fontSize: 44, lineHeight: 48, letterSpacing: -1.8 }]}>Rooted</Text>
        <Text style={T.body}>Small talks. Deep roots.</Text>
      </View>

      {mode === 'pick' && (
        <View style={{ backgroundColor: C.canopy, borderRadius: R.xl, padding: S[6], gap: S[4] }}>
          <Text style={[T.overline, { color: C.spark }]}>For parents of grades 6 to 12</Text>
          <Text style={[T.title, { color: C.onCanopy }]}>Know what to ask your kid, and when.</Text>
          <Text style={[T.body, { color: '#bfd9c9' }]}>Add their week on Sunday. Get a question worth asking at pickup. One tap says how it went. Your kid never uses the app.</Text>
          <View style={{ gap: S[2], marginTop: S[2] }}>
            {demo && <Button label="Try the demo" variant="spark" size="lg" onPress={() => void go(() => signIn((b) => b.signInDemo!()))} busy={busy} />}
            <Button label={demo ? 'Create my own account' : 'Create an account'} variant={demo ? 'onCanopy' : 'spark'} size="lg" onPress={() => switchTo('signup')} />
            <Button label="I already have an account" variant="onCanopy" onPress={() => switchTo('signin')} />
          </View>
        </View>
      )}

      {mode !== 'pick' && (
        <View style={{ gap: S[4] }}>
          <Text accessibilityRole="header" style={T.title}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>
          {mode === 'signup' && <TextField label="Your name" value={name} onChange={setName} placeholder="Maya" autoCapitalize="words" textContentType="name" autoFocus />}
          <TextField label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" textContentType="emailAddress" autoFocus={mode === 'signin'} />
          <TextField label="Password" value={password} onChange={setPassword} placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'} secure textContentType={mode === 'signup' ? 'newPassword' : 'password'} />
          <ErrorLine>{error}</ErrorLine>
          <Button
            label={mode === 'signup' ? 'Create account' : 'Sign in'}
            size="lg"
            busy={busy}
            disabled={!validEmail || !validPassword || (mode === 'signup' && !name.trim())}
            onPress={() => void go(() => signIn((b) => (mode === 'signup' ? b.signUp({ email, password, displayName: name }) : b.signInWithPassword(email, password))))}
          />
          <Pressable accessibilityRole="button" onPress={() => switchTo(mode === 'signup' ? 'signin' : 'signup')} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[T.label, { color: C.moss }]}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => switchTo('pick')} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[T.label, { color: C.soilMuted }]}>Back</Text>
          </Pressable>
        </View>
      )}
      {mode === 'pick' && error ? <ErrorLine>{error}</ErrorLine> : null}
      <Text style={T.caption}>Zero data from kids. All the help goes to parents. Notes you write stay on this device.</Text>
    </Screen>
  );
}

/** Desktop only: the pitch beside the sign-in card. */
function WhyRooted() {
  const rows = [
    ['Sunday', 'Add what’s on your kid’s week: a math test, a tryout, a dance.'],
    ['At pickup', 'One question about today, with a tip on how to ask it.'],
    ['After', 'One tap says how it went. Your note stays on your device.'],
  ];
  return (
    <View style={{ gap: S[4], paddingTop: 72 }}>
      <Text style={T.overline}>How it works</Text>
      {rows.map(([k, v]) => (
        <View key={k} style={{ backgroundColor: C.bubble, borderRadius: R.lg, padding: S[5], gap: 4 }}>
          <Text style={T.subhead}>{k}</Text>
          <Text style={T.bodySm}>{v}</Text>
        </View>
      ))}
      <Text style={T.caption}>“A question about today’s test is worth the effort of entering the test on Sunday.” That is the bet the pilot tests.</Text>
    </View>
  );
}
