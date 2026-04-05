import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/utils/colors';
import { api } from '../../src/utils/api';
import { StatusBadge, Card, LoadingScreen } from '../../src/components/ui';

export default function OwnerMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const fetchMembers = useCallback(async () => {
    if (!user?.gym_id) return;
    try {
      const q = search ? `/api/gyms/${user.gym_id}/members/search?q=${encodeURIComponent(search)}` : `/api/gyms/${user.gym_id}/members`;
      const data = await api.get(q);
      setMembers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user?.gym_id, search]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleAdd = async () => {
    if (!newName || !newEmail) { Alert.alert('Error', 'Name and email required'); return; }
    try {
      await api.post(`/api/gyms/${user?.gym_id}/members`, { name: newName, email: newEmail, phone: newPhone });
      setShowAdd(false); setNewName(''); setNewEmail(''); setNewPhone('');
      fetchMembers();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleSuspend = async (memberId: string, suspended: boolean) => {
    try {
      await api.put(`/api/gyms/${user?.gym_id}/members/${memberId}`, { suspended: !suspended });
      fetchMembers();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const renderMember = ({ item }: { item: any }) => (
    <Card>
      <View style={styles.memberRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.charAt(0)}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
          {item.plan_name && <Text style={styles.memberPlan}>{item.plan_name}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={item.membership_status} />
          <TouchableOpacity testID={`suspend-${item.member_id}`} onPress={() => handleSuspend(item.member_id, item.suspended)}>
            <Text style={{ fontSize: 11, color: item.suspended ? C.success : C.error }}>{item.suspended ? 'Activate' : 'Suspend'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MEMBERS</Text>
        <TouchableOpacity testID="add-member-btn" style={styles.addBtn} onPress={() => setShowAdd(!showAdd)}>
          <Ionicons name={showAdd ? 'close' : 'add'} size={20} color={C.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={C.textDis} />
        <TextInput testID="member-search-input" style={styles.searchInput} placeholder="Search members..." placeholderTextColor={C.textDis}
          value={search} onChangeText={setSearch} />
      </View>
      {showAdd && (
        <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <Text style={styles.addTitle}>ADD MEMBER</Text>
          <TextInput testID="new-member-name" style={styles.addInput} placeholder="Name" placeholderTextColor={C.textDis} value={newName} onChangeText={setNewName} />
          <TextInput testID="new-member-email" style={styles.addInput} placeholder="Email" placeholderTextColor={C.textDis} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput testID="new-member-phone" style={styles.addInput} placeholder="Phone" placeholderTextColor={C.textDis} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
          <TouchableOpacity testID="submit-new-member" style={styles.submitBtn} onPress={handleAdd}><Text style={styles.submitText}>ADD</Text></TouchableOpacity>
        </Card>
      )}
      <Text style={styles.countText}>{members.length} members</Text>
      <FlatList data={members} renderItem={renderMember} keyExtractor={item => item.member_id} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 10, marginLeft: 8 },
  countText: { color: C.textDis, fontSize: 11, marginHorizontal: 16, marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: C.primary },
  memberName: { fontSize: 14, fontWeight: '600', color: C.text },
  memberEmail: { fontSize: 11, color: C.textSec },
  memberPlan: { fontSize: 11, color: C.secondary, marginTop: 1 },
  addTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8, letterSpacing: 0.5 },
  addInput: { backgroundColor: C.elevated, borderRadius: 8, padding: 10, color: C.text, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  submitBtn: { backgroundColor: C.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
