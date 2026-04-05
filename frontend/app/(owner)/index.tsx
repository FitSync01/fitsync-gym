import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';
import { api } from '../../src/utils/api';
import { KPICard, SectionHeader, Card, LoadingScreen } from '../../src/components/ui';
import { useRouter } from 'expo-router';

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [kpis, setKpis] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [gym, setGym] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.gym_id) return;
    try {
      const [k, g, l] = await Promise.all([
        api.get(`/api/gyms/${user.gym_id}/analytics/kpis`),
        api.get(`/api/gyms/${user.gym_id}`),
        api.get(`/api/gyms/${user.gym_id}/attendance/logs?limit=10`),
      ]);
      setKpis(k); setGym(g); setLogs(l);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.gym_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => { await logout(); router.replace('/'); };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.primary} />} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name || 'Owner'}</Text>
          </View>
          <TouchableOpacity testID="owner-logout-btn" onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={C.textSec} />
          </TouchableOpacity>
        </View>
        {gym && (
          <Card style={{ marginBottom: 4 }}>
            <View style={styles.gymRow}>
              <View>
                <Text style={styles.gymName}>{gym.name}</Text>
                <Text style={styles.gymCode}>Join Code: <Text style={{ color: C.primary, fontWeight: '800' }}>{gym.code}</Text></Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: C.success }]} />
            </View>
          </Card>
        )}
        <SectionHeader title="Overview" />
        {kpis && (
          <>
            <View style={styles.kpiRow}>
              <KPICard testID="kpi-total" icon="people" label="Total" value={kpis.total_members} />
              <KPICard testID="kpi-active" icon="checkmark-circle" label="Active" value={kpis.active_members} color={C.success} />
              <KPICard testID="kpi-expired" icon="close-circle" label="Expired" value={kpis.expired_members} color={C.error} />
            </View>
            <View style={[styles.kpiRow, { marginTop: 8 }]}>
              <KPICard testID="kpi-revenue" icon="cash" label="Revenue" value={`$${kpis.monthly_revenue}`} color={C.success} />
              <KPICard testID="kpi-live" icon="pulse" label="Live Now" value={kpis.live_crowd} color={C.secondary} />
              <KPICard testID="kpi-expiring" icon="warning" label="Expiring" value={kpis.expiring_soon} color={C.warning} />
            </View>
            {kpis.pending_cash_requests > 0 && (
              <TouchableOpacity testID="pending-cash-alert" style={styles.alertCard} onPress={() => router.push('/(owner)/payments')}>
                <Ionicons name="alert-circle" size={20} color={C.warning} />
                <Text style={styles.alertText}>{kpis.pending_cash_requests} pending cash payment(s)</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textSec} />
              </TouchableOpacity>
            )}
          </>
        )}
        <SectionHeader title="Recent Activity" />
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No recent activity</Text>
        ) : logs.slice(0, 8).map((log: any, i: number) => (
          <Card key={log.log_id || i}>
            <View style={styles.logRow}>
              <View style={[styles.logIcon, { backgroundColor: log.type === 'check_in' ? C.success + '20' : C.error + '20' }]}>
                <Ionicons name={log.type === 'check_in' ? 'enter' : 'exit'} size={16} color={log.type === 'check_in' ? C.success : C.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.logName}>{log.member_name}</Text>
                <Text style={styles.logTime}>{log.type === 'check_in' ? 'Checked in' : 'Checked out'} via {log.method}</Text>
              </View>
              <Text style={styles.logTimestamp}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
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
  greeting: { fontSize: 13, color: C.textSec },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  logoutBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  gymRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gymName: { fontSize: 16, fontWeight: '700', color: C.text },
  gymCode: { fontSize: 12, color: C.textSec, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.warning + '15', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: C.warning + '30', gap: 8 },
  alertText: { flex: 1, color: C.warning, fontSize: 13, fontWeight: '600' },
  emptyText: { color: C.textDis, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logName: { fontSize: 14, fontWeight: '600', color: C.text },
  logTime: { fontSize: 11, color: C.textSec },
  logTimestamp: { fontSize: 11, color: C.textDis },
});
