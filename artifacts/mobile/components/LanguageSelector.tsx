import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', name: 'EN' },
  { code: 'hi', flag: '🇮🇳', name: 'HI' },
  { code: 'ar', flag: '🇸🇦', name: 'AR' },
  { code: 'fr', flag: '🇫🇷', name: 'FR' },
  { code: 'es', flag: '🇪🇸', name: 'ES' },
  { code: 'zh', flag: '🇨🇳', name: 'ZH' },
  { code: 'ja', flag: '🇯🇵', name: 'JA' },
  { code: 'de', flag: '🇩🇪', name: 'DE' },
  { code: 'ru', flag: '🇷🇺', name: 'RU' },
];

interface Props {
  selectedLanguage: string;
  onLanguageChange: (code: string) => void;
}

export function LanguageSelector({ selectedLanguage, onLanguageChange }: Props) {
  async function handleSelect(code: string) {
    await AsyncStorage.setItem('unifyos_language', code);
    onLanguageChange(code);
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>
        {LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.chip,
              selectedLanguage === lang.code && styles.chipSelected,
            ]}
            onPress={() => handleSelect(lang.code)}
            accessibilityLabel={`Select language ${lang.name}`}
            accessibilityRole="button"
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={[
              styles.code,
              selectedLanguage === lang.code && styles.codeSelected,
            ]}>{lang.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.3)',
    backgroundColor: 'rgba(79,142,247,0.05)',
  },
  chipSelected: {
    backgroundColor: 'rgba(79,142,247,0.2)',
    borderColor: '#4F8EF7',
  },
  flag: { fontSize: 14 },
  code: { fontSize: 11, color: '#8BA4D4', fontWeight: '600' },
  codeSelected: { color: '#4F8EF7' },
});
