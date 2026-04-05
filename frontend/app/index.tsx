import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../src/utils/colors';

const roles = [
  { role: 'owner', icon: 'shield-checkmark', label: 'GYM OWNER', desc: 'Manage your gym operations' },
  { role: 'member', icon: 'fitness', label: 'MEMBER', desc: 'Track your fitness journey' },
  { role: 'staff', icon: 'people', label: 'STAFF', desc: 'Handle daily operations' },
  { role: 'super_admin', icon: 'settings', label: 'SUPER ADMIN', desc: 'Platform management' },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading || redirecting) return;
    if (user && user.role) {
      setRedirecting(true);
      if (user.must_reset_password) { router.replace('/login'); return; }
      switch (user.role) {
        case 'owner': user.gym_id ? router.replace('/(owner)') : router.replace('/onboarding'); break;
        case 'staff': router.replace('/(staff)'); break;
        case 'member': user.gym_id ? router.replace('/(member)') : router.replace('/join-gym'); break;
        case 'super_admin': router.replace('/(admin)'); break;
      }
    }
  }, [user, loading]);

  if (loading || redirecting) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.logo}>FITSYNC</Text>
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Ionicons name="barbell" size={28} color={C.primary} />
        </View>
        <Text style={styles.logo}>FITSYNC</Text>
        <Text style={styles.tagline}>GYM MANAGEMENT</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>SELECT YOUR ROLE</Text>
        <Text style={styles.subtitle}>Choose how you want to get started</Text>
        {roles.map(item => (
          <TouchableOpacity key={item.role} testID={`role-select-${item.role}-btn`} style={styles.roleCard}
            onPress={() => router.push({ pathname: '/login', params: { role: item.role } })} activeOpacity={0.7}>
            <View style={styles.roleIcon}>
              <Ionicons name={item.icon as any} size={26} color={C.primary} />
            </View>
            <View style={styles.roleText}>
              <Text style={styles.roleLabel}>{item.label}</Text>
              <Text style={styles.roleDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.textSec} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 24 },
  logoBadge: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logo: { fontSize: 34, fontWeight: '900', color: C.primary, letterSpacing: 6 },
  tagline: { fontSize: 11, color: C.textSec, letterSpacing: 6, marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: 1, marginBottom: 6 },
  subtitle: { fontSize: 13, color: C.textSec, marginBottom: 20 },
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  roleIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  roleText: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: 1 },
  roleDesc: { fontSize: 12, color: C.textSec, marginTop: 2 },
});
