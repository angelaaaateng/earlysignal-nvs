import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { familiesOfParent } from '@/domain/access';
import { ConsentRequiredError, createStudentAccount, recordParentalConsent, requiresParentalConsent } from '@/domain/coppa';
import { toDateKey } from '@/domain/dates';
import type { Db, ParentalConsent } from '@/domain/types';
import { useParent } from '@/ui/parent';
import { BackButton, goBack, Screen } from '@/ui/Screen';
import { body, C, display, eyebrow } from '@/ui/theme';

const METHODS: { id: ParentalConsent['method']; name: string; sub: string }[] = [
  { id: 'card_check', name: 'Card check', sub: 'A small charge, refunded right away' },
  { id: 'signed_form', name: 'Signed form', sub: 'Sign and upload a consent form' },
  { id: 'video_call', name: 'Video call', sub: 'A 2-minute call with our team' },
];

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * COPPA flow (not on the canvas; built in the canvas style).
 * Step 1: child details. Step 2, only if under 13: notice + verifiable consent.
 * The account is created only after consent is recorded.
 */
export default function AddChild() {
  const { me } = useParent();
  const { act, db, now } = useApp();
  const [step, setStep] = useState<'details' | 'consent' | 'done'>('details');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [birth, setBirth] = useState('');
  const [method, setMethod] = useState<ParentalConsent['method']>('card_check');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  const family = familiesOfParent(db, me.id)[0];
  const today = toDateKey(now);
  const validBirth = VALID_DATE.test(birth) && birth < today;
  const canContinue = first.trim() && last.trim() && validBirth;

  const create = (consentId?: string) => (d: Db, t: Date) =>
    createStudentAccount(d, me.id, { familyId: family.id, firstName: first, lastName: last, birthDate: birth, consentId }, t).db;

  const onContinue = () => {
    setError('');
    if (requiresParentalConsent(birth, today)) return setStep('consent');
    try {
      act('student.account.create', create());
      setStep('done');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onConsent = () => {
    setError('');
    try {
      act('student.account.create_with_consent', (d, t) => {
        const r = recordParentalConsent(d, me.id, { familyId: family.id, childFirstName: first, childBirthDate: birth, method, agreedToNotice: agreed }, t);
        return create(r.consent.id)(r.db, t);
      });
      setStep('done');
    } catch (e) {
      setError(e instanceof ConsentRequiredError ? e.message : (e as Error).message);
    }
  };

  return (
    <Screen bg={C.paperParent} contentStyle={{ paddingTop: 24, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton label="Back" onPress={() => (step === 'consent' ? setStep('details') : goBack('/parent/account'))} />
        <Text style={eyebrow(C.greenParent)}>{step === 'consent' ? 'Step 2 of 2 · Consent' : 'Set up a child’s account'}</Text>
      </View>

      {step === 'details' && (
        <>
          <Text accessibilityRole="header" style={[display(800), { fontSize: 26, color: C.ink }]}>About your child</Text>
          <Field label="First name" value={first} onChange={setFirst} />
          <Field label="Last name" value={last} onChange={setLast} />
          <Field label="Birth date" value={birth} onChange={setBirth} placeholder="YYYY-MM-DD" hint={birth && !validBirth ? 'Use the format YYYY-MM-DD.' : 'Used only to check whether we need your consent.'} />
          <View style={{ flexGrow: 1 }} />
          <Primary label="Continue" disabled={!canContinue} onPress={onContinue} />
        </>
      )}

      {step === 'consent' && (
        <>
          <Text accessibilityRole="header" style={[display(800), { fontSize: 26, color: C.ink }]}>
            {first.trim()} is under 13. We need your consent first.
          </Text>
          <View style={styles.card}>
            <Text style={eyebrow(C.greenParent, 12)}>What we collect</Text>
            <Text style={[body(400), styles.p]}>A 1–5 “how heavy is today” score, homework quests and their steps, acorns and streaks.</Text>
            <Text style={eyebrow(C.greenParent, 12)}>What stays private</Text>
            <Text style={[body(400), styles.p]}>Notes {first.trim()} writes to Pip are never shared with you, the school or anyone else. We never collect location or contacts.</Text>
            <Text style={eyebrow(C.greenParent, 12)}>Your rights</Text>
            <Text style={[body(400), styles.p]}>Review or delete {first.trim()}’s data, or withdraw consent, at any time from Account.</Text>
          </View>

          <Text style={[body(800), { fontSize: 14, color: C.ink }]}>Verify you’re the parent</Text>
          <View accessibilityRole="radiogroup" aria-label="Verification method" style={{ gap: 8 }}>
            {METHODS.map((m) => {
              const on = m.id === method;
              return (
                <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} onPress={() => setMethod(m.id)} style={[styles.opt, { borderColor: on ? C.greenParent : C.lineParent }]}>
                  <View style={[styles.radio, { borderColor: on ? C.greenParent : C.lineParent }]}>
                    <View style={[styles.dot, { backgroundColor: on ? C.greenParent : 'transparent' }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[body(800), { fontSize: 15, color: C.ink }]}>{m.name}</Text>
                    <Text style={[body(400), { fontSize: 13, color: C.muted }]}>{m.sub}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} aria-checked={agreed} onPress={() => setAgreed((a) => !a)} style={styles.agree}>
            <View style={[styles.box, agreed ? { backgroundColor: C.greenParent, borderColor: C.greenParent } : null]}>
              {agreed && <Text style={[body(800), { color: C.white, fontSize: 14 }]}>✓</Text>}
            </View>
            <Text style={[body(600), { fontSize: 14, color: C.ink, flex: 1 }]}>
              I’m {first.trim()}’s parent or legal guardian, and I agree to this notice.
            </Text>
          </Pressable>
          <Text style={[body(400), { fontSize: 12, color: C.muted }]}>Mock build: verification is simulated. No charge is made.</Text>
          <Primary label="Give consent and create account" disabled={!agreed} onPress={onConsent} />
        </>
      )}

      {step === 'done' && (
        <>
          <Text accessibilityRole="header" style={[display(800), { fontSize: 26, color: C.ink }]}>{first.trim()}’s Burrow is ready</Text>
          <Text style={[body(400), { fontSize: 15, color: C.muted }]}>
            {first.trim()} chooses what you can see on the Me tab. You’ll get a summary every Friday.
          </Text>
          <View style={{ flexGrow: 1 }} />
          <Primary label="Back to Account" onPress={() => router.replace('/parent/account')} />
        </>
      )}

      {!!error && (
        <Text accessibilityRole="alert" style={[body(700), { fontSize: 14, color: C.rustDeep }]}>{error}</Text>
      )}
    </Screen>
  );
}

function Field({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[body(800), { fontSize: 14, color: C.ink }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        autoCapitalize={label.includes('name') ? 'words' : 'none'}
        style={[body(400), styles.input]}
      />
      {hint && <Text style={[body(400), { fontSize: 12, color: C.muted }]}>{hint}</Text>}
    </View>
  );
}

function Primary({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[styles.primary, disabled && { opacity: 0.5 }]}>
      <Text style={[body(800), { fontSize: 15, color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 15, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1.5, borderColor: C.lineParent, backgroundColor: C.white, color: C.ink, minHeight: 48 },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.lineParent, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 6 },
  p: { fontSize: 14, lineHeight: 20, color: C.ink, marginBottom: 4 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderWidth: 2, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, minHeight: 56 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  agree: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: C.greenParent, borderRadius: 16, padding: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
});
