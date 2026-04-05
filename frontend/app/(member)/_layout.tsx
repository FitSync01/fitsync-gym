import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';

export default function MemberLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.border, borderTopWidth: 1, height: 60, paddingBottom: 8 }, tabBarActiveTintColor: C.primary, tabBarInactiveTintColor: C.textDis, tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 } }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="plans" options={{ title: 'Plans', tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} /> }} />
    </Tabs>
  );
}
