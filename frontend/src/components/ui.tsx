import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../utils/colors';

export function KPICard({ testID, icon, label, value, color }: { testID: string; icon: string; label: string; value: string | number; color?: string }) {
  return (
    <View testID={testID} style={s.kpiCard}>
      <View style={[s.kpiIcon, { backgroundColor: (color || C.primary) + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color || C.primary} />
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action && <TouchableOpacity onPress={onAction}><Text style={s.sectionAction}>{action}</Text></TouchableOpacity>}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function StatusBadge({ status }: { status: string }) {
  const color = status === 'active' ? C.success : status === 'expired' ? C.error : status === 'pending' ? C.warning : C.textDis;
  return (
    <View style={[s.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[s.badgeText, { color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

export function LoadingScreen() {
  return (
    <View style={s.loadingContainer}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={s.emptyContainer}>
      <Ionicons name={icon as any} size={48} color={C.textDis} />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export function PrimaryButton({ testID, title, onPress, loading, style }: { testID: string; title: string; onPress: () => void; loading?: boolean; style?: any }) {
  return (
    <TouchableOpacity testID={testID} style={[s.primaryBtn, style]} onPress={onPress} disabled={loading} activeOpacity={0.8}>
      {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnText}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function BarChart({ data, maxHeight = 120 }: { data: { label: string; value: number }[]; maxHeight?: number }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={s.chartContainer}>
      {data.map((d, i) => (
        <View key={i} style={s.chartBar}>
          <Text style={s.chartValue}>{d.value}</Text>
          <View style={[s.bar, { height: (d.value / maxVal) * maxHeight, backgroundColor: C.primary }]} />
          <Text style={s.chartLabel}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  kpiCard: { backgroundColor: C.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, minWidth: 100, flex: 1, marginHorizontal: 4 },
  kpiIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  kpiLabel: { fontSize: 11, color: C.textSec, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionAction: { fontSize: 13, color: C.secondary, fontWeight: '600' },
  card: { backgroundColor: C.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  loadingContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSec, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: C.textDis, marginTop: 4, textAlign: 'center' },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 8 },
  chartBar: { alignItems: 'center', flex: 1 },
  chartValue: { fontSize: 10, color: C.textSec, marginBottom: 4 },
  bar: { width: 24, borderRadius: 4, minHeight: 4 },
  chartLabel: { fontSize: 10, color: C.textDis, marginTop: 4 },
});
