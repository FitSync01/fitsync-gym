import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';
import { api } from '../../src/utils/api';
import { Card, LoadingScreen, EmptyState } from '../../src/components/ui';

export default function MemberHistory() {
  const { user } = useAuth();
  const [member, setMember] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const m = await api.get('/api/member/me');
        setMember(m);
        const l = await api.get(`/api/members/${m.member_id}/attendance?limit=50`);
        setLogs(l);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingScreen />;

  const grouped: Record<string, any[]> = {};
  logs.forEach(log => {
    const day = new Date(log.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(log);
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>ATTENDANCE HISTORY</Text>
      <FlatList
        data={Object.entries(grouped)}
        keyExtractor={([day]) => day}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={<EmptyState icon="time-outline" title="No History" subtitle="Your attendance history will appear here" />}
        renderItem={({ item: [day, dayLogs] }) => (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.dayHeader}>{day}</Text>
            {dayLogs.map((log: any) => (
              <Card key={log.log_id}>
                <View style={styles.logRow}>
                  <View style={[styles.logIcon, { backgroundColor: log.type === 'check_in' ? C.success + '20' : C.error + '20' }]}>
                    <Ionicons name={log.type === 'check_in' ? 'enter' : 'exit'} size={14} color={log.type === 'check_in' ? C.success : C.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logType}>{log.type === 'check_in' ? 'Check In' : 'Check Out'}</Text>
                    <Text style={styles.logMethod}>via {log.method}</Text>
                  </View>
                  <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 8 },
  dayHeader: { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 8, letterSpacing: 0.5 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  logType: { fontSize: 13, fontWeight: '600', color: C.text },
  logMethod: { fontSize: 10, color: C.textDis },
  logTime: { fontSize: 12, color: C.textSec, fontWeight: '500' },
});
