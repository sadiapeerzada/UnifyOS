import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDashboard } from '@/context/DashboardContext';

const LANGUAGES: { code: string; label: string; flag: string } [] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

type StepId = 1 | 2 | 3 | 4;

interface Step {
  id: StepId;
  label: string;
  desc: string;
  color: string;
  icon: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'ALERT RECEIVED', desc: 'Emergency detected', color: '#EF4444', icon: 'alert-circle' },
  { id: 2, label: 'STAFF NOTIFIED', desc: 'Staff alerted · Response team dispatched', color: '#F97316', icon: 'account-group' },
  { id: 3, label: 'HELP COMING', desc: 'Help is on the way · Est. 2–3 minutes', color: '#3B82F6', icon: 'ambulance' },
  { id: 4, label: 'EVACUATE NOW', desc: 'Please evacuate · Do NOT use elevators', color: '#EF4444', icon: 'exit-run' },
];

const TRANSLATIONS: Record<string, { title: string; subtitle: string; steps: string[] }> = {
  en: { title: 'Emergency Status', subtitle: 'Stay calm — help is coming', steps: ['Emergency detected in {location}', 'Staff have been alerted\nResponse team dispatched', 'Help is on the way\nEstimated response: 2–3 minutes', 'Please evacuate now\nUse emergency exits\nDo NOT use elevators'] },
  hi: { title: 'आपातकालीन स्थिति', subtitle: 'शांत रहें — मदद आ रही है', steps: ['{location} में आपातकाल', 'स्टाफ को सूचित किया गया', 'मदद रास्ते में है', 'कृपया अभी निकासी करें'] },
  ur: { title: 'ایمرجنسی اسٹیٹس', subtitle: 'پرسکون رہیں — مدد آ رہی ہے', steps: ['{location} میں ایمرجنسی', 'عملہ آگاہ کر دیا گیا', 'مدد راستے میں ہے', 'فوری طور پر خالی کریں'] },
  fr: { title: "Statut d'urgence", subtitle: 'Restez calme — les secours arrivent', steps: ["Urgence détectée à {location}", 'Personnel alerté', 'Les secours arrivent', 'Veuillez évacuer maintenant'] },
  de: { title: 'Notfallstatus', subtitle: 'Bleiben Sie ruhig — Hilfe kommt', steps: ['Notfall erkannt in {location}', 'Personal benachrichtigt', 'Hilfe ist unterwegs', 'Bitte jetzt evakuieren'] },
  ar: { title: 'حالة الطوارئ', subtitle: 'ابق هادئاً — المساعدة قادمة', steps: ['طوارئ في {location}', 'تم إخطار الموظفين', 'المساعدة في الطريق', 'يرجى الإخلاء الآن'] },
  es: { title: 'Estado de emergencia', subtitle: 'Mantenga la calma — la ayuda llega', steps: ['Emergencia en {location}', 'Personal notificado', 'La ayuda está en camino', 'Por favor evacúe ahora'] },
  zh: { title: '紧急状态', subtitle: '保持冷静 — 帮助即将到来', steps: ['{location}检测到紧急情况', '已通知工作人员', '帮助正在赶来', '请立即疏散'] },
  ja: { title: '緊急状況', subtitle: '落ち着いて — 助けが来ます', steps: ['{location}で緊急事態', 'スタッフに通知済み', '救助が向かっています', '今すぐ避難してください'] },
};

const EMERGENCY_NUMBERS = [
  { label: '112 — National Emergency', number: '112', color: '#EF4444' },
  { label: '101 — Fire', number: '101', color: '#F97316' },
  { label: '102 — Ambulance', number: '102', color: '#3B82F6' },
  { label: '100 — Police', number: '100', color: '#8B5CF6' },
];

export default function GuestStatusScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const { activeAlerts } = useDashboard();

  const [lang, setLang] = useState('en');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const activeStep: StepId = activeAlerts.length > 0
    ? activeAlerts.some(a => a.severity === 'CRITICAL') ? 4 : 2
    : 1;

  const location = activeAlerts[0]?.deviceLocation ?? 'your area';
  const alertTime = activeAlerts[0]?.createdAt
    ? new Date(activeAlerts[0].createdAt).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  const t = TRANSLATIONS[lang] ?? TRANSLATIONS['en'];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function getStepDesc(step: Step, index: number): string {
    const raw = t.steps[index] ?? step.desc;
    return raw.replace('{location}', location);
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <MaterialCommunityIcons name="arrow-left" size={22} color="#F0F4FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.langRow}>
          {LANGUAGES.map(l => (
            <Pressable
              key={l.code}
              onPress={() => setLang(l.code)}
              style={[styles.langBtn, lang === l.code && styles.langBtnActive]}
              accessibilityLabel={`Switch to ${l.label}`}
              accessibilityRole="button"
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.subtitle}>
          <Text style={styles.subtitleText}>{t.subtitle}</Text>
          <Text style={styles.timeText}>Alert at {alertTime}</Text>
        </View>

        <View style={styles.stepsContainer}>
          {STEPS.map((step, i) => {
            const isActive = step.id === activeStep;
            const isPast = step.id < activeStep;
            const isDim = step.id > activeStep;

            return (
              <Animated.View
                key={step.id}
                style={[
                  styles.stepCard,
                  isActive && { borderColor: step.color + '80', backgroundColor: step.color + '15' },
                  isPast && styles.stepPast,
                  isDim && styles.stepDim,
                  isActive && { transform: [{ scale: pulseAnim }] },
                ]}
                accessibilityLabel={`Step ${step.id}: ${step.label}`}
              >
                <View style={[styles.stepIconBox, { backgroundColor: isActive || isPast ? step.color + '25' : '#1E2D45' }]}>
                  <MaterialCommunityIcons
                    name={step.icon as any}
                    size={28}
                    color={isActive || isPast ? step.color : '#4A5A78'}
                    accessibilityElementsHidden
                  />
                </View>
                <View style={styles.stepText}>
                  <View style={styles.stepLabelRow}>
                    <Text style={[styles.stepLabel, { color: isActive ? step.color : isPast ? '#8B9EC5' : '#4A5A78' }]}>
                      {step.label}
                    </Text>
                    {isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: step.color }]}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                    {isPast && (
                      <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" accessibilityElementsHidden />
                    )}
                  </View>
                  <Text style={[styles.stepDesc, { color: isActive ? '#F0F4FF' : isPast ? '#8B9EC5' : '#4A5A78' }]}>
                    {getStepDesc(step, i)}
                  </Text>
                </View>
                <Text style={[styles.stepNum, { color: isActive ? step.color : '#4A5A78' }]}>{step.id}</Text>
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.emergencySection}>
          <Text style={styles.sectionTitle}>EMERGENCY NUMBERS</Text>
          {EMERGENCY_NUMBERS.map(n => (
            <Pressable
              key={n.number}
              style={[styles.callCard, { borderColor: n.color + '40' }]}
              onPress={() => Linking.openURL(`tel:${n.number}`)}
              accessibilityLabel={`Call ${n.label}`}
              accessibilityHint={`Tap to call ${n.number}`}
              accessibilityRole="button"
              style={[styles.callCard, { borderColor: n.color + '40' }]}
            >
              <MaterialCommunityIcons name="phone" size={20} color={n.color} accessibilityElementsHidden />
              <Text style={[styles.callLabel, { color: '#F0F4FF' }]}>{n.label}</Text>
              <View style={[styles.callChip, { backgroundColor: n.color }]}>
                <Text style={styles.callChipText}>CALL</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.safetyTips}>
          <Text style={styles.sectionTitle}>SAFETY REMINDERS</Text>
          {[
            'Stay low if there is smoke',
            'Do NOT use elevators',
            'Follow staff instructions',
            'Assist others if safe to do so',
            'Meet at emergency assembly point',
          ].map(tip => (
            <View key={tip} style={styles.tipRow}>
              <MaterialCommunityIcons name="check" size={14} color="#22C55E" accessibilityElementsHidden />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1E2D45',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#F0F4FF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 20 },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  langBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#1E2D45', backgroundColor: '#111827' },
  langBtnActive: { borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.2)' },
  langFlag: { fontSize: 20 },
  subtitle: { gap: 4 },
  subtitleText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#8B9EC5' },
  timeText: { fontSize: 11, color: '#4A5A78', fontFamily: 'Inter_400Regular' },
  stepsContainer: { gap: 10 },
  stepCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111827', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1E2D45',
  },
  stepPast: { opacity: 0.8 },
  stepDim: { opacity: 0.4 },
  stepIconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepText: { flex: 1, gap: 4 },
  stepLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  activeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  activeBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.5 },
  stepDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  stepNum: { fontSize: 24, fontFamily: 'Inter_700Bold', opacity: 0.3 },
  emergencySection: { gap: 8 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#4A5A78', letterSpacing: 1, textTransform: 'uppercase' },
  callCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderWidth: 1, minHeight: 56,
  },
  callLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  callChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  callChipText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.5 },
  safetyTips: { gap: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  tipText: { fontSize: 13, color: '#8B9EC5', fontFamily: 'Inter_400Regular', flex: 1 },
});
