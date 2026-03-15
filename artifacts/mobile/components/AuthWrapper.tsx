import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';

function DemoBanner() {
  const { isDemo } = useAuth();
  if (!isDemo) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>Demo Mode — Firebase Auth Active</Text>
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBanner />
      {children}
    </>
  );
}

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#EAB308',
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
    zIndex: 9999,
  },
  bannerText: {
    fontSize: 11,
    color: '#1A1A00',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
});
