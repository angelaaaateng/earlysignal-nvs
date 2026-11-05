import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { body, C, display } from './theme';

/** Centred spinner while a projection loads. */
export function Loading({ dark }: { dark?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }} accessibilityLabel="Loading">
      <ActivityIndicator color={dark ? C.gold : C.fox} />
    </View>
  );
}

/** A calm error with a retry, matching the crash screen's tone. */
export function LoadError({ error, retry, dark }: { error: Error; retry: () => void; dark?: boolean }) {
  const fg = dark ? C.cream : C.ink;
  const sub = dark ? C.creamMuted : C.muted;
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 12, padding: 8 }} accessibilityRole="alert">
      <Text style={[display(700), { fontSize: 22, color: fg }]}>Pip couldn’t load that</Text>
      <Text style={[body(400), { fontSize: 15, color: sub }]}>{error.message}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={{ alignSelf: 'flex-start', backgroundColor: C.gold, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, minHeight: 44 }}>
        <Text style={[body(800), { fontSize: 15, color: C.ink }]}>Try again</Text>
      </Pressable>
    </View>
  );
}
