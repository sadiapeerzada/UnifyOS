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

const DEVICE_INTRO_KEY = "seen_device_intro";

const COMPONENT_CARDS = [
  { icon: "cpu-64-bit", emoji: "🔧", title: "ESP32", desc: "The brain. WiFi built-in." },
  { icon: "smoke-detector", emoji: "💨", title: "MQ-2", desc: "Detects smoke and gas." },
  { icon: "thermometer", emoji: "🌡️", title: "DHT22", desc: "Monitors temperature." },
  { icon: "motion-sensor", emoji: "👁", title: "PIR", desc: "Tracks occupancy." },
  { icon: "alert-decagram", emoji: "🚨", title: "Panic Button", desc: "Manual SOS trigger." },
];

const SPECS = [
  { label: "⚡ < 1 sec", sub: "Response" },
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
      <Svg width={220} height={200} viewBox="0 0 220 200">
        {/* Top face (parallelogram) */}
        <Polygon
          points="50,30 170,30 200,60 80,60"
          fill="#0D1B3E"
          stroke="#1A73E8"
          strokeWidth="1"
        />
        {/* SOS red circle on top face */}
        <Circle cx="175" cy="43" r="12" fill="#E53935" />
        <SvgText x="175" y="47" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="bold">SOS</SvgText>
        {/* PIR dome on top face */}
        <Circle cx="95" cy="43" r="6" fill="#fff" opacity={0.7} />
        {/* Ventilation lines on top face */}
        <Line x1="120" y1="38" x2="155" y2="38" stroke="#1A73E8" strokeWidth="1.5" opacity={0.5} />
        <Line x1="120" y1="43" x2="155" y2="43" stroke="#1A73E8" strokeWidth="1.5" opacity={0.5} />
        <Line x1="120" y1="48" x2="155" y2="48" stroke="#1A73E8" strokeWidth="1.5" opacity={0.5} />

        {/* Front face (main rectangle) */}
        <Rect x="50" y="60" width="120" height="110" rx="4" fill="#142552" stroke="#1A73E8" strokeWidth="1" />

        {/* LED row on front face */}
        <Circle cx="88" cy="155" r="5" fill="#E53935" />
        <Circle cx="110" cy="155" r="5" fill="#00C853" />
        <Circle cx="132" cy="155" r="5" fill="#1A73E8" />

        {/* Speaker on front */}
        <Circle cx="148" cy="155" r="4" fill="#111" />

        {/* UnifyOS logo area on front */}
        <Rect x="65" y="75" width="90" height="30" rx="4" fill="#0A1628" opacity={0.6} />
        <SvgText x="110" y="94" textAnchor="middle" fontSize="9" fill="#1A73E8" fontWeight="bold">UnifyOS-001</SvgText>

        {/* Right side face (parallelogram) */}
        <Polygon
          points="170,60 200,60 200,140 170,170"
          fill="#0A1628"
          stroke="#1A73E8"
          strokeWidth="0.5"
          opacity={0.8}
        />
        {/* USB port on right */}
        <Rect x="178" y="95" width="12" height="6" rx="1" fill="#333" />
      </Svg>

      {/* Tappable overlays */}
      <Pressable
        style={[svgStyles.tapTarget, { top: 28, left: 160, width: 30, height: 30 }]}
        onPress={onPressRed}
        accessibilityLabel="Tap SOS button for info"
        accessibilityRole="button"
      />
      <Pressable
        style={[svgStyles.tapTarget, { top: 28, left: 82, width: 20, height: 20 }]}
        onPress={onPressPir}
        accessibilityLabel="Tap PIR dome for info"
        accessibilityRole="button"
      />
      <Pressable
        style={[svgStyles.tapTarget, { top: 142, left: 72, width: 84, height: 22 }]}
        onPress={onPressLed}
        accessibilityLabel="Tap LEDs for info"
        accessibilityRole="button"
      />

      {tooltip ? (
        <View style={svgStyles.tooltip}>
          <Text style={svgStyles.tooltipText}>{tooltip}</Text>
        </View>
      ) : null}
    </View>
  );
}

const svgStyles = StyleSheet.create({
  container: { alignItems: "center", position: "relative" },
  tapTarget: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  tooltip: {
    position: "absolute",
    bottom: -36,
    alignSelf: "center",
    backgroundColor: "#1A73E8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    maxWidth: 260,
  },
  tooltipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#fff",
    textAlign: "center",
  },
});

export default function DeviceIntroScreen() {
  const insets = useSafeAreaInsets();
  const rockAnim = useRef(new Animated.Value(0)).current;
  const [tooltip, setTooltip] = useState<string | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rockAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(rockAnim, { toValue: -1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  const rockRotate = rockAnim.interpolate({ inputRange: [-1, 1], outputRange: ["-3deg", "3deg"] });

  function showTooltip(msg: string) {
    setTooltip(msg);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2000);
  }

  async function handleDone() {
    await AsyncStorage.setItem(DEVICE_INTRO_KEY, "true");
    router.replace("/(tabs)/dashboard");
  }

  async function handleSkip() {
    await AsyncStorage.setItem(DEVICE_INTRO_KEY, "true");
    router.replace("/(tabs)/dashboard");
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Meet UnifyOS</Text>
          <Text style={styles.mainSubtitle}>Your Smart Crisis Response Device</Text>
        </View>

        {/* Animated device visual */}
        <View style={styles.deviceSection}>
          <Animated.View style={{ transform: [{ rotate: rockRotate }] }}>
            <DeviceSvg
              tooltip={tooltip}
              onPressRed={() => showTooltip("🚨 Panic Button — One press alerts all staff")}
              onPressPir={() => showTooltip("👁 PIR Sensor — Detects motion and occupancy")}
              onPressLed={() => showTooltip("💡 LEDs — Red=Emergency, Green=Safe, Blue=Help")}
            />
          </Animated.View>
          <Text style={styles.deviceHint}>Tap parts of the device to learn more</Text>
        </View>

        {/* Component cards */}
        <View style={styles.cardsSection}>
          <Text style={styles.sectionLabel}>Components</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
          >
            {COMPONENT_CARDS.map(card => (
              <View key={card.title} style={styles.componentCard}>
                <Text style={styles.cardEmoji}>{card.emoji}</Text>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDesc}>{card.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* How it works */}
        <View style={styles.flowSection}>
          <Text style={styles.sectionLabel}>How it Works</Text>
          <View style={styles.flowRow}>
            {["🔍 Sensors", "📡 ESP32", "🤖 Gemini AI", "📱 You"].map((step, i, arr) => (
              <React.Fragment key={step}>
                <View style={styles.flowStep}>
                  <Text style={styles.flowStepText}>{step}</Text>
                </View>
                {i < arr.length - 1 && (
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#1A73E8" />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Specs strip */}
        <View style={styles.specsRow}>
          {SPECS.map((s, i) => (
            <View key={i} style={styles.specItem}>
              <Text style={styles.specLabel}>{s.label}</Text>
              <Text style={styles.specSub}>{s.sub}</Text>
            </View>
          ))}
        </View>

        {/* Bottom buttons */}
        <TouchableOpacity
          style={styles.gotItBtn}
          onPress={handleDone}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Got it, go to dashboard"
        >
          <Text style={styles.gotItText}>Got it, let's go →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.7}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip for now"
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1B3E",
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    gap: 28,
    alignItems: "center",
  },
  headerSection: {
    alignItems: "center",
    gap: 6,
  },
  mainTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  mainSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#8B9EC5",
    textAlign: "center",
  },
  deviceSection: {
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
    paddingBottom: 40,
  },
  deviceHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#8B9EC5",
    textAlign: "center",
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#8B9EC5",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  cardsSection: {
    width: "100%",
    gap: 4,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 4,
  },
  componentCard: {
    width: 130,
    backgroundColor: "#142552",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1A73E820",
    gap: 6,
    alignItems: "flex-start",
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  cardDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#8B9EC5",
    lineHeight: 16,
  },
  flowSection: {
    width: "100%",
    gap: 10,
  },
  flowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    backgroundColor: "#142552",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1A73E820",
  },
  flowStep: {
    backgroundColor: "#0D1B3E",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#1A73E830",
  },
  flowStepText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
  },
  specsRow: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#142552",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1A73E820",
    overflow: "hidden",
  },
  specItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: "#1A73E820",
    gap: 2,
  },
  specLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  specSub: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: "#8B9EC5",
    textAlign: "center",
  },
  gotItBtn: {
    width: "100%",
    backgroundColor: "#1A73E8",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  gotItText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  skipBtn: {
    paddingVertical: 8,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#8B9EC5",
  },
});
