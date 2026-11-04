import { Stack } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { body, C, display } from '@/ui/theme';

/** The partner dashboard is a web app. On a phone we say so instead of squeezing it. */
export default function AdminLayout() {
  const { signOut } = useApp();
  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: C.burrow, padding: 24, justifyContent: 'center', gap: 16 }}>
        <Text style={[display(800), { fontSize: 28, color: C.cream }]}>Open the partner dashboard on a computer</Text>
        <Text style={[body(400), { fontSize: 16, color: C.creamMuted }]}>
          The admin dashboard is a web app. Sign in at the EarlySignal website from your school or clinic computer.
        </Text>
        <Pressable accessibilityRole="button" onPress={signOut} style={{ backgroundColor: C.gold, borderRadius: 16, padding: 14, alignItems: 'center' }}>
          <Text style={[body(800), { fontSize: 16, color: C.ink }]}>Sign out</Text>
        </Pressable>
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
