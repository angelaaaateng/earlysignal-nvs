import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import type { Role } from '@/domain/types';
import { InstallBanner } from '@/pwa/InstallBanner';
import { Icon, type IconName } from '@/ui/Icon';
import { Pip } from '@/ui/Pip';
import { Screen } from '@/ui/Screen';
import { body, C, display, eyebrow } from '@/ui/theme';

type Mode = 'pick' | 'student' | 'email' | 'code';

/**
 * Canvas 0 · Sign in (pick a role).
 * Students: family code + first name + PIN (never an email: COPPA).
 * Parents and admins: email + one-time code. Admins must be invited first.
 * With the demo backend the cards sign straight in, as on the canvas.
 */
export default function SignIn() {
  const { signIn, backend } = useApp();
  const demo = backend.kind === 'mock';
  const [mode, setMode] = useState<Mode>('pick');
  const [role, setRole] = useState<Role>('parent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const pick = (r: Role) => {
    setError('');
    setRole(r);
    if (demo) {
      setBusy(true);
      void signIn((b) => b.signInDemo!(r)).finally(() => setBusy(false));
      return;
    }
    setMode(r === 'student' ? 'student' : 'email');
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

  const studentGo = () => void go(() => signIn((b) => b.signInStudent(code, name, pin)));
  const emailGo = () =>
    void go(async () => {
      const r = await backend.requestEmailCode(email);
      if (r.ok) setMode('code');
      return r;
    });
  const codeGo = () => void go(() => signIn((b) => b.verifyEmailCode(email, otp)));

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
            {demo ? 'Demo: each card opens an example account.' : 'Under 13? A parent sets up your account first.'}
          </Text>
        </>
      )}

      {mode === 'student' && (
        <View style={{ gap: 12 }}>
          <Text style={eyebrow(C.gold)}>Student sign-in</Text>
          <Text accessibilityRole="header" style={[display(700), { fontSize: 22, color: C.cream }]}>
            Ask your parent for the family code
          </Text>
          <Field label="Family code" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="e.g. 7F3A9C2B" autoCapitalize="characters" />
          <Field label="Your first name" value={name} onChange={setName} placeholder="Maya" autoCapitalize="words" />
          <Field label="PIN" value={pin} onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))} placeholder="••••" secure />
          <Primary label={busy ? 'Opening the Burrow…' : 'Go to my Burrow'} disabled={busy || !code || !name || pin.length < 4} onPress={studentGo} />
        </View>
      )}

      {mode === 'email' && (
        <View style={{ gap: 12 }}>
          <Text style={eyebrow(C.gold)}>{role === 'admin' ? 'Partner admin' : 'Parent'} sign-in</Text>
          <Text accessibilityRole="header" style={[display(700), { fontSize: 22, color: C.cream }]}>
            We’ll email you a one-time code
          </Text>
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Text style={[body(400), { fontSize: 13, color: C.creamMuted }]}>
            {role === 'admin' ? 'Admin accounts are invite-only. Use the email your school or clinic was invited with.' : 'New here? Entering your email creates your parent account. No password to remember.'}
          </Text>
          <Primary label={busy ? 'Sending…' : 'Send code'} disabled={busy || !/^\S+@\S+\.\S+$/.test(email)} onPress={emailGo} />
        </View>
      )}

      {mode === 'code' && (
        <View style={{ gap: 12 }}>
          <Text style={eyebrow(C.gold)}>Check your email</Text>
          <Text accessibilityRole="header" style={[display(700), { fontSize: 22, color: C.cream }]}>
            Enter the code we sent to {email}
          </Text>
          <Field label="Code" value={otp} onChange={(v) => setOtp(v.replace(/\D/g, '').slice(0, 8))} placeholder="123456" keyboardType="number-pad" />
          <Primary label={busy ? 'Signing in…' : 'Sign in'} disabled={busy || otp.length < 6} onPress={codeGo} />
          <Pressable accessibilityRole="button" onPress={emailGo} disabled={busy} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={[body(700), { fontSize: 14, color: C.gold }]}>Send a new code</Text>
          </Pressable>
        </View>
      )}

      {!!error && (
        <Text accessibilityRole="alert" style={[body(700), { fontSize: 14, color: C.gold, textAlign: 'center' }]}>
          {error}
        </Text>
      )}

      {mode !== 'pick' && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMode('pick');
            setError('');
          }}
          style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
        >
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

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; secure?: boolean; keyboardType?: 'email-address' | 'number-pad'; autoCapitalize?: 'none' | 'words' | 'characters' }) {
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
        keyboardType={props.secure ? 'number-pad' : props.keyboardType}
        autoCapitalize={props.autoCapitalize ?? 'none'}
        autoCorrect={false}
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
