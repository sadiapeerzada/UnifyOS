import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SensorGauge } from "@/components/SensorGauge";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { LiveIndicator } from "@/components/LiveIndicator";
import { AlertBanner } from "@/components/AlertBanner";
import { Colors } from "@/constants/colors";
import { useDashboard } from "@/context/DashboardContext";
import { ENV } from "@/config/env";

const ANOMALY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  TEMP_CRITICAL: { label: "Temperature Critical (>45°C)", color: Colors.critical, icon: "thermometer-alert" },
  TEMP_HIGH: { label: "Temperature High (>35°C)", color: Colors.high, icon: "thermometer-chevron-up" },
  TEMP_SPIKE: { label: "Rapid Temperature Rise", color: Colors.high, icon: "trending-up" },
  TEMP_RISING_FAST: { label: "Temperature Rising Fast", color: Colors.high, icon: "trending-up" },
  SMOKE_DETECTED: { label: "Smoke Detected (>400 ppm)", color: Colors.critical, icon: "smoke" },
  SMOKE_ELEVATED: { label: "Smoke Elevated (>250 ppm)", color: Colors.high, icon: "cloud-alert" },
  SMOKE_SPIKE: { label: "Rapid Smoke Increase", color: Colors.high, icon: "arrow-up-bold" },
  SMOKE_RISING_FAST: { label: "Smoke Rising Fast", color: Colors.high, icon: "arrow-up-bold" },
  PANIC_BUTTON: { label: "Panic Button Pressed", color: Colors.critical, icon: "alert-decagram" },
  OCCUPANCY_EMPTY: { label: "Room Evacuated", color: Colors.medium, icon: "run-fast" },
  FIRE_CORRELATION: { label: "Fire Correlation Confirmed", color: Colors.critical, icon: "fire-alert" },
};

const EVACUATION_STEPS = [
  "Alert security and all nearby staff immediately",
  "Call emergency services: 112 (Emergency) / 101 (Fire)",
  "Begin evacuation of Main Lobby — use nearest exit",
  "Ensure all occupants are accounted for at assembly point",
  "Coordinate with emergency responders on arrival",
  "Secure the premises — do not re-enter until cleared",
];

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { devices, alerts, getDeviceSensorData, getDeviceAnomaly, dismissAlert } = useDashboard();
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>(new Array(EVACUATION_STEPS.length).fill(false));
  const [downloading, setDownloading] = useState(false);
  const incidentStartRef = useRef(new Date().toISOString());

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const device = devices.find(d => d.id === id);
  const sensorData = id ? getDeviceSensorData(id) : undefined;
  const anomaly = id ? getDeviceAnomaly(id) : undefined;
  const deviceAlerts = alerts.filter(a => a.deviceId === id && !a.dismissed && a.severity !== "NORMAL");

  const hasCriticalOrHigh = deviceAlerts.some(a => a.severity === "CRITICAL" || a.severity === "HIGH");
  const allStepsChecked = checkedSteps.every(Boolean);

  function toggleStep(i: number) {
    setCheckedSteps(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  async function handleDownloadReport() {
    if (downloading) return;
    setDownloading(true);
    const incidentId = `INC-${id}-${Date.now()}`;
    const criticalAlert = deviceAlerts.find(a => a.severity === "CRITICAL") ?? deviceAlerts[0];
    const now = new Date();
    const startTime = incidentStartRef.current;
    const resolvedBy = "Staff (App)";
    const location = device?.location ?? "Main Lobby";
    const severity = anomaly?.severity ?? criticalAlert?.severity ?? "CRITICAL";
    const confidence = anomaly?.confidence ?? criticalAlert?.confidence ?? 0;
    const triggeredSensors = anomaly?.anomalies ?? criticalAlert?.triggeredSensors ?? [];
    const peakTemp = sensorData?.temperature ?? 0;
    const peakSmoke = sensorData?.smoke ?? 0;
    const aiSummary = criticalAlert?.aiSummary ?? "";

    try {
      const res = await fetch(`${ENV.BACKEND_URL}/incident/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId,
          resolvedBy,
          notes: `Incident resolved via mobile app. All ${EVACUATION_STEPS.length} evacuation steps completed.`,
          location,
          severity,
          confidence,
          triggeredSensors,
          peakTemperature: peakTemp,
          peakSmoke,
          aiSummary,
          stepsCompleted: EVACUATION_STEPS.length,
          startTime,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const { reportBase64 } = await res.json() as { reportBase64: string };
        await saveAndSharePDF(reportBase64, incidentId);
      } else {
        await shareTextReport(incidentId, now, location, severity, confidence, triggeredSensors, startTime, peakTemp, peakSmoke);
      }
    } catch {
      await shareTextReport(incidentId, now, location, severity, confidence, triggeredSensors, startTime, peakTemp, peakSmoke);
    } finally {
      setDownloading(false);
    }
  }

  async function saveAndSharePDF(base64: string, incidentId: string) {
    try {
      if (Platform.OS === "web") {
        const blob = new Blob(
          [Uint8Array.from(atob(base64), c => c.charCodeAt(0))],
          { type: "application/pdf" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `incident-${incidentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const path = (FileSystem.documentDirectory ?? "") + `incident-${incidentId}.pdf`;
        await FileSystem.writeAsStringAsync(path, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, { mimeType: "application/pdf", dialogTitle: "Share Incident Report" });
        } else {
          Alert.alert("Saved", `Report saved to:\n${path}`);
        }
      }
    } catch {
      Alert.alert("Error", "Failed to save PDF. Please try again.");
    }
  }

  async function shareTextReport(
    incidentId: string, now: Date, location: string, severity: string,
    confidence: number, sensors: string[], startTime: string, temp: number, smoke: number
  ) {
    const start = new Date(startTime);
    const minutesToResolve = Math.round((now.getTime() - start.getTime()) / 60000);
    const report = [
      "========================================",
      "         UnifyOS Incident Report        ",
      "========================================",
      "",
      `Incident ID   : ${incidentId}`,
      `Date          : ${now.toLocaleDateString()}`,
      `Time          : ${now.toLocaleTimeString()}`,
      `Location      : ${location}`,
      "",
      `Severity      : ${severity}`,
      `Confidence    : ${confidence}%`,
      `Sensors Triggered : ${sensors.join(", ") || "N/A"}`,
      "",
      `Peak Temperature  : ${temp.toFixed(1)}°C`,
      `Peak Smoke Level  : ${smoke.toFixed(0)} ppm`,
      "",
      `Time to Resolve   : ${minutesToResolve} minute(s)`,
      `Steps Completed   : ${EVACUATION_STEPS.length}/${EVACUATION_STEPS.length}`,
      "",
      "Evacuation Steps Completed:",
      ...EVACUATION_STEPS.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      "========================================",
      "Generated by UnifyOS — Team BlackBit",
      "========================================",
    ].join("\n");

    try {
      if (Platform.OS === "web") {
        const blob = new Blob([report], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `incident-${incidentId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const path = (FileSystem.documentDirectory ?? "") + `incident-${incidentId}.txt`;
        await FileSystem.writeAsStringAsync(path, report, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, { mimeType: "text/plain", dialogTitle: "Share Incident Report" });
        } else {
          await Share.share({ message: report, title: "UnifyOS Incident Report" });
        }
      }
    } catch {
      await Share.share({ message: report, title: "UnifyOS Incident Report" });
    }
  }

  if (!device) {
    return (
      <View style={[styles.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: Colors.text }}>Device not found</Text>
      </View>
    );
  }

  const statusColor = device.status === "critical" ? Colors.critical :
                      device.status === "warning" ? Colors.high :
                      device.status === "online" ? Colors.normal : Colors.textMuted;

  const actionLabel = anomaly?.severity === "CRITICAL" ? "EVACUATE IMMEDIATELY" :
                      anomaly?.severity === "HIGH" ? "ALERT STAFF" :
                      anomaly?.severity === "MEDIUM" ? "MONITOR" : "ALL CLEAR";

  const actionColor = anomaly?.severity === "CRITICAL" ? Colors.critical :
                      anomaly?.severity === "HIGH" ? Colors.high :
                      anomaly?.severity === "MEDIUM" ? Colors.medium : Colors.normal;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={11} color={Colors.textMuted} />
            <Text style={styles.locationText}>{device.location}</Text>
          </View>
        </View>
        <LiveIndicator />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusCard, {
          backgroundColor: statusColor + "12",
          borderColor: statusColor + "40",
        }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {device.status.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.actionText, { color: actionColor }]}>{actionLabel}</Text>
          {anomaly && anomaly.severity !== "NORMAL" && (
            <ConfidenceMeter confidence={anomaly.confidence} severity={anomaly.severity} />
          )}
        </View>

        {deviceAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Alerts</Text>
            {deviceAlerts.map(alert => (
              <AlertBanner
                key={alert.id}
                alert={alert}
                onDismiss={() => dismissAlert(alert.id)}
              />
            ))}
          </View>
        )}

        {anomaly && anomaly.anomalies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detected Anomalies</Text>
            <View style={styles.anomaliesCard}>
              {anomaly.anomalies.map((a, i) => {
                const cfg = ANOMALY_LABELS[a] ?? { label: a, color: Colors.textSecondary, icon: "alert-circle-outline" };
                return (
                  <View key={i} style={[styles.anomalyItem, i > 0 && styles.anomalyBorder]}>
                    <MaterialCommunityIcons name={cfg.icon as any} size={16} color={cfg.color} />
                    <Text style={[styles.anomalyLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {hasCriticalOrHigh && (
          <View style={styles.section}>
            <View style={styles.checklistHeader}>
              <MaterialCommunityIcons name="clipboard-check" size={18} color={Colors.critical} />
              <Text style={styles.checklistTitle}>Emergency Evacuation Checklist</Text>
              <View style={[styles.checklistBadge, allStepsChecked && styles.checklistBadgeDone]}>
                <Text style={[styles.checklistBadgeText, allStepsChecked && styles.checklistBadgeTextDone]}>
                  {checkedSteps.filter(Boolean).length}/{EVACUATION_STEPS.length}
                </Text>
              </View>
            </View>

            <View style={styles.checklistCard}>
              {EVACUATION_STEPS.map((step, i) => (
                <Pressable
                  key={i}
                  style={[styles.checklistItem, i > 0 && styles.checklistItemBorder]}
                  onPress={() => toggleStep(i)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: checkedSteps[i] }}
                >
                  <View style={[styles.checkbox, checkedSteps[i] && styles.checkboxChecked]}>
                    {checkedSteps[i] && (
                      <MaterialCommunityIcons name="check" size={14} color="#fff" />
                    )}
                  </View>
                  <Text style={[styles.checklistStepNum, checkedSteps[i] && styles.checklistStepDone]}>
                    {i + 1}.
                  </Text>
                  <Text style={[styles.checklistStepText, checkedSteps[i] && styles.checklistStepDone]}>
                    {step}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.emergencyCallRow}>
              <Pressable
                style={styles.callBtn}
                onPress={() => Linking.openURL("tel:112")}
                accessibilityLabel="Call 112 Emergency"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="phone" size={14} color="#fff" />
                <Text style={styles.callBtnText}>112</Text>
              </Pressable>
              <Pressable
                style={[styles.callBtn, { backgroundColor: Colors.high }]}
                onPress={() => Linking.openURL("tel:101")}
                accessibilityLabel="Call 101 Fire"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="fire-truck" size={14} color="#fff" />
                <Text style={styles.callBtnText}>101 Fire</Text>
              </Pressable>
              <Pressable
                style={[styles.callBtn, { backgroundColor: "#5B21B6" }]}
                onPress={() => Linking.openURL("tel:102")}
                accessibilityLabel="Call 102 Ambulance"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="ambulance" size={14} color="#fff" />
                <Text style={styles.callBtnText}>102 Amb</Text>
              </Pressable>
            </View>

            {allStepsChecked && (
              <Pressable
                style={[styles.reportBtn, downloading && { opacity: 0.6 }]}
                onPress={handleDownloadReport}
                disabled={downloading}
                accessibilityLabel="Download Incident Report PDF"
                accessibilityRole="button"
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.reportBtnIcon}>📄</Text>
                )}
                <Text style={styles.reportBtnText}>
                  {downloading ? "Generating Report…" : "Download Incident Report"}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {sensorData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Live Readings</Text>
            <View style={styles.gaugeGrid}>
              <SensorGauge
                label="Temperature"
                value={sensorData.temperature}
                unit="°C"
                min={15}
                max={80}
                warnThreshold={35}
                alertThreshold={45}
                color={Colors.temp}
                icon={<MaterialCommunityIcons name="thermometer" size={14} color={Colors.temp} />}
                isAnomaly={sensorData.temperature > 45}
              />
              <SensorGauge
                label="Smoke"
                value={sensorData.smoke}
                unit="ppm"
                min={50}
                max={600}
                warnThreshold={250}
                alertThreshold={400}
                color={Colors.smoke}
                icon={<MaterialCommunityIcons name="smoke" size={14} color={Colors.smoke} />}
                isAnomaly={sensorData.smoke > 400}
              />
            </View>

            <View style={styles.binaryRow}>
              <View style={[styles.binaryCard,
                sensorData.motion ? styles.binaryCardOn : styles.binaryCardOff,
              ]}>
                <MaterialCommunityIcons
                  name="motion-sensor"
                  size={28}
                  color={sensorData.motion ? Colors.motion : Colors.textMuted}
                />
                <Text style={[styles.binaryLabel, { color: sensorData.motion ? Colors.motion : Colors.textMuted }]}>
                  {sensorData.motion ? "MOTION" : "NO MOTION"}
                </Text>
                <Text style={styles.binarySub}>PIR Sensor</Text>
              </View>

              <View style={[styles.binaryCard,
                sensorData.button ? styles.binaryCardCritical : styles.binaryCardOff,
              ]}>
                <MaterialCommunityIcons
                  name={sensorData.button ? "alert-decagram" : "shield-check-outline"}
                  size={28}
                  color={sensorData.button ? Colors.critical : Colors.textMuted}
                />
                <Text style={[styles.binaryLabel, { color: sensorData.button ? Colors.critical : Colors.textMuted }]}>
                  {sensorData.button ? "PANIC!" : "SAFE"}
                </Text>
                <Text style={styles.binarySub}>Panic Button</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Info</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Device ID" value={device.id} />
            <InfoRow label="Name" value={device.name} />
            <InfoRow label="Location" value={device.location} />
            <InfoRow label="Status" value={device.status} valueColor={statusColor} />
            <InfoRow label="Last Seen" value={new Date(device.lastSeen).toLocaleTimeString()} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  actionText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  anomaliesCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  anomalyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  anomalyBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  anomalyLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  checklistHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checklistTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.critical,
    letterSpacing: 0.2,
  },
  checklistBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.criticalBg,
    borderWidth: 1,
    borderColor: Colors.criticalBorder,
  },
  checklistBadgeDone: {
    backgroundColor: Colors.normalBg,
    borderColor: Colors.normalBorder,
  },
  checklistBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.critical,
  },
  checklistBadgeTextDone: {
    color: Colors.normal,
  },
  checklistCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.criticalBorder,
    overflow: "hidden",
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
  },
  checklistItemBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.normal,
    borderColor: Colors.normal,
  },
  checklistStepNum: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    minWidth: 18,
  },
  checklistStepText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 18,
  },
  checklistStepDone: {
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  emergencyCallRow: {
    flexDirection: "row",
    gap: 8,
  },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.critical,
    borderRadius: 12,
    paddingVertical: 10,
  },
  callBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#1A73E8",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  reportBtnIcon: {
    fontSize: 20,
  },
  reportBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.2,
  },
  gaugeGrid: {
    flexDirection: "row",
    gap: 10,
  },
  binaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  binaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  binaryCardOn: {
    backgroundColor: Colors.normalBg,
    borderColor: Colors.normalBorder,
  },
  binaryCardOff: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  binaryCardCritical: {
    backgroundColor: Colors.criticalBg,
    borderColor: Colors.criticalBorder,
  },
  binaryLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  binarySub: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
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
    paddingHorizontal: 14,
    paddingVertical: 11,
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
  },
});
