import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';

async function navigateAfterAuth() {
  const seen = await AsyncStorage.getItem('seen_device_intro');
  if (!seen) {
    router.replace('/device-intro');
    return;
  }
  const configured = await AsyncStorage.getItem('device_configured');
  if (!configured) {
    router.replace('/device-setup');
    return;
  }
  router.replace('/(tabs)/dashboard');
}

export default function LandingScreen() {
  const { currentUser, isLoading, authError, clearAuthError, loginWithEmail, loginAsGuest } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && currentUser && !currentUser.isGuest) {
      navigateAfterAuth();
    }
  }, [currentUser, isLoading]);

  useEffect(() => {
    if (authError) setLocalError(authError);
  }, [authError]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F8EF7" />
      </View>
    );
  }

  const errorMessage = localError || authError;

  function dismissError() {
    setLocalError(null);
    clearAuthError();
  }

  async function handleEmailLogin() {
    dismissError();
    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
    } catch {
      // error is set in context
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContinueAsGuest() {
    loginAsGuest();
    await navigateAfterAuth();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0D1B3E" />
      <LinearGradient
        colors={['#0D1B3E', '#112244', '#0A1628']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <MaterialCommunityIcons name="shield-check" size={52} color="#4F8EF7" />
          </View>
          <Text style={styles.logoText}>UnifyOS</Text>
          <Text style={styles.tagline}>Real-time Crisis Coordination Platform</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign In</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="email-outline" size={18} color="#5A7AAA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#3D5278"
                value={email}
                onChangeText={(t) => { setEmail(t); dismissError(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="lock-outline" size={18} color="#5A7AAA" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Enter your password"
                placeholderTextColor="#3D5278"
                value={password}
                onChangeText={(t) => { setPassword(t); dismissError(); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleEmailLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#5A7AAA"
                />
              </TouchableOpacity>
            </View>
          </View>

          {errorMessage ? (
            <TouchableOpacity onPress={dismissError} style={styles.errorBanner} activeOpacity={0.8}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            onPress={handleEmailLogin}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')} activeOpacity={0.8}>
              <Text style={styles.signupLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.guestBtn}
          onPress={handleContinueAsGuest}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="account-outline" size={16} color="#8BA4D4" />
          <Text style={styles.guestBtnText}>Continue as Guest</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerLine}>Team BlackBit · Google Solution Challenge 2026</Text>
          <View style={styles.sdgRow}>
            {['SDG 3', 'SDG 9', 'SDG 10', 'SDG 11'].map(s => (
              <View key={s} style={styles.sdgChip}>
                <Text style={styles.sdgText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#0D1B3E',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D1B3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
    gap: 24,
  },
  logoSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  logoIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: 'rgba(79,142,247,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.3)',
    marginBottom: 4,
  },
  logoText: {
    fontSize: 38,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#8BA4D4',
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.15)',
    padding: 24,
    gap: 16,
  },
  formTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#8BA4D4',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.2)',
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#F0F4FF',
  },
  inputFlex: {
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#EF4444',
    lineHeight: 17,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F8EF7',
    borderRadius: 14,
    paddingVertical: 15,
    width: '100%',
    shadowColor: '#4F8EF7',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    minHeight: 52,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupPrompt: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#5A7AAA',
  },
  signupLink: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#4F8EF7',
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  guestBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#5A7AAA',
  },
  footer: {
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  footerLine: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#3D5278',
    textAlign: 'center',
  },
  sdgRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sdgChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(79,142,247,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.25)',
  },
  sdgText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#4F8EF7',
  },
});
