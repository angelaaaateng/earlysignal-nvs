import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { router, Stack, usePathname, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/data/AppStore';
import { initObservability } from '@/observability/init';
import { log } from '@/observability/logger';
import { registerServiceWorker } from '@/pwa/register';
import { C, T } from '@/ui/theme';

initObservability();
registerServiceWorker();
const BOOT_T0 = Date.now();

function Routes() {
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
  // Signed in on the sign-in screen → home. Signed-in routes are guarded below, so a signed-out deep link lands on sign-in.
  useEffect(() => {
    if (hydrated && user && pathname === '/' && !/type=recovery/.test(typeof window !== 'undefined' ? window.location.hash + window.location.search : '')) router.replace('/home');
  }, [hydrated, user, pathname]);
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: C.paper } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="home" />
        <Stack.Screen name="week" />
        <Stack.Screen name="grow" />
        <Stack.Screen name="family" />
        <Stack.Screen name="log" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="kid" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="event" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="import" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="pilot" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Screen name="diagnostics" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, GeistMono_500Medium });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Routes />
      </AppProvider>
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    log.error('render.crash', error);
  }, [error]);
  return (
    <View style={{ flex: 1, backgroundColor: C.paper, padding: 24, justifyContent: 'center', gap: 16 }}>
      <Text accessibilityRole="header" style={T.title}>
        Something went sideways
      </Text>
      <Text style={T.body}>Your notes are safe on this device. Try again, and if it keeps happening, let us know.</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={{ backgroundColor: C.moss, borderRadius: 999, padding: 14, alignItems: 'center', minHeight: 48 }}>
        <Text style={[T.label, { color: C.onMoss }]}>Try again</Text>
      </Pressable>
    </View>
  );
}
