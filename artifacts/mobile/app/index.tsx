import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';

export default function LandingScreen() {
  const { currentUser, isLoading, login, continueAsGuest } = useAuth();

  useEffect(() => {
    if (!isLoading && currentUser && !currentUser.isDemo) {
      router.replace('/(tabs)/dashboard');
    }
  }, [currentUser, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F8EF7" />
      </View>
    );
  }

  function handleContinueAsGuest() {
    continueAsGuest();
    router.replace('/(tabs)/dashboard');
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B3E" />
      <LinearGradient
        colors={['#0D1B3E', '#112244', '#0A1628']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <MaterialCommunityIcons name="shield-check" size={56} color="#4F8EF7" />
          </View>
          <Text style={styles.logoText}>UnifyOS</Text>
          <Text style={styles.tagline}>Real-time Crisis Coordination Platform</Text>
          <Text style={styles.taglineSub}>
            Intelligent sensor monitoring · AI-powered alerts · Instant response
          </Text>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={login}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="google" size={20} color="#fff" />
            <Text style={styles.googleBtnText}>Sign in with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestBtn}
            onPress={handleContinueAsGuest}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="account-outline" size={18} color="#8BA4D4" />
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLine}>Team BlackBit · Google Solution Challenge 2026</Text>
        <View style={styles.sdgRow}>
          {['SDG 3', 'SDG 9', 'SDG 11'].map(s => (
            <View key={s} style={styles.sdgChip}>
              <Text style={styles.sdgText}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D1B3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#0D1B3E',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 52,
  },
  logoSection: {
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(79,142,247,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.3)',
    marginBottom: 4,
  },
  logoText: {
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#8BA4D4',
    textAlign: 'center',
  },
  taglineSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#5A7AAA',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  buttonSection: {
    width: '100%',
    gap: 14,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#4F8EF7',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    shadowColor: '#4F8EF7',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  googleBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 15,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(139,164,212,0.35)',
  },
  guestBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#8BA4D4',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
    gap: 10,
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
