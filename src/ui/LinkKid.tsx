import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { Button, ErrorText } from './Form';
import { body, C } from './theme';

/** Parent: type the 6-letter code from the student's Me screen. */
export function LinkKidCard({ onLinked }: { onLinked?: () => void }) {
  const { act } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const link = async () => {
    setBusy(true);
    setErr('');
    try {
      await act('parent.link.redeem', (b, s) => b.redeemLinkCode(s, clean));
      setCode('');
      onLinked?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.card}>
      <Text style={[body(800), { fontSize: 14, color: C.ink }]}>Your kid’s code</Text>
      <TextInput
        accessibilityLabel="Your kid’s code"
        value={clean}
        onChangeText={setCode}
        placeholder="ABC123"
        placeholderTextColor={C.faint}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        style={[body(800), styles.input]}
      />
      <ErrorText>{err}</ErrorText>
      <Button tone="parent" label={busy ? 'Linking…' : 'Link'} disabled={busy || clean.length !== 6} onPress={() => void link()} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.lineParent, borderRadius: 18, padding: 16, gap: 10 },
  input: { fontSize: 28, letterSpacing: 8, textAlign: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.lineParent, color: C.ink, minHeight: 56 },
});
