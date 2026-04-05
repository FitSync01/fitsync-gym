import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';
import { api } from '../../src/utils/api';
import { Card, SectionHeader, BarChart, LoadingScreen } from '../../src/components/ui';

export default function OwnerAnalytics() {
  const { user } = useAuth();
  const [attChart, setAttChart] = useState<any[]>([]);
  const [revChart, setRevChart] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiMsg, setAiMsg] = useState('');
  const [aiResp, setAiResp] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.gym_id) return;
    try {
      const [a, r, rk] = await Promise.all([
        api.get(`/api/gyms/${user.gym_id}/analytics/attendance-chart`),
        api.get(`/api/gyms/${user.gym_id}/analytics/revenue-chart`),
        api.get(`/api/gyms/${user.gym_id}/analytics/risk-members`),
      ]);
      setAttChart(a); setRevChart(r); setRisks(rk);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user?.gym_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const askAI = async () => {
    if (!aiMsg.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.post(`/api/gyms/${user?.gym_id}/assistant/chat`, { message: aiMsg });
      setAiResp(res.response);
      setAiMsg('');
    } catch (e: any) { setAiResp('Error: ' + e.message); }
    finally { setAiLoading(false); }
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>ANALYTICS</Text>

        <SectionHeader title="Weekly Attendance" />
        <Card>
          <BarChart data={attChart.map(d => ({ label: d.day, value: d.count }))} />
        </Card>

        <SectionHeader title="Monthly Revenue" />
        <Card>
          <BarChart data={revChart.map(d => ({ label: d.month, value: d.revenue }))} />
        </Card>

        <SectionHeader title="At-Risk Members" />
        {risks.length === 0 ? (
          <Text style={styles.noRisk}>All members in good standing</Text>
        ) : risks.map((r, i) => (
          <Card key={i}>
            <View style={styles.riskRow}>
              <View style={[styles.riskDot, { backgroundColor: r.risk === 'high' ? C.error : C.warning }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.riskName}>{r.name}</Text>
                <Text style={styles.riskReason}>{r.reasons.join(' • ')}</Text>
              </View>
              <Text style={[styles.riskLevel, { color: r.risk === 'high' ? C.error : C.warning }]}>{r.risk.toUpperCase()}</Text>
            </View>
          </Card>
        ))}

        <SectionHeader title="AI Gym Assistant" />
        <Card>
          <View style={styles.aiInputRow}>
            <TextInput testID="ai-input" style={styles.aiInput} placeholder="Ask about your gym..." placeholderTextColor={C.textDis}
              value={aiMsg} onChangeText={setAiMsg} onSubmitEditing={askAI} />
            <TouchableOpacity testID="ai-send-btn" style={styles.aiSendBtn} onPress={askAI} disabled={aiLoading}>
              {aiLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="send" size={16} color="#FFF" />}
            </TouchableOpacity>
          </View>
          {aiResp ? <Text style={styles.aiResp}>{aiResp}</Text> : <Text style={styles.aiHint}>Try: "How many members are expiring this week?"</Text>}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: 1, marginBottom: 4 },
  noRisk: { color: C.success, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskName: { fontSize: 14, fontWeight: '600', color: C.text },
  riskReason: { fontSize: 11, color: C.textSec },
  riskLevel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  aiInputRow: { flexDirection: 'row', gap: 8 },
  aiInput: { flex: 1, backgroundColor: C.elevated, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: C.text, borderWidth: 1, borderColor: C.border },
  aiSendBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  aiResp: { color: C.text, fontSize: 13, marginTop: 12, lineHeight: 20 },
  aiHint: { color: C.textDis, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});
