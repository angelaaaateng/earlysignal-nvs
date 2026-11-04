import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';
import { useFonts } from 'expo-font';
import { Stack, usePathname, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/data/AppStore';
import { initObservability } from '@/observability/init';
import { log } from '@/observability/logger';
import { registerServiceWorker } from '@/pwa/register';
import { body, C, display } from '@/ui/theme';

initObservability();
registerServiceWorker();
const BOOT_T0 = Date.now();

function RoleRoutes() {
  const { user, hydrated } = useApp();
  const pathname = usePathname();
  const booted = useRef(false);

  useEffect(() => {
    log.nav(pathname);
  }, [pathname]);

  useEffect(() => {
    if (hydrated && !booted.current) {
      booted.current = true;
      log.metric('app.ready_ms', Date.now() - BOOT_T0);
    }
  }, [hydrated]);

  // Don't render routes until saved state is read, or a signed-in user would flash the sign-in screen.
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: C.burrow }} />;

  const role = user?.role;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      {/* Each role can only reach its own routes, even by deep link. */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={role === 'student'}>
        <Stack.Screen name="student" />
      </Stack.Protected>
      <Stack.Protected guard={role === 'parent'}>
        <Stack.Screen name="parent" />
      </Stack.Protected>
      <Stack.Protected guard={role === 'admin'}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
      {/* Support screen, open to everyone: version, recent redacted logs, reset. */}
      <Stack.Screen name="diagnostics" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.burrow }} />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <RoleRoutes />
      </AppProvider>
    </SafeAreaProvider>
  );
}

/** Any render crash below the root lands here: logged, then a calm way back. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    log.error('render.crash', error);
  }, [error]);
  return (
    <View style={{ flex: 1, backgroundColor: C.burrow, padding: 24, justifyContent: 'center', gap: 16 }}>
      <Text accessibilityRole="header" style={[display(800), { fontSize: 28, color: C.cream }]}>
        Pip tripped over something
      </Text>
      <Text style={[body(400), { fontSize: 16, color: C.creamMuted }]}>
        Your data is safe. Try again, and if it keeps happening, let us know.
      </Text>
      <Pressable accessibilityRole="button" onPress={retry} style={{ backgroundColor: C.gold, borderRadius: 16, padding: 14, alignItems: 'center', minHeight: 48 }}>
        <Text style={[body(800), { fontSize: 16, color: C.ink }]}>Try again</Text>
      </Pressable>
    </View>
  );
}
