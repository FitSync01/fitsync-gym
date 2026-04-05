import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../src/utils/colors';
import { PrimaryButton } from '../src/components/ui';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME || 'frontend';

export default function Login() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const { login, googleAuth } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const googleConfigured = Boolean(GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_IOS_CLIENT_ID);
  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ['openid', 'profile', 'email'],
      selectAccount: true,
    },
    { scheme: APP_SCHEME }
  );

  const roleLabel = role === 'owner' ? 'Gym Owner' : role === 'staff' ? 'Staff' : role === 'super_admin' ? 'Super Admin' : 'Member';

  const routeAfterLogin = (user: any) => {
    if (user.must_reset_password) { Alert.alert('Password Reset', 'Please reset your password'); return; }
    switch (user.role) {
      case 'owner': user.gym_id ? router.replace('/(owner)') : router.replace('/onboarding'); break;
      case 'staff': router.replace('/(staff)'); break;
      case 'member': user.gym_id ? router.replace('/(member)') : router.replace('/join-gym'); break;
      case 'super_admin': router.replace('/(admin)'); break;
      default: router.replace('/'); break;
    }
  };

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    try {
      const user = await login(email.trim(), password);
      routeAfterLogin(user);
    } catch (e: any) { setError(e.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const completeGoogleLogin = async () => {
      if (response?.type !== 'success') return;
      const idToken = response.params?.id_token || (response.authentication as any)?.idToken;
      if (!idToken) {
        setError('Google sign-in did not return an ID token');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const user = await googleAuth(idToken);
        routeAfterLogin(user);
      } catch (e: any) {
        setError(e.message || 'Google auth failed');
      } finally {
        setLoading(false);
      }
    };

    completeGoogleLogin();
  }, [response]);

  const handleGoogle = async () => {
    if (!googleConfigured) {
      setError('Google sign-in is not configured yet. Add your Google client IDs to the app env first.');
      return;
    }
    if (!request) {
      setError('Google sign-in is still loading. Please try again in a moment.');
      return;
    }
    setError('');
    await promptAsync();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="login-back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <View style={styles.header}>
            <Text style={styles.title}>SIGN IN</Text>
            <Text style={styles.subtitle}>Login as {roleLabel}</Text>
          </View>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={C.textDis} />
              <TextInput testID="login-email-input" style={styles.input} placeholder="your@email.com" placeholderTextColor={C.textDis}
                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={C.textDis} />
              <TextInput testID="login-password-input" style={styles.input} placeholder="Enter password" placeholderTextColor={C.textDis}
                value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color={C.textDis} />
              </TouchableOpacity>
            </View>
          </View>
          <PrimaryButton testID="login-submit-btn" title="SIGN IN" onPress={handleLogin} loading={loading} style={{ marginTop: 20 }} />
          <View style={styles.divider}>
            <View style={styles.divLine} /><Text style={styles.divText}>OR</Text><View style={styles.divLine} />
          </View>
          <TouchableOpacity testID="login-google-btn" style={[styles.googleBtn, (!googleConfigured || !request || loading) && styles.googleBtnDisabled]} onPress={handleGoogle} activeOpacity={0.7} disabled={!googleConfigured || !request || loading}>
            <Ionicons name="logo-google" size={20} color={C.text} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
          <Text style={styles.ownershipNote}>
            Google sign-in uses your own Google OAuth client IDs from app environment variables.
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity testID="login-register-link" onPress={() => router.push({ pathname: '/register', params: { role } })}>
              <Text style={styles.switchLink}>Sign Up</Text>
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
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: C.textSec, letterSpacing: 1, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.elevated, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  input: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 14, marginLeft: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divText: { color: C.textDis, fontSize: 12, marginHorizontal: 12, fontWeight: '600' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderRadius: 10, paddingVertical: 14, borderWidth: 1, borderColor: C.border },
  googleBtnDisabled: { opacity: 0.55 },
  googleText: { color: C.text, fontSize: 14, fontWeight: '600', marginLeft: 10 },
  ownershipNote: { color: C.textSec, fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: C.textSec, fontSize: 13 },
  switchLink: { color: C.primary, fontSize: 13, fontWeight: '700' },
});
