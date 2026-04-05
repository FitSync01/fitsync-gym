import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../src/utils/colors';
import { PrimaryButton } from '../src/components/ui';
import { api } from '../src/utils/api';

export default function Onboarding() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [gymName, setGymName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!gymName) { setError('Gym name is required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/api/gyms', { name: gymName, address, phone });
      await refreshUser();
      router.replace('/(owner)');
    } catch (e: any) { setError(e.message || 'Failed to create gym'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="business" size={32} color={C.primary} />
            </View>
            <Text style={styles.title}>SET UP YOUR GYM</Text>
            <Text style={styles.subtitle}>Create your gym profile to get started</Text>
          </View>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>GYM NAME *</Text>
            <View style={styles.inputWrap}>
              <TextInput testID="onboard-gym-name" style={styles.input} placeholder="e.g. FitSync Premium" placeholderTextColor={C.textDis}
                value={gymName} onChangeText={setGymName} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ADDRESS</Text>
            <View style={styles.inputWrap}>
              <TextInput testID="onboard-address" style={styles.input} placeholder="123 Fitness St" placeholderTextColor={C.textDis}
                value={address} onChangeText={setAddress} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PHONE</Text>
            <View style={styles.inputWrap}>
              <TextInput testID="onboard-phone" style={styles.input} placeholder="+1 555-0123" placeholderTextColor={C.textDis}
                value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          </View>
          <PrimaryButton testID="onboard-create-btn" title="CREATE GYM" onPress={handleCreate} loading={loading} style={{ marginTop: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconWrap: { width: 64, height: 64, borderRadius: 16, backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: 2 },
  subtitle: { fontSize: 13, color: C.textSec, marginTop: 4 },
  errorBox: { backgroundColor: C.error + '20', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.error },
  errorText: { color: C.error, fontSize: 13 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: C.textSec, letterSpacing: 1, marginBottom: 6 },
  inputWrap: { backgroundColor: C.elevated, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  input: { color: C.text, fontSize: 15, paddingVertical: 14 },
});
