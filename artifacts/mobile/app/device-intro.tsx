import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import Svg, { Rect, Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
import { useDashboard } from "@/context/DashboardContext";

const COMPONENT_CARDS = [
  { emoji: "🔧", title: "ESP32", desc: "The brain. WiFi built-in, processes all sensor data." },
  { emoji: "💨", title: "MQ-2", desc: "Detects smoke, LPG, CO & flammable gas." },
  { emoji: "🌡️", title: "DHT22", desc: "Monitors temperature & humidity in real time." },
  { emoji: "👁", title: "PIR", desc: "Tracks human occupancy and motion." },
  { emoji: "🚨", title: "Panic Button", desc: "One press — instant SOS to all staff." },
];

const SPECS = [
  { label: "⚡ <1 sec", sub: "Response" },
  { label: "💰 ₹3,200", sub: "Cost" },
  { label: "📶 WiFi", sub: "Connectivity" },
  { label: "🔋 Battery", sub: "Backup" },
];

function DeviceSvg({ tooltip, onPressRed, onPressPir, onPressLed }: {
  tooltip: string | null;
  onPressRed: () => void;
  onPressPir: () => void;
  onPressLed: () => void;
}) {
  return (
    <View style={svgStyles.container}>
      <Svg width={240} height={210} viewBox="0 0 240 210">
        {/* Top face (perspective parallelogram) */}
        <Polygon points="55,28 185,28 215,62 85,62" fill="#0D1B3E" stroke="#1A73E8" strokeWidth="1.2" />
        {/* SOS button on top face */}
        <Circle cx="190" cy="44" r="14" fill="#E53935" />
        <SvgText x="190" y="49" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">SOS</SvgText>
        {/* PIR dome on top face */}
        <Circle cx="100" cy="44" r="8" fill="#fff" opacity={0.75} />
        {/* Ventilation slots */}
        <Line x1="128" y1="36" x2="165" y2="36" stroke="#1A73E8" strokeWidth="1.5" opacity={0.5} />
        <Line x1="128" y1="43" x2="165" y2="43" stroke="#1A73E8" strokeWidth="1.5" opacity={0.5} />
        <Line x1="128" y1="50" x2="165" y2="50" stroke="#1A73E8" strokeWidth="1.5" opacity={0.5} />

        {/* Front face */}
        <Rect x="55" y="62" width="130" height="118" rx="6" fill="#142552" stroke="#1A73E8" strokeWidth="1" />

        {/* Screen / label area */}
        <Rect x="70" y="76" width="100" height="34" rx="5" fill="#0A1628" opacity={0.7} />
        <SvgText x="120" y="98" textAnchor="middle" fontSize="9" fill="#1A73E8" fontWeight="bold">UnifyOS-001</SvgText>

        {/* LEDs with labels */}
        <Circle cx="90" cy="158" r="6" fill="#E53935" />
        <SvgText x="90" y="175" textAnchor="middle" fontSize="7" fill="#E53935">Alert</SvgText>
        <Circle cx="120" cy="158" r="6" fill="#00C853" />
        <SvgText x="120" y="175" textAnchor="middle" fontSize="7" fill="#00C853">OK</SvgText>
        <Circle cx="150" cy="158" r="6" fill="#1A73E8" />
        <SvgText x="150" y="175" textAnchor="middle" fontSize="7" fill="#1A73E8">Help</SvgText>

        {/* Buzzer */}
        <Circle cx="172" cy="158" r="5" fill="#111" />

        {/* Right side face */}
        <Polygon points="185,62 215,62 215,148 185,180" fill="#0A1628" stroke="#1A73E8" strokeWidth="0.5" opacity={0.85} />
        {/* USB port on right */}
        <Rect x="194" y="102" width="13" height="7" rx="1.5" fill="#333" />
      </Svg>

      {/* Tap overlays */}
      <Pressable
        style={[svgStyles.tap, { top: 26, left: 173, width: 34, height: 34 }]}
        onPress={onPressRed}
        accessibilityLabel="SOS button info"
        accessibilityRole="button"
      />
      <Pressable
        style={[svgStyles.tap, { top: 26, left: 84, width: 24, height: 24 }]}
        onPress={onPressPir}
        accessibilityLabel="PIR sensor info"
        accessibilityRole="button"
      />
      <Pressable
        style={[svgStyles.tap, { top: 146, left: 74, width: 96, height: 26 }]}
        onPress={onPressLed}
        accessibilityLabel="LED status info"
        accessibilityRole="button"
      />

      {tooltip && (
        <View style={svgStyles.tooltip}>
          <Text style={svgStyles.tooltipText}>{tooltip}</Text>
        </View>
      )}
    </View>
  );
}

const svgStyles = StyleSheet.create({
  container: { alignItems: "center", position: "relative" },
  tap: { position: "absolute", backgroundColor: "transparent" },
  tooltip: {
    position: "absolute",
    bottom: -40,
    alignSelf: "center",
    backgroundColor: "#1A73E8",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxWidth: 270,
  },
  tooltipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#fff",
    textAlign: "center",
  },
});

async function navigateAfterIntro() {
  const configured = await AsyncStorage.getItem("device_configured");
  if (!configured) {
    router.replace("/device-setup");
  } else {
    router.replace("/(tabs)/dashboard");
  }
}

export default function DeviceIntroScreen() {
  const insets = useSafeAreaInsets();
  const { devices, getDeviceSensorData } = useDashboard();
  const rockAnim = useRef(new Animated.Value(0)).current;
  const [tooltip, setTooltip] = useState<string | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const device = devices[0];
  const sensorData = device ? getDeviceSensorData(device.id) : undefined;

  const tempStatus = (sensorData?.temperature ?? 24) > 45
    ? { label: "Critical", color: "#EF4444" }
    : (sensorData?.temperature ?? 24) > 35
    ? { label: "Elevated", color: "#F59E0B" }
    : { label: "Normal", color: "#22C55E" };

  const smokeStatus = (sensorData?.smoke ?? 130) > 400
    ? { label: "Danger", color: "#EF4444" }
    : (sensorData?.smoke ?? 130) > 250
    ? { label: "Warning", color: "#F59E0B" }
    : { label: "Normal", color: "#22C55E" };

  const lastConnected = device
    ? new Date(device.lastSeen).toLocaleTimeString()
    : "Not connected";

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rockAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(rockAnim, { toValue: -1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  const rockRotate = rockAnim.interpolate({ inputRange: [-1, 1], outputRange: ["-3deg", "3deg"] });

  function showTooltip(msg: string) {
    setTooltip(msg);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2200);
  }

  async function handleDone() {
    await AsyncStorage.setItem("seen_device_intro", "true");
    await navigateAfterIntro();
  }

  async function handleSkip() {
    await AsyncStorage.setItem("seen_device_intro", "true");
    await AsyncStorage.setItem("device_configured", "true");
    router.replace("/(tabs)/dashboard");
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Meet UnifyOS</Text>
          <Text style={styles.mainSubtitle}>Your Smart Crisis Response Device</Text>
        </View>

        {/* Animated device */}
        <View style={styles.deviceSection}>
          <Animated.View style={{ transform: [{ rotate: rockRotate }] }}>
            <DeviceSvg
              tooltip={tooltip}
              onPressRed={() => showTooltip("🚨 Panic Button — Alerts all staff instantly")}
              onPressPir={() => showTooltip("👁 PIR Sensor — Detects occupancy and motion")}
              onPressLed={() => showTooltip("💡 Red=Alert, Green=Safe, Blue=Help Coming")}
            />
          </Animated.View>
          <Text style={styles.deviceHint}>Tap parts of the device to learn more</Text>
        </View>

        {/* Component cards */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>Components</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
            {COMPONENT_CARDS.map(c => (
              <View key={c.title} style={styles.card}>
                <Text style={styles.cardEmoji}>{c.emoji}</Text>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardDesc}>{c.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* How it works */}
        <View style={styles.flowSection}>
          <Text style={styles.sectionLabel}>How it Works</Text>
          <View style={styles.flowRow}>
            {[
              { icon: "🔍", label: "Detect" },
              { icon: "📡", label: "Send" },
              { icon: "🤖", label: "AI" },
              { icon: "📱", label: "Alert" },
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <View style={styles.flowStep}>
                  <Text style={styles.flowEmoji}>{step.icon}</Text>
                  <Text style={styles.flowLabel}>{step.label}</Text>
                </View>
                {i < arr.length - 1 && (
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#1A73E8" style={{ marginBottom: 14 }} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Specs */}
        <View style={styles.specsRow}>
          {SPECS.map((s, i) => (
            <View key={i} style={[styles.specItem, i < SPECS.length - 1 && { borderRightWidth: 1, borderRightColor: "#1A73E820" }]}>
              <Text style={styles.specLabel}>{s.label}</Text>
              <Text style={styles.specSub}>{s.sub}</Text>
            </View>
          ))}
        </View>

        {/* Live Hardware Status */}
        <View style={styles.liveSection}>
          <Text style={styles.sectionLabel}>Live Hardware Status</Text>
          <View style={styles.liveCard}>
            <View style={styles.liveRow}>
              <Text style={styles.liveLabel}>Device Name</Text>
              <Text style={styles.liveValue}>{device?.name ?? "UnifyOS-001"}</Text>
            </View>
            <View style={styles.liveRow}>
              <Text style={styles.liveLabel}>Firmware</Text>
              <Text style={styles.liveValue}>v1.0.0</Text>
            </View>
            <View style={styles.liveRow}>
              <Text style={styles.liveLabel}>Last Connected</Text>
              <Text style={styles.liveValue}>{lastConnected}</Text>
            </View>
            <View style={styles.liveRow}>
              <Text style={styles.liveLabel}>Connection</Text>
              <Text style={[styles.liveValue, { color: device ? "#22C55E" : "#F59E0B" }]}>
                {device ? "WiFi" : "Not paired"}
              </Text>
            </View>
            <View style={styles.liveDivider} />
            <View style={styles.liveRow}>
              <Text style={styles.liveLabel}>Temperature</Text>
              <Text style={[styles.liveValue, { color: tempStatus.color }]}>
                {sensorData ? `${sensorData.temperature.toFixed(1)}°C` : "—"}
                {"  "}
                <Text style={{ fontSize: 11 }}>{tempStatus.label}</Text>
              </Text>
            </View>
            <View style={styles.liveRow}>
              <Text style={styles.liveLabel}>Smoke (MQ-2)</Text>
              <Text style={[styles.liveValue, { color: smokeStatus.color }]}>
                {sensorData ? `${Math.round(sensorData.smoke)} ppm` : "—"}
                {"  "}
                <Text style={{ fontSize: 11 }}>{smokeStatus.label}</Text>
              </Text>
            </View>
            <View style={styles.liveRow}>
              <Text style={styles.liveLabel}>Motion (PIR)</Text>
              <Text style={styles.liveValue}>
                {sensorData ? (sensorData.motion > 0 ? "Detected" : "Clear") : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* CTA buttons */}
        <TouchableOpacity style={styles.gotItBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.gotItText}>Got it, let's go →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1B3E" },
  scroll: { flex: 1 },
  content: { padding: 24, gap: 28, alignItems: "center" },
  headerSection: { alignItems: "center", gap: 6 },
  mainTitle: {
    fontSize: 32, fontFamily: "Inter_700Bold", color: "#FFFFFF",
    letterSpacing: -0.8, textAlign: "center",
  },
  mainSubtitle: {
    fontSize: 15, fontFamily: "Inter_400Regular", color: "#8B9EC5", textAlign: "center",
  },
  deviceSection: { alignItems: "center", gap: 12, paddingBottom: 44 },
  deviceHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8B9EC5", textAlign: "center", marginTop: 10 },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8B9EC5",
    textTransform: "uppercase", letterSpacing: 0.6, alignSelf: "flex-start", marginBottom: 4,
  },
  cardSection: { width: "100%", gap: 4 },
  cardsRow: { gap: 10, paddingBottom: 4 },
  card: {
    width: 140, backgroundColor: "#142552", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#1A73E820", gap: 6,
  },
  cardEmoji: { fontSize: 26 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  cardDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8B9EC5", lineHeight: 16 },
  flowSection: { width: "100%", gap: 10 },
  flowRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    backgroundColor: "#142552", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#1A73E820", gap: 4,
  },
  flowStep: { alignItems: "center", gap: 6 },
  flowEmoji: { fontSize: 24 },
  flowLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#FFFFFF" },
  specsRow: {
    flexDirection: "row", width: "100%",
    backgroundColor: "#142552", borderRadius: 14,
    borderWidth: 1, borderColor: "#1A73E820", overflow: "hidden",
  },
  specItem: { flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, gap: 2 },
  specLabel: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center" },
  specSub: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#8B9EC5", textAlign: "center" },
  gotItBtn: {
    width: "100%", backgroundColor: "#1A73E8", borderRadius: 16,
    paddingVertical: 16, alignItems: "center",
  },
  gotItText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  skipBtn: { paddingVertical: 8, alignItems: "center" },
  skipText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#8B9EC5" },
  liveSection: { width: "100%", gap: 8 },
  liveCard: {
    width: "100%", backgroundColor: "#142552", borderRadius: 14,
    borderWidth: 1, borderColor: "#1A73E820", overflow: "hidden",
  },
  liveRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#1A73E815",
  },
  liveLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8B9EC5" },
  liveValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", textAlign: "right" },
  liveDivider: { height: 1, backgroundColor: "#1A73E830", marginHorizontal: 14 },
});
