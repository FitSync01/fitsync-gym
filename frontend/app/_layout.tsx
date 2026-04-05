import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="join-gym" />
        <Stack.Screen name="(owner)" />
        <Stack.Screen name="(staff)" />
        <Stack.Screen name="(member)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </AuthProvider>
  );
}
