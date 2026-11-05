import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import type { Role } from '@/domain/types';
import { InstallBanner } from '@/pwa/InstallBanner';
import { Icon, type IconName } from '@/ui/Icon';
import { Pip } from '@/ui/Pip';
import { Screen } from '@/ui/Screen';
import { body, C, display, eyebrow } from '@/ui/theme';

type Mode = 'pick' | 'student' | 'signin' | 'signup';

/**
 * Canvas 0 · Sign in (pick a role).
 * Parents and admins: email + password, created here. Nothing is emailed.
 * Students: signed in by their parent's tap (never an email or password: COPPA).
 * With the demo backend the cards sign straight in, as on the canvas.
 */
export default function SignIn() {
  const { signIn, backend } = useApp();
  const demo = backend.kind === 'mock';
  const [mode, setMode] = useState<Mode>('pick');
  const [role, setRole] = useState<Role>('parent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const pick = (r: Role) => {
    setError('');
    setRole(r);
    if (demo) {
      setBusy(true);
      void signIn((b) => b.signInDemo!(r)).finally(() => setBusy(false));
      return;
    }
    setMode(r === 'student' ? 'student' : 'signin');
  };

  const go = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(true);
    setError('');
    try {
      const r = await fn();
      if (!r.ok) setError(r.message ?? 'Something went wrong.');
      return r.ok;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const validEmail = /^\S+@\S+\.\S+$/.test(email);
  const validPassword = password.length >= 8;
  const signInGo = () => void go(() => signIn((b) => b.signInWithPassword(email, password)));
  const signUpGo = () => void go(() => signIn((b) => b.signUp({ email, password, displayName: name })));
  const switchTo = (m: Mode) => {
    setMode(m);
    setError('');
  };

  return (
    <Screen bg={C.burrow} contentStyle={{ paddingTop: 56, paddingHorizontal: 24, gap: 20 }}>
      <InstallBanner />
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Pip size={mode === 'pick' ? 150 : 96} variant="peek" label="Pip the fox peeking out of a burrow" />
        <Text accessibilityRole="header" style={[display(800), { fontSize: 40, color: C.cream, letterSpacing: -0.4 }]}>
          EarlySignal<Text style={{ color: C.gold }}>.</Text>
        </Text>
        {mode === 'pick' && (
          <Text style={[body(400), { fontSize: 16, color: C.creamMuted, maxWidth: 290, textAlign: 'center' }]}>
            Better study habits for kids. Calm, early signals for families.
          </Text>
        )}
      </View>

      <View style={{ flexGrow: 1 }} />

      {mode === 'pick' && (
        <>
          <Text accessibilityRole="header" style={[display(700), { fontSize: 20, color: C.cream }]}>
            Who’s signing in?
          </Text>
          <View style={{ gap: 12 }}>
            <RoleCard onPress={() => pick('student')} title="I’m a student" sub="Go to your Burrow" icon="student" variant="gold" disabled={busy} />
            <RoleCard onPress={() => pick('parent')} title="I’m a parent" sub="Your weekly summary" icon="family" variant="paper" disabled={busy} />
            <RoleCard onPress={() => pick('admin')} title="School or clinic admin" sub="Partner dashboard" icon="monitor" variant="outline" disabled={busy} />
          </View>
          <Text style={[body(400), { fontSize: 13, color: C.creamMuted, textAlign: 'center' }]}>
            {demo ? 'Demo: each card opens an example account.' : 'Students are signed in by a parent. No password to remember.'}
          </Text>
        </>
      )}

      {mode === 'student' && (
        <View style={{ gap: 12 }}>
          <Text style={eyebrow(C.gold)}>Student sign-in</Text>
          <Text accessibilityRole="header" style={[display(700), { fontSize: 22, color: C.cream }]}>
            Your parent opens your Burrow
          </Text>
          <Text style={[body(400), { fontSize: 15, color: C.creamMuted }]}>
            Nothing to type. Ask your parent to sign in, go to <Text style={body(800)}>Account</Text>, and tap <Text style={body(800)}>Open Burrow</Text> next to your name. Your Burrow opens right here.
          </Text>
        </View>
      )}

      {(mode === 'signin' || mode === 'signup') && (
        <View style={{ gap: 12 }}>
          <Text style={eyebrow(C.gold)}>{role === 'admin' ? 'Partner admin' : 'Parent'}</Text>
          <Text accessibilityRole="header" style={[display(700), { fontSize: 22, color: C.cream }]}>
            {mode === 'signup' ? 'Create your account' : 'Sign in'}
          </Text>
          {mode === 'signup' && <Field label="Your name" value={name} onChange={setName} placeholder="Ana Santos" autoCapitalize="words" />}
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Password" value={password} onChange={setPassword} placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'} secure />
          {mode === 'signup' && role === 'admin' && (
            <Text style={[body(400), { fontSize: 13, color: C.creamMuted }]}>Admin accounts are invite-only. Use the email your school or clinic was invited with.</Text>
          )}
          <Primary
            label={busy ? (mode === 'signup' ? 'Creating…' : 'Signing in…') : mode === 'signup' ? 'Create account' : 'Sign in'}
            disabled={busy || !validEmail || !validPassword || (mode === 'signup' && !name.trim())}
            onPress={mode === 'signup' ? signUpGo : signInGo}
          />
          <Pressable accessibilityRole="button" onPress={() => switchTo(mode === 'signup' ? 'signin' : 'signup')} disabled={busy} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[body(700), { fontSize: 14, color: C.gold }]}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
          </Pressable>
        </View>
      )}

      {!!error && (
        <Text accessibilityRole="alert" style={[body(700), { fontSize: 14, color: C.gold, textAlign: 'center' }]}>
          {error}
        </Text>
      )}

      {mode !== 'pick' && (
        <Pressable accessibilityRole="button" onPress={() => switchTo('pick')} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={[body(700), { fontSize: 14, color: C.creamMuted }]}>← Back</Text>
        </Pressable>
      )}
    </Screen>
  );
}

function RoleCard({ title, sub, icon, variant, onPress, disabled }: { title: string; sub: string; icon: IconName; variant: 'gold' | 'paper' | 'outline'; onPress: () => void; disabled?: boolean }) {
  const v = {
    gold: { bg: C.gold, fg: C.ink, sub: C.ink, chip: C.ink, chipIcon: C.gold, chev: C.ink },
    paper: { bg: C.card, fg: C.ink, sub: C.muted, chip: C.greenSoft, chipIcon: C.greenParent, chev: C.muted },
    outline: { bg: 'transparent', fg: C.cream, sub: C.creamMuted, chip: C.burrowEdge, chipIcon: C.cream, chev: C.creamMuted },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.card, { backgroundColor: v.bg }, variant === 'outline' && { borderWidth: 1.5, borderColor: C.burrowLine, paddingVertical: 14 }, disabled && { opacity: 0.6 }]}
    >
      <View style={[styles.chip, { backgroundColor: v.chip }]}>
        <Icon name={icon} size={22} color={v.chipIcon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[body(800), { fontSize: 17, color: v.fg }]}>{title}</Text>
        <Text style={[body(variant === 'gold' ? 600 : 400), { fontSize: 13, color: v.sub }]}>{sub}</Text>
      </View>
      <Icon name="chevronRight" size={20} color={v.chev} strokeWidth={2.5} />
    </Pressable>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; secure?: boolean; keyboardType?: 'email-address'; autoCapitalize?: 'none' | 'words' }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[body(800), { fontSize: 14, color: C.cream }]}>{props.label}</Text>
      <TextInput
        accessibilityLabel={props.label}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={C.faint}
        secureTextEntry={props.secure}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize ?? 'none'}
        autoCorrect={false}
        textContentType={props.secure ? 'password' : props.keyboardType ? 'emailAddress' : 'name'}
        style={[body(400), styles.input]}
      />
    </View>
  );
}

function Primary({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[styles.primary, disabled && { opacity: 0.5 }]}>
      <Text style={[body(800), { fontSize: 16, color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 },
  chip: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  input: { fontSize: 16, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1.5, borderColor: C.burrowLine, backgroundColor: C.burrowDeep, color: C.cream, minHeight: 48 },
  primary: { backgroundColor: C.gold, borderRadius: 18, padding: 16, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
});
