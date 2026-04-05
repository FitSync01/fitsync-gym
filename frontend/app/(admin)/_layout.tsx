import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.border, borderTopWidth: 1, height: 60, paddingBottom: 8 }, tabBarActiveTintColor: C.primary, tabBarInactiveTintColor: C.textDis, tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 } }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="globe" size={size} color={color} /> }} />
    </Tabs>
  );
}
