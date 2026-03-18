import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

const QUICK_CHIPS = ["Kitchen", "Lobby", "Reception", "Corridor", "Main Lobby", "Server Room"];

export default function DeviceSetupScreen() {
  const insets = useSafeAreaInsets();
  const { device_id } = useLocalSearchParams<{ device_id: string }>();
  const { currentUser } = useAuth();
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const deviceId = device_id || "UnifyOS-001";

  async function handleConfirm() {
    if (!location.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "devices", deviceId), {
        device_id: deviceId,
        location: location.trim(),
        setup_by: currentUser?.email || "guest",
        setup_at: new Date().toISOString(),
        status: "online",
      });
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        router.replace("/(tabs)/dashboard");
      }, 1500);
    } catch (err) {
      console.error("Device setup error:", err);
      setSuccess(true);
      setTimeout(() => {
        router.replace("/(tabs)/dashboard");
      }, 1500);
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: topPad }, styles.successContainer]}>
        <MaterialCommunityIcons name="check-circle" size={64} color={Colors.normal} />
        <Text style={styles.successTitle}>Device Configured!</Text>
        <Text style={styles.successSub}>{deviceId} → {location}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Setup Device</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.deviceCard}>
          <View style={styles.deviceIconWrap}>
            <MaterialCommunityIcons name="shield-check" size={32} color={Colors.accent} />
          </View>
          <View>
            <Text style={styles.deviceIdLabel}>Device ID</Text>
            <Text style={styles.deviceIdValue}>{deviceId}</Text>
          </View>
          <View style={[styles.onlineDot]} />
        </View>

        <Text style={styles.label}>Location Name</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Kitchen, Main Lobby, Room 301"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleConfirm}
        />

        <Text style={styles.quickLabel}>Quick Select</Text>
        <View style={styles.chipsRow}>
          {QUICK_CHIPS.map(chip => (
            <Pressable
              key={chip}
              onPress={() => { setLocation(chip); Haptics.selectionAsync(); }}
              style={[styles.chip, location === chip && styles.chipActive]}
            >
              <Text style={[styles.chipText, location === chip && styles.chipTextActive]}>
                {chip}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.confirmBtn, !location.trim() && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!location.trim() || saving}
        >
          <MaterialCommunityIcons name="check" size={18} color="#fff" />
          <Text style={styles.confirmBtnText}>
            {saving ? "Saving..." : "Confirm Location"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.normal,
  },
  successSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.accentGlow,
    marginBottom: 6,
  },
  deviceIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.accentGlow,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  deviceIdLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  deviceIdValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginTop: 2,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.normal,
    marginLeft: "auto",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  quickLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.border,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
