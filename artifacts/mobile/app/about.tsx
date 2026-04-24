import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useDashboard } from "@/context/DashboardContext";
import { ENV } from "@/config/env";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { isLive } = useDashboard();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <MaterialCommunityIcons name="shield-check" size={24} color={Colors.accentLight} />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandTitle}>UnifyOS</Text>
              <Text style={styles.brandSubtitle}>Crisis Coordination Platform</Text>
            </View>
            <View style={[styles.liveChip, { borderColor: isLive ? Colors.normalBorder : Colors.border, backgroundColor: isLive ? Colors.normalBg : "transparent" }]}>
              <View style={[styles.liveDot, { backgroundColor: isLive ? Colors.normal : Colors.textMuted }]} />
              <Text style={[styles.liveText, { color: isLive ? Colors.normal : Colors.textMuted }]}>
                {isLive ? "LIVE" : "OFFLINE"}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Real-Time Emergency Detection & Response</Text>
          <Text style={styles.heroDesc}>
            UnifyOS connects smart IoT panic buttons to a live crisis dashboard, using anomaly
            detection algorithms to identify fire, smoke, and evacuation events — and alert
            responders in seconds.
          </Text>

          <Pressable
            style={styles.ctaBtn}
            onPress={() => router.replace("/(tabs)/dashboard")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="view-dashboard" size={18} color="#fff" />
            <Text style={styles.ctaText}>Go to Dashboard</Text>
          </Pressable>
        </View>

        <Section tag="ABOUT" title="What is UnifyOS?">
          <Text style={styles.body}>
            UnifyOS is an IoT-powered crisis coordination platform designed to give facilities
            teams and emergency responders real-time situational awareness during fire, smoke,
            or evacuation events.
          </Text>
          <Text style={styles.body}>
            The system combines five types of sensor data — temperature, smoke concentration,
            motion/occupancy, direct flame detection, and physical panic button presses — and
            runs them through an anomaly detection engine that scores each event's confidence
            and dispatches tiered alerts.
          </Text>
          <Text style={styles.body}>
            Built with a Node.js backend, React Native mobile dashboard, and a custom
            statistical detection algorithm, UnifyOS targets the critical gap between smoke
            alarms and full-scale emergency response.
          </Text>
        </Section>

        <Section tag="WHY IT MATTERS" title="Saving Lives, Faster">
          <Text style={styles.body}>
            Every second matters in a fire or evacuation emergency. Traditional alarm systems
            tell you something is wrong — but not where, not how serious, and not what to do.
            UnifyOS changes that entirely.
          </Text>

          <View style={styles.statRow}>
            <StatBlock value="< 2s" label="Detection to alert" color={Colors.accentLight} />
            <StatBlock value="95%+" label="Confidence accuracy" color={Colors.accentLight} />
            <StatBlock value="5" label="Sensor types fused" color={Colors.accentLight} />
          </View>

          <Text style={styles.body}>
            By fusing five independent sensor streams and applying AI-assisted confidence
            scoring, UnifyOS ensures that when an alert fires, it is real. Responders arrive
            with full situational context — temperature levels, smoke concentration, occupancy
            status, flame presence, and panic activity — before they even reach the scene.
          </Text>
          <Text style={styles.body}>
            For schools, clinics, factories, and public buildings that cannot afford enterprise
            safety infrastructure, UnifyOS delivers professional-grade protection at a fraction
            of the cost — giving every occupant the best possible chance of getting out safely.
          </Text>

          <View style={styles.calloutCard}>
            <MaterialCommunityIcons name="heart-pulse" size={18} color={Colors.critical} />
            <Text style={styles.calloutText}>
              Designed to protect the people most at risk — in the places most often overlooked.
            </Text>
          </View>
        </Section>

        <Section tag="SENSORS" title="5 Sensor Inputs">
          <SensorCard
            icon="thermometer"
            color={Colors.temp}
            title="Temperature Monitoring"
            desc="Tracks ambient temperature and triggers alerts when readings exceed 45°C or spike rapidly — a key fire indicator."
          />
          <SensorCard
            icon="camera-iris"
            color={Colors.smoke}
            title="Smoke Detection"
            desc="Monitors smoke/gas levels in PPM. Flags sustained readings above 400 ppm and sudden spikes as potential fire or gas leak events."
          />
          <SensorCard
            icon="run-fast"
            color={Colors.motion}
            title="Occupancy Tracking"
            desc="PIR motion sensors detect room occupancy in real time. Sudden evacuation patterns during a fire event are automatically flagged."
          />
          <SensorCard
            icon="alert-decagram"
            color={Colors.critical}
            title="Smart Panic Button"
            desc="Physical panic buttons trigger immediate alerts. Cross-referenced with sensor data to compute confidence and filter false alarms."
          />
          <SensorCard
            icon="fire"
            color={Colors.high}
            title="Flame Detection"
            desc="Infrared flame sensor provides direct fire detection at up to 1 m range. Triggers instantly on open flame presence — independent of smoke or temperature thresholds."
          />
        </Section>

        <Section tag="DETECTION ENGINE" title="How It Works">
          <Step
            n={1}
            title="Sensors collect data"
            desc="5 sensors — temperature, smoke, motion, flame detection, and panic button — send data every 2 seconds over WiFi + MQTT."
          />
          <Step
            n={2}
            title="Anomaly detection runs"
            desc="The backend engine analyzes threshold breaches, rate-of-change spikes, and sustained anomalies using a scoring algorithm."
          />
          <Step
            n={3}
            title="Confidence is scored"
            desc="Each event receives a 0–100% confidence score based on how many sensors agree, preventing false alarms."
          />
          <Step
            n={4}
            title="Staff are alerted"
            desc="Real-time alerts are dispatched with severity levels — MEDIUM, HIGH, or CRITICAL — along with recommended actions."
          />
        </Section>

        <Section tag="ALERT SYSTEM" title="Severity Levels">
          <SeverityCard
            level="CRITICAL"
            action="EVACUATE"
            desc="Evacuate immediately. 80%+ confidence. Multiple sensors agree."
            color={Colors.critical}
          />
          <SeverityCard
            level="HIGH"
            action="ALERT STAFF"
            desc="Alert staff. 50–79% confidence. Investigate now."
            color={Colors.high}
          />
          <SeverityCard
            level="MEDIUM"
            action="MONITOR"
            desc="Monitor closely. 20–49% confidence. Unusual activity."
            color={Colors.medium}
          />
          <SeverityCard
            level="NORMAL"
            action="ALL CLEAR"
            desc="All sensors within expected ranges. No action needed."
            color={Colors.normal}
          />
        </Section>

        <Section tag="CONFIDENCE SCORING" title="How Confidence Works">
          <Text style={styles.body}>
            Every alert is assigned a confidence score (0–100%) based on which sensors are
            triggering and how strongly:
          </Text>

          <View style={styles.infoCard}>
            <ScoreRow label="Temperature > 45°C" score="+30%" />
            <ScoreRow label="Temperature rising fast" score="+20%" />
            <ScoreRow label="Smoke > 400 ppm" score="+30%" />
            <ScoreRow label="Smoke spiking rapidly" score="+20%" />
            <ScoreRow label="Panic button pressed" score="+15%" />
            <ScoreRow label="Multiple sensors agree" score="+5%" />
            <ScoreRow label="Sustained anomaly (3+ readings)" score="+5%" last />
          </View>

          <Text style={[styles.tag, { marginTop: 8 }]}>EXAMPLE SCORES</Text>

          <View style={styles.infoCard}>
            <ExampleRow
              title="Only panic button pressed"
              sub="Possible false alarm"
              score="15%"
              color={Colors.textSecondary}
            />
            <ExampleRow
              title="Button + high temperature"
              sub="Likely real"
              score="45%"
              color={Colors.medium}
            />
            <ExampleRow
              title="Button + temp + smoke"
              sub="Very likely emergency"
              score="75%"
              color={Colors.high}
            />
            <ExampleRow
              title="Temp high + smoke high"
              sub="Near-certain fire"
              score="80%"
              color={Colors.critical}
            />
            <ExampleRow
              title="All 4 sensors + rate spikes"
              sub="DEFINITELY FIRE"
              score="95%+"
              color={Colors.critical}
              last
            />
          </View>
        </Section>

        <Section tag="TECH STACK" title="Built With">
          <View style={styles.techGrid}>
            <TechCard icon="cellphone" title="React Native" sub="Mobile App" />
            <TechCard icon="navigation-variant" title="Expo Router" sub="Navigation" />
            <TechCard icon="layers" title="Node.js" sub="Backend API" />
            <TechCard icon="database" title="PostgreSQL" sub="Data Storage" />
            <TechCard icon="view-grid" title="Drizzle ORM" sub="Schema" />
            <TechCard icon="access-point" title="MQTT / HTTP" sub="IoT Protocol" />
          </View>
        </Section>

        <View style={styles.footerCard}>
          <View style={styles.footerIcon}>
            <MaterialCommunityIcons name="shield-check" size={28} color={Colors.accentLight} />
          </View>
          <Text style={styles.footerTitle}>UnifyOS</Text>
          <Text style={styles.footerSub}>Crisis Coordination Platform v{ENV.APP_VERSION}</Text>
          <Text style={styles.footerDesc}>
            Designed for facilities teams, security staff, and emergency responders who need
            real-time situational awareness during critical events.
          </Text>
          <View style={styles.sdgList}>
            {["SDG 3", "SDG 9", "SDG 10", "SDG 11"].map(s => (
              <Text key={s} style={styles.sdgListItem}>{s}</Text>
            ))}
          </View>
          <Text style={styles.footerTeam}>Team BlackBit · Google Solution Challenge 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ tag, title, children }: { tag: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.tag}>{tag}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatBlock({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SensorCard({
  icon,
  color,
  title,
  desc,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.sensorCard}>
      <View style={[styles.sensorIcon, { backgroundColor: color + "22" }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.sensorText}>
        <Text style={styles.sensorTitle}>{title}</Text>
        <Text style={styles.sensorDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepCircle}>
        <Text style={styles.stepNum}>{n}</Text>
      </View>
      <View style={styles.stepText}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function SeverityCard({ level, action, desc, color }: { level: string; action: string; desc: string; color: string }) {
  return (
    <View style={[styles.severityCard, { backgroundColor: color + "10", borderColor: color + "40" }]}>
      <View style={styles.severityHeader}>
        <View style={[styles.levelChip, { backgroundColor: color + "30", borderColor: color + "50" }]}>
          <Text style={[styles.levelText, { color }]}>{level}</Text>
        </View>
        <Text style={[styles.actionText, { color }]}>{action}</Text>
      </View>
      <Text style={styles.severityDesc}>{desc}</Text>
    </View>
  );
}

function ScoreRow({ label, score, last }: { label: string; score: string; last?: boolean }) {
  return (
    <View style={[styles.scoreRow, !last && styles.rowDivider]}>
      <Feather name="plus-circle" size={14} color={Colors.accent} />
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{score}</Text>
    </View>
  );
}

function ExampleRow({ title, sub, score, color, last }: { title: string; sub: string; score: string; color: string; last?: boolean }) {
  return (
    <View style={[styles.exampleRow, !last && styles.rowDivider]}>
      <View style={styles.exampleText}>
        <Text style={styles.exampleTitle}>{title}</Text>
        <Text style={[styles.exampleSub, { color }]}>{sub}</Text>
      </View>
      <Text style={[styles.exampleScore, { color }]}>{score}</Text>
    </View>
  );
}

function TechCard({
  icon,
  title,
  sub,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  sub: string;
}) {
  return (
    <View style={styles.techCard}>
      <MaterialCommunityIcons name={icon} size={22} color={Colors.accentLight} />
      <Text style={styles.techTitle}>{title}</Text>
      <Text style={styles.techSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgCardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 24 },

  brandCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 14,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.accentGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { flex: 1 },
  brandTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  brandSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 1 },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, lineHeight: 30, letterSpacing: -0.5 },
  heroDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 19 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },

  section: { gap: 10 },
  tag: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accentLight,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 19 },

  statRow: { flexDirection: "row", gap: 8, marginVertical: 4 },
  statBlock: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },

  calloutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.criticalBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.criticalBorder,
    padding: 14,
    marginTop: 6,
  },
  calloutText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text, lineHeight: 17 },

  sensorCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  sensorIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sensorText: { flex: 1, gap: 4 },
  sensorTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  sensorDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 17 },

  stepRow: { flexDirection: "row", gap: 14, paddingVertical: 4 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.accentLight },
  stepText: { flex: 1, gap: 4 },
  stepTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  stepDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 17 },

  severityCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  severityHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelChip: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  levelText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  actionText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  severityDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 17 },

  infoCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  scoreLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text },
  scoreValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.normal },

  exampleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  exampleText: { flex: 1, gap: 2 },
  exampleTitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  exampleSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  exampleScore: { fontSize: 14, fontFamily: "Inter_700Bold" },

  techGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  techCard: {
    width: "31.5%",
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  techTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.text, textAlign: "center" },
  techSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },

  footerCard: {
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  footerIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.accentGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  footerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  footerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  footerDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  sdgList: { alignItems: "center", gap: 2, marginTop: 8 },
  sdgListItem: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  footerTeam: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 8,
  },
});
