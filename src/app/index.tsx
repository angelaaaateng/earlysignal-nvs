import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import type { Role } from '@/domain/types';
import { InstallBanner } from '@/pwa/InstallBanner';
import { Button, Check, ErrorText, Field } from '@/ui/Form';
import { Icon, type IconName } from '@/ui/Icon';
import { Pip } from '@/ui/Pip';
import { Screen } from '@/ui/Screen';
import { body, C, display, eyebrow } from '@/ui/theme';

type Mode = 'pick' | 'student-new' | 'student-in' | 'parent-in' | 'parent-new';

/**
 * Sign in. Students (13+) make their own account: username + password, no
 * email. Parents are optional: email + password, then a code from their kid.
 * With the demo backend the cards open example accounts.
 */
export default function SignIn() {
  const { signIn, backend } = useApp();
  const demo = backend.kind === 'mock';
  const [mode, setMode] = useState<Mode>('pick');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [is13, setIs13] = useState(false);

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
  const demoCard = (r: Role) => void go(() => signIn((b) => b.signInDemo!(r)));
  const switchTo = (m: Mode) => {
    setMode(m);
    setError('');
  };

  const validEmail = /^\S+@\S+\.\S+$/.test(email);
  const validUser = /^[a-z0-9_]{3,20}$/.test(username.trim().toLowerCase());
  const validPassword = password.length >= 8;
  const gradeNum = grade ? Number(grade) : undefined;

  return (
    <Screen bg={C.burrow} contentStyle={{ paddingTop: 48, paddingHorizontal: 24, gap: 18 }}>
      <InstallBanner />
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Pip size={mode === 'pick' ? 140 : 84} variant="peek" label="Pip the fox peeking out of a burrow" />
        <Text accessibilityRole="header" style={[display(800), { fontSize: 38, color: C.cream, letterSpacing: -0.4 }]}>
          EarlySignal<Text style={{ color: C.gold }}>.</Text>
        </Text>
        {mode === 'pick' && (
          <Text style={[body(400), { fontSize: 16, color: C.creamMuted, maxWidth: 300, textAlign: 'center' }]}>
            Small study quests, a 10-second daily check-in, and a fox who’s on your side.
          </Text>
        )}
      </View>

      <View style={{ flexGrow: 1 }} />

      {mode === 'pick' && (
        <View style={{ gap: 12 }}>
          {demo ? (
            <>
              <Text accessibilityRole="header" style={[display(700), { fontSize: 20, color: C.cream }]}>
                Who’s signing in?
              </Text>
              <RoleCard onPress={() => demoCard('student')} title="I’m a student" sub="Open Maya’s Burrow" icon="student" variant="gold" disabled={busy} />
              <RoleCard onPress={() => demoCard('parent')} title="I’m a parent" sub="Maya’s weekly summary" icon="family" variant="paper" disabled={busy} />
              <Pressable accessibilityRole="button" onPress={() => switchTo('student-new')} style={styles.textBtn}>
                <Text style={[body(700), { fontSize: 14, color: C.gold }]}>Try a brand-new student account</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => demoCard('admin')} style={styles.textBtn}>
                <Text style={[body(400), { fontSize: 13, color: C.creamMuted }]}>School or clinic admin (demo)</Text>
              </Pressable>
              <Text style={[body(400), { fontSize: 13, color: C.creamMuted, textAlign: 'center' }]}>Demo: example data, stays on this device.</Text>
            </>
          ) : (
            <>
              <Button label="Get started" tone="gold" onPress={() => switchTo('student-new')} />
              <Button label="I already have an account" tone="gold" variant="secondary" onPress={() => switchTo('student-in')} />
              <Pressable accessibilityRole="button" onPress={() => switchTo('parent-in')} style={styles.textBtn}>
                <Text style={[body(700), { fontSize: 14, color: C.creamMuted }]}>
                  I’m a parent <Text style={{ color: C.gold }}>→</Text>
                </Text>
              </Pressable>
              <Text style={[body(400), { fontSize: 13, color: C.creamMuted, textAlign: 'center' }]}>For students 13 and up. No email needed.</Text>
            </>
          )}
        </View>
      )}

      {mode === 'student-new' && (
        <View style={{ gap: 12 }}>
          <Text style={eyebrow(C.gold)}>New account</Text>
          <Text accessibilityRole="header" style={[display(700), { fontSize: 24, color: C.cream }]}>
            Pick a username
          </Text>
          <Field label="Username" value={username} onChange={(v) => setUsername(v.replace(/\s/g, ''))} placeholder="e.g. fox_maya" autoCapitalize="none" textContentType="username" hint="3–20 letters, numbers or underscores. This is how you sign in." autoFocus />
          <Field label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" secure textContentType="newPassword" />
          <Field label="What should Pip call you?" value={name} onChange={setName} placeholder="Maya" autoCapitalize="words" textContentType="name" />
          <Field label="Grade (optional)" value={grade} onChange={(v) => setGrade(v.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="7" keyboardType="number-pad" />
          <Check checked={is13} onToggle={() => setIs13(!is13)} label="I’m 13 or older" dark />
          <Button
            label={busy ? 'Making your Burrow…' : 'Create my account'}
            tone="gold"
            disabled={busy || !validUser || !validPassword || !name.trim() || !is13 || (gradeNum !== undefined && (gradeNum < 1 || gradeNum > 12))}
            onPress={() => void go(() => signIn((b) => b.signUpStudent({ username, password, displayName: name, grade: gradeNum, ageAttested: is13 })))}
          />
          <Pressable accessibilityRole="button" onPress={() => switchTo('student-in')} style={styles.textBtn} disabled={busy}>
            <Text style={[body(700), { fontSize: 14, color: C.gold }]}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      )}

      {mode === 'student-in' && (
        <View style={{ gap: 12 }}>
          <Text style={eyebrow(C.gold)}>Welcome back</Text>
          <Text accessibilityRole="header" style={[display(700), { fontSize: 24, color: C.cream }]}>
            Sign in
          </Text>
          <Field label="Username" value={username} onChange={(v) => setUsername(v.replace(/\s/g, ''))} placeholder="fox_maya" autoCapitalize="none" textContentType="username" autoFocus />
          <Field label="Password" value={password} onChange={setPassword} placeholder="••••••••" secure />
          <Button label={busy ? 'Signing in…' : 'Sign in'} tone="gold" disabled={busy || !username.trim() || !password} onPress={() => void go(() => signIn((b) => b.signInStudent(username, password)))} />
          <Text style={[body(400), { fontSize: 13, color: C.creamMuted, textAlign: 'center' }]}>Forgot your password? A linked parent can reset it from their Account tab.</Text>
          <Pressable accessibilityRole="button" onPress={() => switchTo('student-new')} style={styles.textBtn} disabled={busy}>
            <Text style={[body(700), { fontSize: 14, color: C.gold }]}>New here? Create an account</Text>
          </Pressable>
        </View>
      )}

      {(mode === 'parent-in' || mode === 'parent-new') && (
        <View style={{ gap: 12 }}>
          <Text style={eyebrow(C.gold)}>Parent</Text>
          <Text accessibilityRole="header" style={[display(700), { fontSize: 24, color: C.cream }]}>
            {mode === 'parent-new' ? 'Create your account' : 'Sign in'}
          </Text>
          {mode === 'parent-new' && <Field label="Your name" value={name} onChange={setName} placeholder="Ana Santos" autoCapitalize="words" textContentType="name" />}
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" textContentType="emailAddress" autoFocus />
          <Field label="Password" value={password} onChange={setPassword} placeholder={mode === 'parent-new' ? 'At least 8 characters' : '••••••••'} secure textContentType={mode === 'parent-new' ? 'newPassword' : 'password'} />
          <Button
            label={busy ? (mode === 'parent-new' ? 'Creating…' : 'Signing in…') : mode === 'parent-new' ? 'Create account' : 'Sign in'}
            tone="gold"
            disabled={busy || !validEmail || !validPassword || (mode === 'parent-new' && !name.trim())}
            onPress={() => void go(() => signIn((b) => (mode === 'parent-new' ? b.signUp({ email, password, displayName: name }) : b.signInWithPassword(email, password))))}
          />
          {mode === 'parent-new' && <Text style={[body(400), { fontSize: 13, color: C.creamMuted, textAlign: 'center' }]}>Next, you’ll type the 6-letter code your kid shows you. You only ever see what they choose to share.</Text>}
          <Pressable accessibilityRole="button" onPress={() => switchTo(mode === 'parent-new' ? 'parent-in' : 'parent-new')} disabled={busy} style={styles.textBtn}>
            <Text style={[body(700), { fontSize: 14, color: C.gold }]}>{mode === 'parent-new' ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
          </Pressable>
        </View>
      )}

      <ErrorText dark>{error}</ErrorText>

      {mode !== 'pick' && (
        <Pressable accessibilityRole="button" onPress={() => switchTo('pick')} style={styles.textBtn}>
          <Text style={[body(700), { fontSize: 14, color: C.creamMuted }]}>← Back</Text>
        </Pressable>
      )}
    </Screen>
  );
}

function RoleCard({ title, sub, icon, variant, onPress, disabled }: { title: string; sub: string; icon: IconName; variant: 'gold' | 'paper'; onPress: () => void; disabled?: boolean }) {
  const v = {
    gold: { bg: C.gold, fg: C.ink, sub: C.ink, chip: C.ink, chipIcon: C.gold, chev: C.ink },
    paper: { bg: C.card, fg: C.ink, sub: C.muted, chip: C.greenSoft, chipIcon: C.greenParent, chev: C.muted },
  }[variant];
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.card, { backgroundColor: v.bg }, disabled && { opacity: 0.6 }]}>
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

const styles = StyleSheet.create({
  card: { borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 },
  chip: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  textBtn: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
});
