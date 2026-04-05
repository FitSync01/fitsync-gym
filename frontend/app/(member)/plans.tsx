import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';
import { api } from '../../src/utils/api';
import { Card, LoadingScreen } from '../../src/components/ui';

export default function MemberPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.gym_id) return;
    api.get(`/api/gyms/${user.gym_id}/plans`).then(setPlans).catch(console.error).finally(() => setLoading(false));
  }, [user?.gym_id]);

  const handlePurchase = async (planId: string) => {
    setPurchasing(planId);
    try {
      await api.post('/api/member/purchase-plan', { plan_id: planId });
      Alert.alert('Success', 'Plan activated! Enjoy your membership.');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setPurchasing(null); }
  };

  const handleCashRequest = async (planId: string) => {
    try {
      await api.post(`/api/gyms/${user?.gym_id}/cash-requests`, { plan_id: planId });
      Alert.alert('Request Sent', 'Cash payment request sent to gym owner for approval.');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>MEMBERSHIP PLANS</Text>
        <Text style={styles.subtitle}>Choose a plan that fits your goals</Text>
        {plans.map((plan, i) => {
          const popular = i === 1;
          return (
            <Card key={plan.plan_id} style={popular ? styles.popularCard : {}}>
              {popular && <View style={styles.popularBadge}><Text style={styles.popularText}>MOST POPULAR</Text></View>}
              <Text style={styles.planName}>{plan.plan_name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>${plan.price}</Text>
                <Text style={styles.duration}>/ {plan.duration_days} days</Text>
              </View>
              <View style={styles.features}>
                <View style={styles.featureRow}><Ionicons name="checkmark" size={14} color={C.success} /><Text style={styles.featureText}>Full gym access</Text></View>
                <View style={styles.featureRow}><Ionicons name="checkmark" size={14} color={C.success} /><Text style={styles.featureText}>Attendance tracking</Text></View>
                {plan.duration_days >= 90 && <View style={styles.featureRow}><Ionicons name="checkmark" size={14} color={C.success} /><Text style={styles.featureText}>Priority support</Text></View>}
                {plan.duration_days >= 365 && <View style={styles.featureRow}><Ionicons name="checkmark" size={14} color={C.success} /><Text style={styles.featureText}>Personal trainer session</Text></View>}
              </View>
              <TouchableOpacity testID={`buy-plan-${plan.plan_id}`} style={[styles.buyBtn, popular && styles.buyBtnPopular]} onPress={() => handlePurchase(plan.plan_id)} disabled={purchasing === plan.plan_id}>
                {purchasing === plan.plan_id ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buyText}>ACTIVATE NOW</Text>}
              </TouchableOpacity>
              <TouchableOpacity testID={`cash-plan-${plan.plan_id}`} style={styles.cashBtn} onPress={() => handleCashRequest(plan.plan_id)}>
                <Ionicons name="cash-outline" size={16} color={C.textSec} />
                <Text style={styles.cashText}>Pay with Cash</Text>
              </TouchableOpacity>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: 1 },
  subtitle: { fontSize: 13, color: C.textSec, marginTop: 4, marginBottom: 16 },
  popularCard: { borderColor: C.primary, borderWidth: 2 },
  popularBadge: { position: 'absolute', top: -1, right: 16, backgroundColor: C.primary, paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  popularText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  planName: { fontSize: 18, fontWeight: '700', color: C.text, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, gap: 4 },
  price: { fontSize: 28, fontWeight: '900', color: C.primary },
  duration: { fontSize: 13, color: C.textSec },
  features: { marginTop: 12, gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, color: C.textSec },
  buyBtn: { backgroundColor: C.surface, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: C.border },
  buyBtnPopular: { backgroundColor: C.primary, borderColor: C.primary },
  buyText: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  cashBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 6 },
  cashText: { fontSize: 12, color: C.textSec },
});
