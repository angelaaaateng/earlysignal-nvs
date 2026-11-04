import { Stack } from 'expo-router';

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="help" />
      <Stack.Screen name="account" />
      <Stack.Screen name="add-child" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
