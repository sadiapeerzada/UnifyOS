import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="shield-check" size={52} color={Colors.accent} style={styles.icon} />
        <Text style={styles.title}>UnifyOS</Text>
        <Text style={styles.subtitle}>Crisis Coordination Platform</Text>

        <TouchableOpacity style={styles.button} onPress={login} activeOpacity={0.85}>
          <MaterialCommunityIcons name="google" size={20} color="#fff" />
          <Text style={styles.buttonText}>Continue with Google</Text>
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
});
