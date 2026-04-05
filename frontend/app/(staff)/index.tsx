import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';
import { api } from '../../src/utils/api';
import { Card, LoadingScreen, PrimaryButton, SectionHeader } from '../../src/components/ui';
import { useRouter } from 'expo-router';

export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [memberId, setMemberId] = useState('');
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const fetchToday = useCallback(async () => {
    if (!user?.gym_id) return;
    try {
      const data = await api.get(`/api/gyms/${user.gym_id}/attendance/today`);
      setTodayLogs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.gym_id]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleManualScan = async () => {
    if (!memberId.trim()) { Alert.alert('Error', 'Enter member ID'); return; }
    try {
      const res = await api.post(`/api/gyms/${user?.gym_id}/attendance/scan`, { member_id: memberId.trim(), method: 'manual' });
      setLastResult(`${res.member_name}: ${res.status}`);
      setMemberId('');
      fetchToday();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleLogout = async () => { await logout(); router.replace('/'); };

  if (loading) return <LoadingScreen />;

  const uniqueCheckins = new Set(todayLogs.filter(l => l.type === 'check_in').map(l => l.member_id)).size;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchToday(); }} tintColor={C.primary} />} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Staff Dashboard</Text>
            <Text style={styles.name}>{user?.name || 'Staff'}</Text>
          </View>
          <TouchableOpacity testID="staff-logout-btn" onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={C.textSec} />
          </TouchableOpacity>
        </View>

        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.sectionLabel}>MANUAL CHECK-IN</Text>
          <View style={styles.scanRow}>
            <TextInput testID="manual-member-id" style={styles.scanInput} placeholder="Member ID (e.g. mem_00000001)" placeholderTextColor={C.textDis}
              value={memberId} onChangeText={setMemberId} autoCapitalize="none" />
            <TouchableOpacity testID="manual-scan-btn" style={styles.scanBtn} onPress={handleManualScan}>
              <Ionicons name="finger-print" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          {lastResult && (
            <View style={styles.resultBox}>
              <Ionicons name="checkmark-circle" size={16} color={C.success} />
              <Text style={styles.resultText}>{lastResult}</Text>
            </View>
          )}
        </Card>

        <View style={styles.statsRow}>
          <Card style={{ flex: 1 }}>
            <Text style={styles.statValue}>{uniqueCheckins}</Text>
            <Text style={styles.statLabel}>Today Check-ins</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={styles.statValue}>{todayLogs.length}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </Card>
        </View>

        <SectionHeader title="Today's Activity" />
        {todayLogs.length === 0 ? (
          <Text style={styles.emptyText}>No check-ins today</Text>
        ) : todayLogs.slice(0, 20).map((log, i) => (
          <Card key={log.log_id || i}>
            <View style={styles.logRow}>
              <View style={[styles.logIcon, { backgroundColor: log.type === 'check_in' ? C.success + '20' : C.error + '20' }]}>
                <Ionicons name={log.type === 'check_in' ? 'enter' : 'exit'} size={14} color={log.type === 'check_in' ? C.success : C.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.logName}>{log.member_name}</Text>
                <Text style={styles.logMeta}>{log.method} • {log.member_id}</Text>
              </View>
              <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
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
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textSec, letterSpacing: 1, marginBottom: 10 },
  scanRow: { flexDirection: 'row', gap: 8 },
  scanInput: { flex: 1, backgroundColor: C.elevated, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: C.text, borderWidth: 1, borderColor: C.border },
  scanBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  resultBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.success + '15', borderRadius: 8, padding: 10, marginTop: 10 },
  resultText: { color: C.success, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '900', color: C.text },
  statLabel: { fontSize: 11, color: C.textSec, marginTop: 2 },
  emptyText: { color: C.textDis, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  logName: { fontSize: 13, fontWeight: '600', color: C.text },
  logMeta: { fontSize: 10, color: C.textDis },
  logTime: { fontSize: 11, color: C.textSec },
});
