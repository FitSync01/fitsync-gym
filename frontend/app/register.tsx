import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../src/utils/colors';
import { PrimaryButton } from '../src/components/ui';

export default function Register() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const { register: doRegister } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) { setError('Please fill all required fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      const registrationRole = role === 'super_admin' ? 'member' : (role || 'member');
      const user = await doRegister(email.trim(), password, name.trim(), phone, registrationRole);
      switch (user.role) {
        case 'owner': router.replace('/onboarding'); break;
        case 'member': router.replace('/join-gym'); break;
        default: router.replace('/'); break;
      }
    } catch (e: any) { setError(e.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="register-back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <View style={styles.header}>
            <Text style={styles.title}>CREATE ACCOUNT</Text>
            <Text style={styles.subtitle}>Join FitSync as {role === 'owner' ? 'Gym Owner' : 'Member'}</Text>
          </View>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={C.textDis} />
              <TextInput testID="register-name-input" style={styles.input} placeholder="Your full name" placeholderTextColor={C.textDis}
                value={name} onChangeText={setName} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={C.textDis} />
              <TextInput testID="register-email-input" style={styles.input} placeholder="your@email.com" placeholderTextColor={C.textDis}
                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PHONE (OPTIONAL)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={18} color={C.textDis} />
              <TextInput testID="register-phone-input" style={styles.input} placeholder="+1 555 0123" placeholderTextColor={C.textDis}
                value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={C.textDis} />
              <TextInput testID="register-password-input" style={styles.input} placeholder="Min 6 characters" placeholderTextColor={C.textDis}
                value={password} onChangeText={setPassword} secureTextEntry />
            </View>
          </View>
          <PrimaryButton testID="register-submit-btn" title="CREATE ACCOUNT" onPress={handleRegister} loading={loading} style={{ marginTop: 16 }} />
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity testID="register-login-link" onPress={() => router.back()}>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: 10 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  header: { marginBottom: 24, marginTop: 8 },
  title: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: 2 },
  subtitle: { fontSize: 14, color: C.textSec, marginTop: 4 },
  errorBox: { backgroundColor: C.error + '20', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.error },
  errorText: { color: C.error, fontSize: 13 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: C.textSec, letterSpacing: 1, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.elevated, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  input: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 14, marginLeft: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: C.textSec, fontSize: 13 },
  switchLink: { color: C.primary, fontSize: 13, fontWeight: '700' },
});
