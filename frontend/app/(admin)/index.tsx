import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';
import { api } from '../../src/utils/api';
import { KPICard, Card, SectionHeader, LoadingScreen } from '../../src/components/ui';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [s, g] = await Promise.all([api.get('/api/admin/stats'), api.get('/api/admin/gyms')]);
      setStats(s); setGyms(g);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleGym = async (gymId: string) => {
    try {
      const res = await api.put(`/api/admin/gyms/${gymId}/toggle`);
      Alert.alert('Done', `Gym ${res.active ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleLogout = async () => { await logout(); router.replace('/'); };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.primary} />} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Super Admin</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <TouchableOpacity testID="admin-logout-btn" onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={C.textSec} />
          </TouchableOpacity>
        </View>
        {stats && (
          <>
            <View style={styles.kpiRow}>
              <KPICard testID="admin-gyms" icon="business" label="Total Gyms" value={stats.total_gyms} />
              <KPICard testID="admin-active" icon="checkmark-circle" label="Active" value={stats.active_gyms} color={C.success} />
            </View>
            <View style={[styles.kpiRow, { marginTop: 8 }]}>
              <KPICard testID="admin-members" icon="people" label="Members" value={stats.total_members} color={C.secondary} />
              <KPICard testID="admin-revenue" icon="cash" label="Revenue" value={`$${stats.total_revenue}`} color={C.success} />
            </View>
          </>
        )}
        <SectionHeader title="All Gyms" />
        {gyms.map(g => (
          <Card key={g.gym_id}>
            <View style={styles.gymRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.gymName}>{g.name}</Text>
                <Text style={styles.gymMeta}>{g.member_count} members • {g.active_members} active</Text>
                <Text style={styles.gymCode}>Code: {g.code}</Text>
              </View>
              <TouchableOpacity testID={`toggle-gym-${g.gym_id}`} style={[styles.toggleBtn, { backgroundColor: g.active ? C.success + '20' : C.error + '20' }]} onPress={() => toggleGym(g.gym_id)}>
                <View style={[styles.toggleDot, { backgroundColor: g.active ? C.success : C.error }]} />
                <Text style={[styles.toggleText, { color: g.active ? C.success : C.error }]}>{g.active ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 12, color: C.textSec, textTransform: 'uppercase', letterSpacing: 1 },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  logoutBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  kpiRow: { flexDirection: 'row', gap: 8 },
  gymRow: { flexDirection: 'row', alignItems: 'center' },
  gymName: { fontSize: 15, fontWeight: '700', color: C.text },
  gymMeta: { fontSize: 12, color: C.textSec, marginTop: 2 },
  gymCode: { fontSize: 11, color: C.textDis, marginTop: 2 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleText: { fontSize: 12, fontWeight: '700' },
});
