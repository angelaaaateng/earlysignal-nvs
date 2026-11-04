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
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/data/AppStore';
import { C } from '@/ui/theme';

function RoleRoutes() {
  const { user } = useApp();
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
