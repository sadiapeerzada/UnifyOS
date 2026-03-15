import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export default function LoginScreen() {
  function handleGoogle() {
    Alert.alert(
      'Google Sign-In',
      'Google Sign-In requires Firebase configuration',
      [{ text: 'OK' }]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="shield-check" size={52} color={Colors.accent} style={styles.icon} />
        <Text style={styles.title}>UnifyOS</Text>
        <Text style={styles.subtitle}>Crisis Coordination Platform</Text>

        <TouchableOpacity style={styles.button} onPress={handleGoogle} activeOpacity={0.85}>
          <MaterialCommunityIcons name="google" size={20} color="#fff" />
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.demoNote}>Currently in Demo Mode</Text>

        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 24,
    padding: 36,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  icon: {
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  demoNote: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
  },
  backLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.accent,
  },
});
