import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";

const FEATURES = [
  {
    icon: "thermometer-alert" as const,
    title: "Temperature Monitoring",
    desc: "Tracks ambient temperature and triggers alerts when readings exceed 45°C or spike rapidly — a key fire indicator.",
    color: Colors.temp,
  },
  {
    icon: "smoke" as const,
    title: "Smoke Detection",
    desc: "Monitors smoke/gas levels in PPM. Flags sustained readings above 400 ppm and sudden spikes as potential fire or gas leak events.",
    color: Colors.smoke,
  },
  {
    icon: "motion-sensor" as const,
    title: "Occupancy Tracking",
    desc: "PIR motion sensors detect room occupancy in real time. Sudden evacuation patterns during a fire event are automatically flagged.",
    color: Colors.motion,
  },
  {
    icon: "alert-decagram" as const,
    title: "Smart Panic Button",
    desc: "Physical panic buttons trigger immediate alerts. Cross-referenced with sensor data to compute confidence and filter false alarms.",
    color: Colors.button,
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Sensors collect data", desc: "Smart panic buttons send temperature, smoke, motion, and button press data every 2 seconds over WiFi + MQTT." },
  { step: "2", title: "Anomaly detection runs", desc: "The backend engine analyzes threshold breaches, rate-of-change spikes, and sustained anomalies using a scoring algorithm." },
  { step: "3", title: "Confidence is scored", desc: "Each event receives a 0–100% confidence score based on how many sensors agree, preventing false alarms." },
  { step: "4", title: "Staff are alerted", desc: "Real-time alerts are dispatched with severity levels — MEDIUM, HIGH, or CRITICAL — along with recommended actions." },
];

const ALERT_LEVELS = [
  { label: "CRITICAL", color: Colors.critical, bg: Colors.criticalBg, border: Colors.criticalBorder, desc: "Evacuate immediately. 80%+ confidence. Multiple sensors agree.", action: "EVACUATE" },
  { label: "HIGH", color: Colors.high, bg: Colors.highBg, border: Colors.highBorder, desc: "Alert staff. 50–79% confidence. Investigate now.", action: "ALERT STAFF" },
  { label: "MEDIUM", color: Colors.medium, bg: Colors.mediumBg, border: Colors.mediumBorder, desc: "Monitor closely. 20–49% confidence. Unusual activity.", action: "MONITOR" },
  { label: "NORMAL", color: Colors.normal, bg: Colors.normalBg, border: Colors.normalBorder, desc: "All sensors within expected ranges. No action needed.", action: "ALL CLEAR" },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.logoIcon}>
            <MaterialCommunityIcons name="shield-alert" size={20} color={Colors.accent} />
          </View>
          <Text style={styles.topBarTitle}>About UnifyOS</Text>
        </View>
        <Pressable style={styles.dashboardBtn} onPress={() => router.replace("/(tabs)/dashboard")}>
          <MaterialCommunityIcons name="gauge" size={15} color="#fff" />
          <Text style={styles.dashboardBtnText}>Dashboard</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroHeadline}>
            Real-Time Emergency{"\n"}Detection & Response
          </Text>
          <Text style={styles.heroDesc}>
            UnifyOS connects smart IoT panic buttons to a live crisis dashboard, using anomaly detection algorithms to identify fire, smoke, and evacuation events — and alert responders in seconds.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <SectionHeader label="About" title="What is UnifyOS?" />
          <Text style={styles.bodyText}>
            UnifyOS is an IoT-powered crisis coordination platform designed to give facilities teams and emergency responders real-time situational awareness during fire, smoke, or evacuation events.
          </Text>
          <Text style={styles.bodyText}>
            The system combines four types of sensor data — temperature, smoke concentration, motion/occupancy, and physical panic button presses — and runs them through an anomaly detection engine that scores each event's confidence and dispatches tiered alerts.
          </Text>
          <Text style={styles.bodyText}>
            Built with a Node.js backend, React Native mobile dashboard, and a custom statistical detection algorithm, UnifyOS targets the critical gap between smoke detector alarms and confirmed, high-confidence emergency events.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <SectionHeader label="Sensors" title="4 Sensor Inputs" />
          {FEATURES.map(f => (
            <View key={f.title} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + "18" }]}>
                <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <SectionHeader label="Detection Engine" title="How It Works" />
          {HOW_IT_WORKS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step.step}</Text>
              </View>
              {i < HOW_IT_WORKS.length - 1 && <View style={styles.stepLine} />}
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <SectionHeader label="Alert System" title="Severity Levels" />
          {ALERT_LEVELS.map(a => (
            <View key={a.label} style={[styles.alertLevelCard, { backgroundColor: a.bg, borderColor: a.border }]}>
              <View style={styles.alertLevelLeft}>
                <View style={[styles.alertLevelBadge, { backgroundColor: a.color }]}>
                  <Text style={styles.alertLevelBadgeText}>{a.label}</Text>
                </View>
                <Text style={[styles.alertLevelAction, { color: a.color }]}>{a.action}</Text>
              </View>
              <Text style={styles.alertLevelDesc}>{a.desc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <SectionHeader label="Tech Stack" title="Built With" />
          <View style={styles.stackGrid}>
            {[
              { name: "React Native", sub: "Mobile App", icon: "cellphone" },
              { name: "Expo Router", sub: "Navigation", icon: "routes" },
              { name: "Node.js", sub: "Backend API", icon: "server" },
              { name: "PostgreSQL", sub: "Data Storage", icon: "database" },
              { name: "Drizzle ORM", sub: "Schema", icon: "table" },
              { name: "Gemini AI", sub: "Incident AI", icon: "robot-outline" },
            ].map(s => (
              <View key={s.name} style={styles.stackChip}>
                <MaterialCommunityIcons name={s.icon as any} size={18} color={Colors.accent} />
                <Text style={styles.stackName}>{s.name}</Text>
                <Text style={styles.stackSub}>{s.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.footer}>
          <View style={styles.logoIconLarge}>
            <MaterialCommunityIcons name="shield-alert" size={24} color={Colors.accent} />
          </View>
          <Text style={styles.footerName}>UnifyOS</Text>
          <Text style={styles.footerSub}>Crisis Coordination Platform v1.0</Text>
          <View style={styles.sdgRow}>
            {["SDG 3", "SDG 9", "SDG 11"].map(s => (
              <View key={s} style={styles.sdgChip}><Text style={styles.sdgText}>{s}</Text></View>
            ))}
          </View>
          <Text style={styles.teamText}>Team BlackBit · Google Solution Challenge 2026</Text>
          <Pressable style={styles.goToDashBtn} onPress={() => router.replace("/(tabs)/dashboard")}>
            <MaterialCommunityIcons name="gauge" size={16} color="#fff" />
            <Text style={styles.goToDashText}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: Colors.accent + "40",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -0.3 },
  dashboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dashboardBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  scroll: { flex: 1 },
  scrollContent: { gap: 0 },
  hero: { padding: 24, paddingTop: 20, gap: 12 },
  heroHeadline: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -0.8, lineHeight: 34 },
  heroDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 22 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 24 },
  section: { padding: 24, gap: 14 },
  sectionHeader: { gap: 4, marginBottom: 4 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.accent, letterSpacing: 1.5 },
  sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -0.4 },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 22 },
  featureCard: {
    flexDirection: "row", gap: 14, backgroundColor: Colors.bgCard,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  featureText: { flex: 1, gap: 4 },
  featureTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  featureDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 18 },
  stepRow: { flexDirection: "row", gap: 14, position: "relative" },
  stepNum: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.accent + "50", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1,
  },
  stepNumText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.accent },
  stepLine: { position: "absolute", left: 15, top: 32, bottom: -14, width: 2, backgroundColor: Colors.border },
  stepContent: { flex: 1, paddingBottom: 16, gap: 4 },
  stepTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  stepDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 18 },
  alertLevelCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  alertLevelLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  alertLevelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  alertLevelBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
  alertLevelAction: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  alertLevelDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 18 },
  stackGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stackChip: {
    width: "30.5%", backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 6,
  },
  stackName: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.text, textAlign: "center" },
  stackSub: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  footer: { padding: 24, alignItems: "center", gap: 10 },
  logoIconLarge: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.accentGlow,
    borderWidth: 1, borderColor: Colors.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  footerName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  footerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  sdgRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  sdgChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.accent + "30" },
  sdgText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.accent },
  teamText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  goToDashBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
  },
  goToDashText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
