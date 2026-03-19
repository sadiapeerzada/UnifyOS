import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useDashboard } from "@/context/DashboardContext";
import { ENV } from "@/config/env";

interface AnomalyStats {
  totalReadings: number;
  alertsFired: number;
  criticalAlerts: number;
  baselineDevices: Record<string, { temp: number; smoke: number; calibrated: boolean }>;
  falseAlarmRate: string;
  lastCalibrated: string | null;
}

const SCENARIOS = [
  {
    id: "normal",
    title: "Normal Operations",
    description: "All sensors within expected ranges. Standard occupancy patterns.",
    icon: "shield-check" as const,
    color: Colors.normal,
  },
  {
    id: "smoke",
    title: "Smoke Detection",
    description: "Server Room shows rising smoke levels. Temperature slightly elevated.",
    icon: "smoke" as const,
    color: Colors.smoke,
  },
  {
    id: "fire",
    title: "Fire Emergency",
    description: "Lab 205 — rapid temperature rise + smoke detected. Panic button activation.",
    icon: "fire-alert" as const,
    color: Colors.critical,
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { scenario, setScenario, alerts, clearAlertHistory } = useDashboard();
  const [anomalyStats, setAnomalyStats] = useState<AnomalyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("unifyos_voice_alerts").then(val => {
      if (val === "false") setVoiceAlertsEnabled(false);
    });
  }, []);

  function handleVoiceToggle(value: boolean) {
    setVoiceAlertsEnabled(value);
    AsyncStorage.setItem("unifyos_voice_alerts", value ? "true" : "false");
    Haptics.selectionAsync();
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true);
      try {
        const res = await fetch(`${ENV.BACKEND_URL}/anomaly-stats`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          setAnomalyStats(data);
        }
      } catch {}
      setStatsLoading(false);
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const alertStats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === "CRITICAL").length,
    high: alerts.filter(a => a.severity === "HIGH").length,
    medium: alerts.filter(a => a.severity === "MEDIUM").length,
  };

  function handleClearHistory() {
    Alert.alert("Clear History", "Delete all alert history? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); clearAlertHistory(); } },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Preferences, scenarios & device management</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demo Scenarios</Text>
          <Text style={styles.sectionDesc}>
            Select a scenario to simulate real sensor data and trigger the anomaly detection system.
          </Text>

          {SCENARIOS.map(s => (
            <Pressable
              key={s.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setScenario(s.id);
              }}
              style={[
                styles.scenarioCard,
                scenario === s.id && {
                  borderColor: s.color + "60",
                  backgroundColor: s.color + "10",
                },
              ]}
            >
              <View style={[styles.scenarioIcon, { backgroundColor: s.color + "20" }]}>
                <MaterialCommunityIcons name={s.icon} size={24} color={s.color} />
              </View>
              <View style={styles.scenarioText}>
                <Text style={styles.scenarioTitle}>{s.title}</Text>
                <Text style={styles.scenarioDesc}>{s.description}</Text>
              </View>
              {scenario === s.id && (
                <View style={[styles.activeChip, { backgroundColor: s.color }]}>
                  <Text style={styles.activeText}>ACTIVE</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Statistics</Text>

          <View style={styles.statsGrid}>
            <StatBox label="Total Events" value={alertStats.total} color={Colors.text} />
            <StatBox label="Critical" value={alertStats.critical} color={Colors.critical} />
            <StatBox label="High" value={alertStats.high} color={Colors.high} />
            <StatBox label="Medium" value={alertStats.medium} color={Colors.medium} />
          </View>

          <Pressable style={styles.clearBtn} onPress={handleClearHistory}>
            <Feather name="trash-2" size={14} color={Colors.critical} />
            <Text style={styles.clearBtnText}>Clear History</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Stats</Text>
          {statsLoading && !anomalyStats ? (
            <View style={[styles.infoCard, { padding: 16, alignItems: "center" }]}>
              <Text style={{ fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular" }}>Loading stats...</Text>
            </View>
          ) : anomalyStats ? (
            <>
              <View style={styles.statsGrid}>
                <StatBox label="Total Readings" value={anomalyStats.totalReadings} color={Colors.text} />
                <StatBox label="Alerts Fired" value={anomalyStats.alertsFired} color={Colors.high} />
                <StatBox label="Critical Alerts" value={anomalyStats.criticalAlerts} color={Colors.critical} />
                <StatBox label="Devices Baselined" value={Object.keys(anomalyStats.baselineDevices).length} color={Colors.normal} />
              </View>
              <View style={styles.infoCard}>
                <InfoRow
                  label="False Alarm Rate"
                  value={anomalyStats.falseAlarmRate}
                  icon="activity"
                />
                <InfoRow
                  label="Last Calibrated"
                  value={anomalyStats.lastCalibrated
                    ? new Date(anomalyStats.lastCalibrated).toLocaleTimeString()
                    : "Not yet"}
                  icon="clock"
                />
              </View>
            </>
          ) : (
            <View style={[styles.infoCard, { padding: 16, alignItems: "center" }]}>
              <Text style={{ fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular" }}>Backend offline — stats unavailable</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Language</Text>
          <LanguageRow />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Preferences</Text>
          <View style={styles.infoCard}>
            <View style={[styles.infoRow, { paddingVertical: 14 }]}>
              <MaterialCommunityIcons name="volume-high" size={14} color={Colors.textMuted} />
              <Text style={[styles.infoLabel, { color: Colors.text }]}>Voice Alerts</Text>
              <Text style={[styles.infoValue, { color: Colors.textMuted, fontSize: 11 }]}>
                {voiceAlertsEnabled ? "On" : "Off"}
              </Text>
              <Switch
                value={voiceAlertsEnabled}
                onValueChange={handleVoiceToggle}
                trackColor={{ false: Colors.border, true: Colors.accent + "80" }}
                thumbColor={voiceAlertsEnabled ? Colors.accent : Colors.textMuted}
              />
            </View>
          </View>
          <Text style={[styles.sectionDesc, { marginTop: 2 }]}>
            Speaks the emergency alert aloud when CRITICAL severity is detected.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Management</Text>
          <View style={styles.infoCard}>
            <Pressable
              style={styles.infoRow}
              onPress={() => { Haptics.selectionAsync(); router.push("/emergency-contacts" as any); }}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="phone-alert" size={14} color={Colors.critical} />
              <Text style={[styles.infoLabel, { color: Colors.text }]}>Emergency Contacts</Text>
              <Feather name="chevron-right" size={14} color={Colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.infoRow}
              onPress={() => { Haptics.selectionAsync(); router.push("/device-intro"); }}
              accessibilityRole="button"
              accessibilityLabel="About our Hardware"
            >
              <MaterialCommunityIcons name="chip" size={14} color={Colors.accent} />
              <Text style={[styles.infoLabel, { color: Colors.text }]}>About our Hardware</Text>
              <Feather name="chevron-right" size={14} color={Colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.infoRow}
              onPress={() => { Haptics.selectionAsync(); router.push("/device-setup"); }}
              accessibilityRole="button"
              accessibilityLabel="Set up device"
            >
              <MaterialCommunityIcons name="qrcode-scan" size={14} color={Colors.accent} />
              <Text style={[styles.infoLabel, { color: Colors.text }]}>Manage Device</Text>
              <Feather name="chevron-right" size={14} color={Colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.infoRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert(
                  "Reset Device Setup",
                  "This will clear your device configuration. The setup wizard will run on next launch.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Reset",
                      style: "destructive",
                      onPress: async () => {
                        await AsyncStorage.multiRemove(["seen_device_intro", "device_configured"]);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        Alert.alert("Reset Complete", "Restart the app to run setup again.");
                      },
                    },
                  ]
                );
              }}
              accessibilityRole="button"
              accessibilityLabel="Reset device setup"
            >
              <MaterialCommunityIcons name="refresh" size={14} color={Colors.critical} />
              <Text style={[styles.infoLabel, { color: Colors.critical }]}>Reset Device Setup</Text>
              <Feather name="chevron-right" size={14} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Info</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Platform" value="UnifyOS v1.0.0" icon="cpu" />
            <InfoRow label="Devices Monitored" value="1 Smart Panic Button (Main Lobby)" icon="radio" />
            <InfoRow label="Update Interval" value="2 seconds" icon="refresh-cw" />
            <InfoRow label="Detection Algorithm" value="Statistical Threshold + Rate of Change" icon="activity" />
            <InfoRow label="Max Confidence" value="100%" icon="percent" />
            <InfoRow label="Backend URL" value={ENV.BACKEND_URL} icon="server" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sensor Thresholds</Text>
          <View style={styles.infoCard}>
            <ThresholdRow sensor="Temperature" warn="35°C" alert="45°C" color={Colors.temp} />
            <ThresholdRow sensor="Smoke" warn="250 ppm" alert="400 ppm" color={Colors.smoke} />
            <ThresholdRow sensor="Temp Rate" warn="—" alert="+2°C/reading" color={Colors.high} />
            <ThresholdRow sensor="Smoke Rate" warn="—" alert="+100 ppm/reading" color={Colors.medium} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Numbers</Text>
          <View style={styles.infoCard}>
            <CallRow label="Emergency (112)" number="112" color={Colors.critical} />
            <CallRow label="Police (101)" number="101" color={Colors.high} />
            <CallRow label="Fire & Rescue (102)" number="102" color={Colors.medium} />
          </View>
        </View>

        <View style={[styles.section, styles.aboutCard]}>
          <View style={styles.aboutHeader}>
            <MaterialCommunityIcons name="shield-check" size={36} color={Colors.accent} />
            <View>
              <Text style={styles.aboutTitle}>UnifyOS {ENV.APP_VERSION}</Text>
              <Text style={styles.aboutSubtitle}>Real-time Crisis Coordination Platform</Text>
            </View>
          </View>
          <Text style={styles.aboutDesc}>Built for Google Solution Challenge 2026</Text>
          <View style={styles.sdgRow}>
            {["SDG 3", "SDG 9", "SDG 11"].map(s => (
              <View key={s} style={styles.sdgChip}><Text style={styles.sdgText}>{s}</Text></View>
            ))}
          </View>
          <Text style={styles.teamText}>Team BlackBit · Asna Mirza · Sadia Peerzada</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const LANG_OPTIONS = [
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "hi", flag: "🇮🇳", name: "Hindi" },
  { code: "ur", flag: "🇵🇰", name: "Urdu" },
  { code: "ar", flag: "🇸🇦", name: "Arabic" },
  { code: "fr", flag: "🇫🇷", name: "French" },
];

function LanguageRow() {
  const [selectedLang, setSelectedLang] = React.useState("en");
  const [showPicker, setShowPicker] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem("unifyos_language").then(l => { if (l) setSelectedLang(l); });
  }, []);

  function select(code: string) {
    setSelectedLang(code);
    AsyncStorage.setItem("unifyos_language", code);
    Haptics.selectionAsync();
    setShowPicker(false);
  }

  const current = LANG_OPTIONS.find(l => l.code === selectedLang);

  return (
    <>
      <View style={styles.infoCard}>
        <Pressable
          style={styles.infoRow}
          onPress={() => setShowPicker(v => !v)}
        >
          <Text style={{ fontSize: 14 }}>{current?.flag}</Text>
          <Text style={[styles.infoLabel, { color: Colors.text }]}>Alert Language</Text>
          <Text style={[styles.infoValue, { color: Colors.accent }]}>{current?.name}</Text>
          <Feather name="chevron-right" size={14} color={Colors.textMuted} />
        </Pressable>
      </View>
      {showPicker && (
        <View style={[styles.infoCard, { marginTop: 4 }]}>
          {LANG_OPTIONS.map((l, i) => (
            <Pressable
              key={l.code}
              style={[styles.infoRow, i === LANG_OPTIONS.length - 1 && { borderBottomWidth: 0 }, selectedLang === l.code && { backgroundColor: Colors.accentGlow }]}
              onPress={() => select(l.code)}
            >
              <Text style={{ fontSize: 16 }}>{l.flag}</Text>
              <Text style={[styles.infoLabel, { color: Colors.text }]}>{l.name}</Text>
              {selectedLang === l.code && <Feather name="check" size={14} color={Colors.accent} />}
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon as any} size={14} color={Colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ThresholdRow({ sensor, warn, alert, color }: { sensor: string; warn: string; alert: string; color: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.threshDot, { backgroundColor: color }]} />
      <Text style={styles.infoLabel}>{sensor}</Text>
      <View style={styles.threshValues}>
        <Text style={[styles.threshWarn, { color: Colors.high }]}>{warn}</Text>
        <Text style={[styles.threshAlert, { color: Colors.critical }]}>{alert}</Text>
      </View>
    </View>
  );
}

function CallRow({ label, number, color }: { label: string; number: string; color: string }) {
  return (
    <Pressable style={styles.infoRow} onPress={() => Linking.openURL(`tel:${number}`)}>
      <MaterialCommunityIcons name="phone" size={14} color={color} />
      <Text style={[styles.infoLabel, { color: Colors.text }]}>{label}</Text>
      <View style={[styles.callChip, { backgroundColor: color + "20", borderColor: color + "50" }]}>
        <Text style={[styles.callText, { color }]}>Call</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  sectionDesc: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular", lineHeight: 18 },
  scenarioCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  scenarioIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  scenarioText: { flex: 1, gap: 3 },
  scenarioTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  scenarioDesc: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular", lineHeight: 16 },
  activeChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeText: { fontSize: 9, color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  statsGrid: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_400Regular", textAlign: "center" },
  clearBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.criticalBorder,
    backgroundColor: Colors.criticalBg, paddingVertical: 10,
  },
  clearBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.critical },
  infoCard: {
    backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.border, overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  infoLabel: { flex: 1, fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 12, color: Colors.text, fontFamily: "Inter_500Medium", maxWidth: "50%", textAlign: "right" },
  threshDot: { width: 8, height: 8, borderRadius: 4 },
  threshValues: { flexDirection: "row", gap: 8 },
  threshWarn: { fontSize: 11, fontFamily: "Inter_500Medium" },
  threshAlert: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  callChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  callText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  aboutCard: {
    backgroundColor: Colors.bgCard, borderRadius: 18, borderWidth: 1,
    borderColor: Colors.accentGlow, padding: 18,
  },
  aboutHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  aboutTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  aboutSubtitle: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  aboutDesc: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  sdgRow: { flexDirection: "row", gap: 8 },
  sdgChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.accent + "40",
  },
  sdgText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.accentLight },
  teamText: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
});
