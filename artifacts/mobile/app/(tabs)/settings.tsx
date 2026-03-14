import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useDashboard } from "@/context/DashboardContext";

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
  const { scenario, setScenario, alerts } = useDashboard();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const alertStats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === "CRITICAL").length,
    high: alerts.filter(a => a.severity === "HIGH").length,
    medium: alerts.filter(a => a.severity === "MEDIUM").length,
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Scenarios</Text>
        <Text style={styles.subtitle}>Simulate different emergency conditions</Text>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Info</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Platform" value="UnifyOS v1.0" icon="cpu" />
            <InfoRow label="Devices Monitored" value="4 Smart Panic Buttons" icon="radio" />
            <InfoRow label="Update Interval" value="2 seconds" icon="refresh-cw" />
            <InfoRow label="Detection Algorithm" value="Statistical Threshold + Rate of Change" icon="activity" />
            <InfoRow label="Max Confidence" value="100%" icon="percent" />
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
      </ScrollView>
    </View>
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
      <Text style={styles.infoValue}>{value}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  scenarioCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scenarioIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scenarioText: {
    flex: 1,
    gap: 3,
  },
  scenarioTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scenarioDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  activeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeText: {
    fontSize: 9,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  infoLabel: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
    maxWidth: "50%",
    textAlign: "right",
  },
  threshDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  threshValues: {
    flexDirection: "row",
    gap: 8,
  },
  threshWarn: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  threshAlert: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
