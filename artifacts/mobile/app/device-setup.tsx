import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import { ENV } from "@/config/env";
import Svg, { Rect, Circle, Polygon, Text as SvgText } from "react-native-svg";

const NAME_CHIPS = ["Main Lobby Button", "Kitchen Alert", "Reception", "Room 301", "Corridor Button"];
const LOCATION_CHIPS = ["Near main entrance", "Above kitchen door", "Wall mounted", "Desk mounted", "Above fire exit"];

function SmallDeviceIllustration() {
  return (
    <Svg width={120} height={100} viewBox="0 0 120 100">
      <Polygon points="20,16 100,16 115,32 35,32" fill="#0D1B3E" stroke="#1A73E8" strokeWidth="1" />
      <Circle cx="96" cy="23" r="8" fill="#E53935" />
      <SvgText x="96" y="27" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="bold">SOS</SvgText>
      <Rect x="20" y="32" width="80" height="60" rx="5" fill="#142552" stroke="#1A73E8" strokeWidth="0.8" />
      <Rect x="28" y="40" width="64" height="20" rx="3" fill="#0A1628" opacity={0.7} />
      <SvgText x="60" y="55" textAnchor="middle" fontSize="6" fill="#1A73E8" fontWeight="bold">UnifyOS-001</SvgText>
      <Circle cx="40" cy="82" r="4" fill="#E53935" />
      <Circle cx="60" cy="82" r="4" fill="#00C853" />
      <Circle cx="80" cy="82" r="4" fill="#1A73E8" />
      <Polygon points="100,32 115,32 115,78 100,92" fill="#0A1628" stroke="#1A73E8" strokeWidth="0.4" opacity={0.8} />
    </Svg>
  );
}

export default function DeviceSetupScreen() {
  const insets = useSafeAreaInsets();
  const { device_id } = useLocalSearchParams<{ device_id: string }>();
  const { currentUser } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const checkScale = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const deviceId = device_id || "UnifyOS-001";

  async function handleSave() {
    if (!location.trim()) return;
    setSaving(true);
    const payload = {
      device_id: deviceId,
      name: name.trim() || "Smart Panic Button",
      location: location.trim(),
      setup_by: currentUser?.email || "guest",
      setup_at: new Date().toISOString(),
      status: "online",
    };
    try {
      await setDoc(doc(db, "devices", deviceId), payload);
    } catch {}
    try {
      await fetch(`${ENV.BACKEND_URL}/api/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}
    await AsyncStorage.setItem("device_configured", "true");
    setSaving(false);
    setSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }).start();
    setTimeout(() => router.replace("/(tabs)/dashboard"), 1600);
  }

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: topPad }, styles.successScreen]}>
        <Animated.View style={[styles.successCircle, { transform: [{ scale: checkScale }] }]}>
          <MaterialCommunityIcons name="check" size={52} color="#00C853" />
        </Animated.View>
        <Text style={styles.successTitle}>Device Ready!</Text>
        <Text style={styles.successSub}>{name || "Smart Panic Button"} · {location}</Text>
        <Text style={styles.successHint}>Taking you to the dashboard…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        {step > 0 ? (
          <Pressable onPress={() => setStep(s => s - 1)} style={styles.backBtn} hitSlop={10}>
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
        <Text style={styles.headerTitle}>Set Up Device</Text>
        <Pressable
          onPress={async () => {
            await AsyncStorage.setItem("device_configured", "true");
            router.replace("/(tabs)/dashboard");
          }}
          hitSlop={10}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.dot, step === i && styles.dotActive, step > i && styles.dotDone]} />
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── STEP 0: Welcome ─── */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.illustrationWrap}>
              <SmallDeviceIllustration />
            </View>
            <Text style={styles.stepTitle}>Set Up Your Device</Text>
            <Text style={styles.stepSubtitle}>Let's configure your UnifyOS panic button in just 2 quick steps</Text>

            <View style={styles.featureList}>
              {[
                ["shield-check", "Instant SOS alerts to all staff"],
                ["thermometer", "Real-time smoke & temperature monitoring"],
                ["motion-sensor", "Occupancy detection for smarter response"],
              ].map(([icon, text]) => (
                <View key={text} style={styles.featureRow}>
                  <MaterialCommunityIcons name={icon as any} size={18} color={Colors.accent} />
                  <Text style={styles.featureText}>{text}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.primaryBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(1); }}>
              <Text style={styles.primaryBtnText}>Get Started →</Text>
            </Pressable>
          </View>
        )}

        {/* ─── STEP 1: Name the device ─── */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepIcon}>
              <MaterialCommunityIcons name="tag-outline" size={36} color={Colors.accent} />
            </View>
            <Text style={styles.stepTitle}>Name this device</Text>
            <Text style={styles.stepSubtitle}>Give it a memorable name — this appears on all emergency alerts</Text>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Main Lobby Button, Kitchen Alert"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => name.trim() && setStep(2)}
              autoFocus
            />

            <Text style={styles.chipLabel}>Quick select</Text>
            <View style={styles.chipsWrap}>
              {NAME_CHIPS.map(chip => (
                <Pressable
                  key={chip}
                  style={[styles.chip, name === chip && styles.chipActive]}
                  onPress={() => { setName(chip); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.chipText, name === chip && styles.chipActiveText]}>{chip}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.primaryBtn, !name.trim() && styles.primaryBtnDisabled]}
              onPress={() => { if (name.trim()) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(2); } }}
              disabled={!name.trim()}
            >
              <Text style={styles.primaryBtnText}>Next →</Text>
            </Pressable>
          </View>
        )}

        {/* ─── STEP 2: Location ─── */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepIcon}>
              <MaterialCommunityIcons name="map-marker-outline" size={36} color={Colors.accent} />
            </View>
            <Text style={styles.stepTitle}>Where is it mounted?</Text>
            <Text style={styles.stepSubtitle}>This appears on all emergency alerts and incident reports</Text>

            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Near main entrance, Above kitchen door"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              autoFocus
            />

            <Text style={styles.chipLabel}>Quick select</Text>
            <View style={styles.chipsWrap}>
              {LOCATION_CHIPS.map(chip => (
                <Pressable
                  key={chip}
                  style={[styles.chip, location === chip && styles.chipActive]}
                  onPress={() => { setLocation(chip); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.chipText, location === chip && styles.chipActiveText]}>{chip}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.primaryBtn, (!location.trim() || saving) && styles.primaryBtnDisabled]}
              onPress={handleSave}
              disabled={!location.trim() || saving}
            >
              <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Save & Start →"}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -0.3 },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  skipText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: { backgroundColor: Colors.accent, width: 24 },
  dotDone: { backgroundColor: Colors.accent + "60" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },
  stepContainer: { gap: 16, alignItems: "center" },
  illustrationWrap: {
    width: 160, height: 130, borderRadius: 20,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.accentGlow,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  stepIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.accent + "40",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text,
    letterSpacing: -0.5, textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    textAlign: "center", lineHeight: 20,
  },
  featureList: { gap: 10, alignSelf: "stretch", marginTop: 4 },
  featureRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  featureText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text, flex: 1 },
  input: {
    backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
    alignSelf: "stretch",
  },
  chipLabel: {
    alignSelf: "flex-start",
    fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignSelf: "stretch" },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  chipActiveText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: Colors.accent, borderRadius: 16,
    paddingVertical: 16, alignSelf: "stretch", marginTop: 8,
  },
  primaryBtnDisabled: { backgroundColor: Colors.border },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  successScreen: {
    alignItems: "center", justifyContent: "center", gap: 16,
  },
  successCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(0,200,83,0.12)", borderWidth: 2, borderColor: "#00C853",
    alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },
  successHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
