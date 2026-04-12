import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, Alert as RNAlert } from "react-native";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { Alert } from "@/context/DashboardContext";
import { ENV } from "@/config/env";

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
}

interface AlertBannerProps {
  alert: Alert;
  onDismiss: () => void;
  onPress?: () => void;
  compact?: boolean;
  selectedLanguage?: string;
}

const SEVERITY_CONFIG = {
  CRITICAL: { bg: Colors.criticalBg, border: Colors.criticalBorder, color: Colors.critical, label: "CRITICAL", icon: "fire-alert" as const },
  HIGH: { bg: Colors.highBg, border: Colors.highBorder, color: Colors.high, label: "HIGH", icon: "alert" as const },
  MEDIUM: { bg: Colors.mediumBg, border: Colors.mediumBorder, color: Colors.medium, label: "MEDIUM", icon: "alert-circle" as const },
  NORMAL: { bg: Colors.normalBg, border: Colors.normalBorder, color: Colors.normal, label: "NORMAL", icon: "check-circle" as const },
};

const SENSOR_COLORS: Record<string, string> = {
  TEMP: Colors.critical,
  SMOKE: Colors.high,
  BUTTON: "#A78BFA",
  MOTION: Colors.accent,
  FIRE: Colors.critical,
  PANIC: "#A78BFA",
};

function getSensorColor(s: string): string {
  for (const key of Object.keys(SENSOR_COLORS)) {
    if (s.includes(key)) return SENSOR_COLORS[key];
  }
  return Colors.textSecondary;
}

const EVACUATION_STEPS = [
  "Activate the fire alarm system",
  "Notify all staff via emergency contacts",
  "Call emergency services (112)",
  "Announce evacuation over PA system",
  "Guide occupants to nearest exits",
  "Confirm all areas are cleared",
];

export function AlertBanner({ alert, onDismiss, onPress, compact, selectedLanguage }: AlertBannerProps) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>(new Array(EVACUATION_STEPS.length).fill(false));
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notified, setNotified] = useState<Record<string, string>>({});

  const allStepsDone = checkedSteps.every(Boolean);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    if (alert.severity === "CRITICAL") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.01, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else if (alert.severity === "HIGH") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("emergency_contacts").then(raw => {
      if (raw) {
        try { setContacts(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  function toggleStep(index: number) {
    Haptics.selectionAsync();
    setCheckedSteps(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  function handleCall(contact: Contact) {
    Linking.openURL(`tel:${contact.phone}`);
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setNotified(prev => ({ ...prev, [contact.id]: time }));
  }

  async function handleGenerateReport() {
    setGeneratingReport(true);
    try {
      const res = await fetch(`${ENV.BACKEND_URL}/incidents/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: `INC-${alert.id}`,
          location: alert.deviceLocation,
          severity: alert.severity,
          confidence: alert.confidence,
          startTime: alert.createdAt,
          duration: `${Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / 60000)} minutes`,
          triggeredSensors: alert.triggeredSensors || [],
          sensorValues: {},
          aiSummary: alert.aiSummary,
          explanation: alert.explanation || "Anomaly detected by UnifyOS sensor network.",
          resolvedBy: "UnifyOS Responder",
          notes: "Incident resolved following standard evacuation protocol.",
          stepsCompleted: EVACUATION_STEPS,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const { reportBase64 } = await res.json();
      const filename = `UnifyOS_Incident_${alert.id}_${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, reportBase64, { encoding: FileSystem.EncodingType.Base64 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: "application/pdf", dialogTitle: "UnifyOS Incident Report" });
      } else {
        RNAlert.alert("Report Saved", `Saved to: ${fileUri}`);
      }
    } catch {
      RNAlert.alert("Offline", "Backend not connected — report unavailable in demo mode.");
    } finally {
      setGeneratingReport(false);
    }
  }

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  };

  const displayMessage = selectedLanguage && alert.translatedMessages
    ? (alert.translatedMessages[selectedLanguage] || alert.message)
    : alert.message;

  return (
    <Animated.View style={[
      styles.container,
      { backgroundColor: cfg.bg, borderColor: cfg.border, transform: [{ translateY: slideAnim }, { scale: pulseAnim }], opacity: opacityAnim },
    ]}>
      <Pressable onPress={onPress} style={styles.inner}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.color + "20" }]}>
          <MaterialCommunityIcons name={cfg.icon} size={compact ? 18 : 22} color={cfg.color} />
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={[styles.badge, { backgroundColor: cfg.color }]}>
              <Text style={styles.badgeText}>{cfg.label}</Text>
            </View>
            <Text style={[styles.confidencePct, { color: cfg.color }]}>{alert.confidence}%</Text>
            <Text style={styles.time}>{timeAgo(alert.createdAt)}</Text>
          </View>

          <Text style={styles.deviceName}>{alert.deviceName}</Text>
          <Text style={styles.location}>📍 {alert.deviceLocation}</Text>

          <Text style={[styles.message, compact && styles.messageCompact]} numberOfLines={compact ? 1 : 3}>
            {displayMessage}
          </Text>

          {!compact && (
            <>
              <View style={styles.confidence}>
                <View style={[styles.confidenceBar, { width: `${alert.confidence}%`, backgroundColor: cfg.color }]} />
              </View>

              {alert.triggeredSensors && alert.triggeredSensors.length > 0 && (
                <View style={styles.sensorTags}>
                  {alert.triggeredSensors.map(s => (
                    <View key={s} style={[styles.sensorTag, { backgroundColor: getSensorColor(s) + "20", borderColor: getSensorColor(s) + "50" }]}>
                      <Text style={[styles.sensorTagText, { color: getSensorColor(s) }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}

              {alert.explanation && (
                <Text style={styles.explanation}>{alert.explanation}</Text>
              )}

              {alert.aiSummary && (
                <View style={styles.aiSection}>
                  <Text style={styles.aiLabel}>🤖 AI Analysis</Text>
                  <Text style={styles.aiSummary}>{alert.aiSummary}</Text>
                  {alert.aiAction && (
                    <Text style={styles.aiAction}>⚡ {alert.aiAction}</Text>
                  )}
                </View>
              )}

              {(alert.severity === "CRITICAL" || alert.severity === "HIGH") && (
                <>
                  <Pressable
                    style={styles.notifyBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowContacts(true); }}
                  >
                    <Text style={styles.notifyBtnText}>Notify Staff 📞</Text>
                  </Pressable>

                  <View style={styles.evacuationSection}>
                    <Text style={styles.evacuationTitle}>Evacuation Checklist · {alert.deviceLocation}</Text>
                    {EVACUATION_STEPS.map((step, i) => (
                      <Pressable key={i} onPress={() => toggleStep(i)} style={styles.stepRow}>
                        <View style={[styles.checkbox, checkedSteps[i] && styles.checkboxChecked]}>
                          {checkedSteps[i] && <Feather name="check" size={10} color="#fff" />}
                        </View>
                        <Text style={[styles.stepText, checkedSteps[i] && styles.stepTextDone]}>{step}</Text>
                      </Pressable>
                    ))}
                    {allStepsDone && (
                      <>
                        <View style={styles.allDoneRow}>
                          <Feather name="check-circle" size={14} color={Colors.normal} />
                          <Text style={styles.allDoneText}>All 6 steps completed</Text>
                        </View>
                        <Pressable
                          style={[styles.reportBtn, generatingReport && styles.reportBtnLoading]}
                          onPress={handleGenerateReport}
                          disabled={generatingReport}
                        >
                          <MaterialCommunityIcons name="file-pdf-box" size={18} color="#fff" />
                          <Text style={styles.reportBtnText}>
                            {generatingReport ? "Generating..." : "📄 Generate Incident Report"}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </>
              )}
            </>
          )}
        </View>

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDismiss(); }}
          style={styles.dismissBtn}
          hitSlop={8}
        >
          <Feather name="x" size={16} color={Colors.textMuted} />
        </Pressable>
      </Pressable>

      <Modal visible={showContacts} transparent animationType="slide" onRequestClose={() => setShowContacts(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowContacts(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>📞 Notify Emergency Staff</Text>
            <Text style={styles.modalSub}>Tap Call to notify each contact</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {contacts.length === 0 ? (
                <Text style={styles.noContacts}>No emergency contacts saved.\nGo to Settings → Emergency Contacts.</Text>
              ) : (
                contacts.map(c => (
                  <View key={c.id} style={styles.contactRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{c.name}</Text>
                      <Text style={styles.contactRole}>{c.role} · {c.phone}</Text>
                      {notified[c.id] && (
                        <Text style={styles.notifiedText}>✓ Called at {notified[c.id]}</Text>
                      )}
                    </View>
                    <Pressable onPress={() => handleCall(c)} style={styles.callBtn}>
                      <Feather name="phone" size={14} color="#fff" />
                      <Text style={styles.callBtnText}>Call</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setShowContacts(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  inner: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  content: { flex: 1, gap: 5 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  confidencePct: { fontSize: 11, fontFamily: "Inter_700Bold" },
  time: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginLeft: "auto" as any },
  deviceName: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text },
  location: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  message: { fontSize: 13, color: Colors.text, fontFamily: "Inter_500Medium", lineHeight: 19 },
  messageCompact: { fontSize: 12 },
  confidence: { gap: 4 },
  confidenceBar: { height: 3, borderRadius: 2, maxWidth: "100%" },
  explanation: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 16, fontStyle: "italic" },
  sensorTags: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  sensorTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  sensorTagText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  aiSection: {
    backgroundColor: "rgba(37,99,235,0.08)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    gap: 4,
  },
  aiLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.accent, letterSpacing: 0.8, textTransform: "uppercase" },
  aiSummary: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 17, fontStyle: "italic" },
  aiAction: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.text },
  notifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.normal,
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 2,
  },
  notifyBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  evacuationSection: {
    backgroundColor: "rgba(239,68,68,0.05)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    gap: 6,
    marginTop: 4,
  },
  evacuationTitle: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.critical, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 2 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  checkboxChecked: { backgroundColor: Colors.normal, borderColor: Colors.normal },
  stepText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, flex: 1, lineHeight: 17 },
  stepTextDone: { color: Colors.textMuted, textDecorationLine: "line-through" },
  allDoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  allDoneText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.normal },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  reportBtnLoading: { backgroundColor: Colors.border },
  reportBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  dismissBtn: { padding: 4, flexShrink: 0 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  modalSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  noContacts: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 18, padding: 8 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  contactName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  contactRole: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  notifiedText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.normal, marginTop: 2 },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.normal,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  callBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  modalClose: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  modalCloseText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
