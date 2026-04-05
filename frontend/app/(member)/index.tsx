import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';
import { api } from '../../src/utils/api';
import { Card, StatusBadge, LoadingScreen, SectionHeader } from '../../src/components/ui';
import { useRouter } from 'expo-router';

export default function MemberDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [gym, setGym] = useState<any>(null);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [m, g, n] = await Promise.all([
        api.get('/api/member/me'),
        api.get('/api/member/gym'),
        api.get('/api/notifications?limit=5'),
      ]);
      setMember(m); setGym(g); setNotifs(n);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => { await logout(); router.replace('/'); };

  if (loading) return <LoadingScreen />;

  const daysLeft = member?.membership_end_date ? Math.max(0, Math.ceil((new Date(member.membership_end_date).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.primary} />} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <TouchableOpacity testID="member-logout-btn" onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={C.textSec} />
          </TouchableOpacity>
        </View>
        {gym && <Text style={styles.gymName}>{gym.name}</Text>}

        <Card style={{ marginTop: 12 }}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>MEMBERSHIP</Text>
            {member && <StatusBadge status={member.membership_status} />}
          </View>
          {member?.plan_name ? (
            <>
              <Text style={styles.planName}>{member.plan_name}</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (daysLeft / 30) * 100)}%` }]} />
                </View>
                <Text style={styles.daysText}>{daysLeft} days left</Text>
              </View>
            </>
          ) : (
            <TouchableOpacity testID="member-get-plan" onPress={() => router.push('/(member)/plans')} style={styles.noPlanBtn}>
              <Ionicons name="add-circle" size={20} color={C.primary} />
              <Text style={styles.noPlanText}>Get a membership plan</Text>
            </TouchableOpacity>
          )}
        </Card>

        <Card style={{ marginTop: 10 }}>
          <View style={styles.checkinRow}>
            <Ionicons name={member?.checked_in ? 'radio-button-on' : 'radio-button-off'} size={24} color={member?.checked_in ? C.success : C.textDis} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.checkinLabel}>{member?.checked_in ? 'CHECKED IN' : 'NOT IN GYM'}</Text>
              <Text style={styles.checkinSub}>Member ID: {member?.member_id}</Text>
            </View>
          </View>
        </Card>

        {notifs.length > 0 && (
          <>
            <SectionHeader title="Notifications" />
            {notifs.map((n: any) => (
              <Card key={n.notification_id}>
                <View style={styles.notifRow}>
                  <Ionicons name="notifications" size={16} color={n.read ? C.textDis : C.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.notifTitle, !n.read && { color: C.text }]}>{n.title}</Text>
                    <Text style={styles.notifMsg}>{n.message}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, color: C.textSec },
  name: { fontSize: 24, fontWeight: '800', color: C.text },
  logoutBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  gymName: { fontSize: 13, color: C.secondary, fontWeight: '600', marginTop: 4 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: C.textSec, letterSpacing: 1 },
  planName: { fontSize: 18, fontWeight: '700', color: C.text },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.elevated },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.primary },
  daysText: { fontSize: 12, color: C.textSec, fontWeight: '600' },
  noPlanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  noPlanText: { color: C.primary, fontSize: 14, fontWeight: '600' },
  checkinRow: { flexDirection: 'row', alignItems: 'center' },
  checkinLabel: { fontSize: 14, fontWeight: '700', color: C.text, letterSpacing: 0.5 },
  checkinSub: { fontSize: 11, color: C.textDis, marginTop: 2 },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start' },
  notifTitle: { fontSize: 13, fontWeight: '600', color: C.textSec },
  notifMsg: { fontSize: 12, color: C.textDis, marginTop: 2 },
});
