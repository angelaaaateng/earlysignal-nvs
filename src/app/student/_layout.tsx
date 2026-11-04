import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="check-in" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="quests" />
      <Stack.Screen name="focus" options={{ animation: 'fade' }} />
      <Stack.Screen name="me" />
      <Stack.Screen name="preview" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
