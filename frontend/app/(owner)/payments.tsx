import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';
import { api } from '../../src/utils/api';
import { Card, LoadingScreen, EmptyState } from '../../src/components/ui';

export default function OwnerPayments() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'requests' | 'history'>('requests');

  const fetchData = useCallback(async () => {
    if (!user?.gym_id) return;
    try {
      const [r, p] = await Promise.all([
        api.get(`/api/gyms/${user.gym_id}/cash-requests`),
        api.get(`/api/gyms/${user.gym_id}/payments?limit=50`),
      ]);
      setRequests(r); setPayments(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.gym_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (reqId: string) => {
    try {
      await api.put(`/api/gyms/${user?.gym_id}/cash-requests/${reqId}/approve`);
      Alert.alert('Success', 'Payment approved');
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleReject = async (reqId: string) => {
    try {
      await api.put(`/api/gyms/${user?.gym_id}/cash-requests/${reqId}/reject`);
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (loading) return <LoadingScreen />;

  const pending = requests.filter(r => r.status === 'pending');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>PAYMENTS</Text>
      <View style={styles.tabRow}>
        {['requests', 'history'].map(t => (
          <TouchableOpacity key={t} testID={`pay-tab-${t}`} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t as any)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'requests' ? `Requests (${pending.length})` : 'History'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'requests' ? (
        <FlatList data={requests} keyExtractor={item => item.request_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.primary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No Requests" subtitle="No pending cash payment requests" />}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqName}>{item.member_name}</Text>
                  <Text style={styles.reqPlan}>{item.plan_name} - ${item.amount}</Text>
                  <Text style={styles.reqStatus}>{item.status.toUpperCase()}</Text>
                </View>
                {item.status === 'pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity testID={`approve-${item.request_id}`} style={styles.approveBtn} onPress={() => handleApprove(item.request_id)}>
                      <Ionicons name="checkmark" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity testID={`reject-${item.request_id}`} style={styles.rejectBtn} onPress={() => handleReject(item.request_id)}>
                      <Ionicons name="close" size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Card>
          )}
        />
      ) : (
        <FlatList data={payments} keyExtractor={item => item.payment_id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={<EmptyState icon="wallet-outline" title="No Payments" subtitle="No payment records yet" />}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.payRow}>
                <View style={[styles.payIcon, { backgroundColor: C.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={C.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payAmount}>${item.amount}</Text>
                  <Text style={styles.payPlan}>{item.plan_name} • {item.method}</Text>
                </View>
                <Text style={styles.payDate}>{new Date(item.paid_at).toLocaleDateString()}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 8 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: C.surface, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: C.primary + '20', borderColor: C.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: C.textSec },
  tabTextActive: { color: C.primary },
  reqRow: { flexDirection: 'row', alignItems: 'center' },
  reqName: { fontSize: 14, fontWeight: '600', color: C.text },
  reqPlan: { fontSize: 12, color: C.textSec, marginTop: 2 },
  reqStatus: { fontSize: 10, color: C.warning, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.error, alignItems: 'center', justifyContent: 'center' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  payAmount: { fontSize: 15, fontWeight: '700', color: C.text },
  payPlan: { fontSize: 11, color: C.textSec },
  payDate: { fontSize: 11, color: C.textDis },
});
