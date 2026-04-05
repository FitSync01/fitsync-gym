import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../src/utils/colors';
import { PrimaryButton } from '../src/components/ui';
import { api } from '../src/utils/api';

export default function JoinGym() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!code) { setError('Please enter a gym code'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/api/gyms/join', { gym_code: code.trim() });
      await refreshUser();
      router.replace('/(member)');
    } catch (e: any) { setError(e.message || 'Invalid gym code'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="join-back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="qr-code" size={32} color={C.primary} />
            </View>
            <Text style={styles.title}>JOIN A GYM</Text>
            <Text style={styles.subtitle}>Enter the gym code provided by your gym</Text>
          </View>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>GYM CODE</Text>
            <View style={styles.inputWrap}>
              <TextInput testID="join-code-input" style={styles.codeInput} placeholder="XXXXXX" placeholderTextColor={C.textDis}
                value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={8} />
            </View>
          </View>
          <PrimaryButton testID="join-submit-btn" title="JOIN GYM" onPress={handleJoin} loading={loading} style={{ marginTop: 20 }} />
          <Text style={styles.hint}>Ask your gym owner for the join code</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: 10 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 20 },
  iconWrap: { width: 64, height: 64, borderRadius: 16, backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: 2 },
  subtitle: { fontSize: 13, color: C.textSec, marginTop: 4, textAlign: 'center' },
  errorBox: { backgroundColor: C.error + '20', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.error },
  errorText: { color: C.error, fontSize: 13 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: C.textSec, letterSpacing: 1, marginBottom: 6 },
  inputWrap: { backgroundColor: C.elevated, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  codeInput: { color: C.text, fontSize: 24, fontWeight: '800', paddingVertical: 16, textAlign: 'center', letterSpacing: 8 },
  hint: { color: C.textDis, fontSize: 12, textAlign: 'center', marginTop: 16 },
});
