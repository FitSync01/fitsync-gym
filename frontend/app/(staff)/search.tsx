import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';
import { api } from '../../src/utils/api';
import { Card, StatusBadge, EmptyState } from '../../src/components/ui';

export default function StaffSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!user?.gym_id || !query.trim()) return;
    try {
      const data = await api.get(`/api/gyms/${user.gym_id}/members/search?q=${encodeURIComponent(query)}`);
      setResults(data);
      setSearched(true);
    } catch (e: any) { Alert.alert('Error', e.message); }
  }, [user?.gym_id, query]);

  const quickCheckin = async (memberId: string) => {
    try {
      const res = await api.post(`/api/gyms/${user?.gym_id}/attendance/scan`, { member_id: memberId, method: 'manual' });
      Alert.alert('Success', `${res.member_name}: ${res.status}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>MEMBER SEARCH</Text>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={C.textDis} />
        <TextInput testID="staff-search-input" style={styles.searchInput} placeholder="Name, email, or member ID..." placeholderTextColor={C.textDis}
          value={query} onChangeText={setQuery} onSubmitEditing={handleSearch} returnKeyType="search" />
        <TouchableOpacity testID="staff-search-btn" onPress={handleSearch}>
          <Ionicons name="arrow-forward-circle" size={28} color={C.primary} />
        </TouchableOpacity>
      </View>
      <FlatList data={results} keyExtractor={item => item.member_id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={searched ? <EmptyState icon="search" title="No Results" subtitle="Try a different search term" /> : <EmptyState icon="people-outline" title="Search Members" subtitle="Search by name, email, or member ID" />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.memberRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberId}>{item.member_id}</Text>
                <Text style={styles.memberEmail}>{item.email}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <StatusBadge status={item.membership_status} />
                <TouchableOpacity testID={`quick-checkin-${item.member_id}`} style={styles.checkinBtn} onPress={() => quickCheckin(item.member_id)}>
                  <Ionicons name="finger-print" size={14} color="#FFF" />
                  <Text style={styles.checkinText}>Check-in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 12, marginLeft: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.secondary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: C.secondary },
  memberName: { fontSize: 14, fontWeight: '600', color: C.text },
  memberId: { fontSize: 10, color: C.textDis },
  memberEmail: { fontSize: 11, color: C.textSec },
  checkinBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  checkinText: { fontSize: 10, color: '#FFF', fontWeight: '600' },
});
