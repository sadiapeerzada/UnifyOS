import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AlertBanner } from "@/components/AlertBanner";
import { SensorGauge } from "@/components/SensorGauge";
import { Colors } from "@/constants/colors";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { useSensorData, simulateEmergency, checkBackendStatus } from "@/services/sensorService";
import type { SimulateResult } from "@/services/sensorService";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { devices, alerts, activeAlerts, dismissAlert, dismissAllAlerts, getDeviceSensorData, getDeviceAnomaly, deviceName, deviceLocation, isLive } = useDashboard();
  const { currentUser, logout } = useAuth();
  const sensorData = useSensorData();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "demo" | "lost">("checking");
  const [silenced, setSilenced] = useState(false);
  const [silenceCountdown, setSilenceCountdown] = useState(0);
  const silenceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    async function checkStatus() {
      const result = await checkBackendStatus();
      setConnectionStatus(result.connected ? (result.lastHardwarePing ? "connected" : "demo") : "demo");
    }
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sensorData.isLive) setConnectionStatus("connected");
  }, [sensorData.isLive]);

  const criticalCount = activeAlerts.filter(a => a.severity === "CRITICAL").length;
  const highCount = activeAlerts.filter(a => a.severity === "HIGH").length;
  const normalDevices = devices.filter(d => d.status === "online").length;

  const worstDevice = devices.find(d => d.status === "critical") || devices.find(d => d.status === "warning") || devices[0];
  const displayData = worstDevice ? getDeviceSensorData(worstDevice.id) : undefined;

  const overallSeverity = criticalCount > 0 ? "CRITICAL" : highCount > 0 ? "HIGH" :
    activeAlerts.length > 0 ? "MEDIUM" : "NORMAL";

  const severityBg = overallSeverity === "CRITICAL" ? Colors.criticalBg :
                     overallSeverity === "HIGH" ? Colors.highBg :
                     overallSeverity === "MEDIUM" ? Colors.mediumBg : Colors.normalBg;
  const severityColor = overallSeverity === "CRITICAL" ? Colors.critical :
                        overallSeverity === "HIGH" ? Colors.high :
                        overallSeverity === "MEDIUM" ? Colors.medium : Colors.normal;
  const severityBorder = overallSeverity === "CRITICAL" ? Colors.criticalBorder :
                         overallSeverity === "HIGH" ? Colors.highBorder :
                         overallSeverity === "MEDIUM" ? Colors.mediumBorder : Colors.normalBorder;

  const initials = currentUser
    ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  async function handleSimulate() {
    setSimulating(true);
    try {
      const result: SimulateResult = await simulateEmergency();
      const msg = [
        `Severity: ${result.severity}`,
        `Confidence: ${result.confidence}%`,
        `Location: ${result.location}`,
        result.message,
        result.aiSummary ? `\nAI: ${result.aiSummary}` : "",
        result.aiEstimatedCause ? `Cause: ${result.aiEstimatedCause}` : "",
        result.aiAction ? `Action: ${result.aiAction}` : "",
      ].filter(Boolean).join("\n");
      Alert.alert("Emergency Simulated", msg, [{ text: "OK" }]);
    } catch {
      Alert.alert("Offline", "Backend not reachable — simulated data only");
    } finally {
      setSimulating(false);
    }
  }

  function handleSilence() {
    if (silenced) return;
    setSilenced(true);
    setSilenceCountdown(120);
    silenceRef.current = setInterval(() => {
      setSilenceCountdown(c => {
        if (c <= 1) {
          setSilenced(false);
          if (silenceRef.current) clearInterval(silenceRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleExportLog() {
    const lines = alerts.slice(0, 50).map(a =>
      `[${new Date(a.createdAt).toLocaleString()}] ${a.severity} — ${a.deviceLocation} — ${a.message}`
    );
    try {
      await Share.share({ message: lines.join("\n") || "No alerts logged." });
    } catch {}
  }

  function handleAllClear() {
    Alert.alert("All Clear", "Dismiss all active alerts?", [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: dismissAllAlerts },
    ]);
  }

  const connDot = connectionStatus === "connected" ? Colors.normal :
                  connectionStatus === "lost" ? Colors.critical : Colors.medium;
  const connLabel = connectionStatus === "connected" ? "Hardware Connected — Live" :
                    connectionStatus === "lost" ? "Connection Lost — Retrying..." : "Simulated — No hardware connected";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Monitoring: {deviceName} · {deviceLocation}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.aboutHeaderBtn}
            onPress={() => router.push("/about")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="About UnifyOS"
          >
            <MaterialCommunityIcons name="information-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.aboutHeaderText}>About</Text>
          </TouchableOpacity>
          {currentUser && !currentUser.isGuest ? (
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => setAvatarOpen(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => logout()}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="logout" size={11} color={Colors.accent} />
              <Text style={styles.signInText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {avatarOpen && (
        <View style={styles.avatarDropdown}>
          <Text style={styles.dropdownName}>{currentUser?.name}</Text>
          <Text style={styles.dropdownEmail}>{currentUser?.email}</Text>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => { setAvatarOpen(false); logout(); }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="logout" size={14} color={Colors.critical} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: connDot }]} />
        <Text style={[styles.statusBarText, { color: connDot }]}>{connLabel}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusCard, { backgroundColor: severityBg, borderColor: severityBorder }]}>
          <View style={styles.statusHeader}>
            <MaterialCommunityIcons
              name={overallSeverity === "CRITICAL" ? "fire-alert" :
                    overallSeverity === "HIGH" ? "alert" :
                    overallSeverity === "MEDIUM" ? "alert-circle-outline" : "shield-check"}
              size={28}
              color={severityColor}
            />
            <View style={styles.statusText}>
              <Text style={[styles.statusLabel, { color: severityColor }]}>SYSTEM STATUS</Text>
              <Text style={[styles.statusValue, { color: severityColor }]}>{overallSeverity}</Text>
            </View>
            <View style={styles.statsRow}>
              <StatChip label="Devices" value={devices.length} color={Colors.textSecondary} />
              <StatChip label="Online" value={normalDevices} color={Colors.normal} />
              {activeAlerts.length > 0 && (
                <StatChip label="Alerts" value={activeAlerts.length} color={Colors.critical} />
              )}
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.qaBtn, styles.qaBtnRed]} onPress={handleSimulate} disabled={simulating} activeOpacity={0.8}>
            <MaterialCommunityIcons name="fire-alert" size={16} color={Colors.critical} />
            <Text style={[styles.qaBtnText, { color: Colors.critical }]}>{simulating ? "..." : "Test Emergency"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qaBtn, silenced ? styles.qaBtnAmber : styles.qaBtnDefault]} onPress={handleSilence} disabled={silenced} activeOpacity={0.8}>
            <MaterialCommunityIcons name="bell-off" size={16} color={silenced ? Colors.medium : Colors.textSecondary} />
            <Text style={[styles.qaBtnText, { color: silenced ? Colors.medium : Colors.textSecondary }]}>
              {silenced ? `${silenceCountdown}s` : "Silence 2m"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qaBtn, styles.qaBtnDefault]} onPress={handleExportLog} activeOpacity={0.8}>
            <MaterialCommunityIcons name="export" size={16} color={Colors.textSecondary} />
            <Text style={[styles.qaBtnText, { color: Colors.textSecondary }]}>Export Log</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qaBtn, styles.qaBtnGreen]} onPress={handleAllClear} activeOpacity={0.8}>
            <MaterialCommunityIcons name="check-all" size={16} color={Colors.normal} />
            <Text style={[styles.qaBtnText, { color: Colors.normal }]}>All Clear</Text>
          </TouchableOpacity>
        </View>

        {activeAlerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Alerts</Text>
              <Text style={styles.sectionCount}>{activeAlerts.length}</Text>
            </View>
            {activeAlerts.slice(0, 3).map(alert => (
              <AlertBanner
                key={alert.id}
                alert={alert}
                compact
                onDismiss={() => dismissAlert(alert.id)}
                onPress={() => router.push("/alerts")}
              />
            ))}
            {activeAlerts.length > 3 && (
              <Text style={styles.moreAlerts} onPress={() => router.push("/alerts")}>
                +{activeAlerts.length - 3} more alerts
              </Text>
            )}
          </View>
        )}

        {isLive && displayData && (
          displayData.humidity != null ||
          displayData.battery != null ||
          displayData.flame != null ||
          displayData.firmwareConfidence != null ||
          displayData.firmwareAlertLevel ||
          displayData.firmwareAlertReason
        ) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.liveTitleRow}>
                <View style={styles.livePulse} />
                <Text style={styles.sectionTitle}>Live Hardware Telemetry</Text>
              </View>
              {displayData.firmwareAlertLevel && (
                <Text style={[
                  styles.fwLevelTag,
                  displayData.firmwareAlertLevel === "CRITICAL" || displayData.firmwareAlertLevel === "DANGER"
                    ? { color: Colors.critical, backgroundColor: Colors.criticalBg, borderColor: Colors.criticalBorder }
                    : displayData.firmwareAlertLevel === "WARN"
                      ? { color: Colors.medium, backgroundColor: "rgba(234,179,8,0.1)", borderColor: "rgba(234,179,8,0.4)" }
                      : { color: Colors.normal, backgroundColor: Colors.normalBg, borderColor: Colors.normalBorder },
                ]}>
                  FW: {displayData.firmwareAlertLevel}
                </Text>
              )}
            </View>

            <View style={styles.telemetryGrid}>
              {displayData.humidity != null && (
                <TelemetryTile
                  icon="water-percent"
                  iconColor={Colors.accent}
                  label="HUMIDITY"
                  value={`${displayData.humidity.toFixed(0)}%`}
                />
              )}
              {displayData.battery != null && (
                <TelemetryTile
                  icon={
                    displayData.battery > 80 ? "battery" :
                    displayData.battery > 50 ? "battery-70" :
                    displayData.battery > 25 ? "battery-40" :
                    "battery-20"
                  }
                  iconColor={
                    displayData.battery > 25 ? Colors.normal :
                    displayData.battery > 10 ? Colors.medium : Colors.critical
                  }
                  label="BATTERY"
                  value={`${displayData.battery.toFixed(0)}%`}
                />
              )}
              {displayData.flame != null && (
                <TelemetryTile
                  icon={displayData.flame ? "fire" : "fire-off"}
                  iconColor={displayData.flame ? Colors.critical : Colors.textMuted}
                  label="FLAME"
                  value={displayData.flame ? "DETECTED" : "Clear"}
                  highlight={displayData.flame}
                />
              )}
              {displayData.firmwareConfidence != null && (
                <TelemetryTile
                  icon="brain"
                  iconColor={
                    displayData.firmwareConfidence >= 0.7 ? Colors.critical :
                    displayData.firmwareConfidence >= 0.4 ? Colors.high :
                    displayData.firmwareConfidence >= 0.15 ? Colors.medium : Colors.normal
                  }
                  label="FW CONFIDENCE"
                  value={`${Math.round(displayData.firmwareConfidence * 100)}%`}
                />
              )}
            </View>

            {displayData.firmwareAlertReason && displayData.firmwareAlertReason !== "Nominal" && (
              <View style={styles.fwReasonBox}>
                <MaterialCommunityIcons name="information-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.fwReasonText} numberOfLines={2}>
                  {displayData.firmwareAlertReason}
                </Text>
              </View>
            )}
          </View>
        )}

        {!displayData && activeAlerts.length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="access-point-network-off" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Awaiting Hardware</Text>
              <Text style={styles.emptyDesc}>
                No live sensor data right now. Connect your UnifyOS device, or run a scenario from Settings to preview the system.
              </Text>
            </View>
          </View>
        )}

        {displayData && worstDevice && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{worstDevice.location}</Text>
              <Text style={styles.deviceTag}>{worstDevice.name}</Text>
            </View>
            <View style={styles.gaugeGrid}>
              <SensorGauge
                label="Temperature"
                value={displayData.temperature}
                unit="°C"
                min={15}
                max={80}
                warnThreshold={35}
                alertThreshold={45}
                color={Colors.temp}
                icon={<MaterialCommunityIcons name="thermometer" size={14} color={Colors.temp} />}
                isAnomaly={displayData.temperature > 45}
              />
              <SensorGauge
                label="Smoke"
                value={displayData.smoke}
                unit="ppm"
                min={50}
                max={600}
                warnThreshold={250}
                alertThreshold={400}
                color={Colors.smoke}
                icon={<MaterialCommunityIcons name="smoke" size={14} color={Colors.smoke} />}
                isAnomaly={displayData.smoke > 400}
              />
            </View>
            <View style={styles.gaugeGrid}>
              <View style={[styles.miniCard, displayData.motion ? styles.miniCardActive : styles.miniCardInactive]}>
                <MaterialCommunityIcons
                  name="motion-sensor"
                  size={22}
                  color={displayData.motion ? Colors.motion : Colors.textMuted}
                />
                <Text style={[styles.miniLabel, { color: displayData.motion ? Colors.motion : Colors.textMuted }]}>
                  {displayData.motion ? "MOTION" : "STILL"}
                </Text>
                <Text style={styles.miniSub}>Motion Sensor</Text>
              </View>
              <View style={[styles.miniCard, displayData.button ? styles.miniCardCritical : styles.miniCardInactive]}>
                <MaterialCommunityIcons
                  name={displayData.button ? "alert-decagram" : "shield-check"}
                  size={22}
                  color={displayData.button ? Colors.critical : Colors.textMuted}
                />
                <Text style={[styles.miniLabel, { color: displayData.button ? Colors.critical : Colors.textMuted }]}>
                  {displayData.button ? "PANIC!" : "SAFE"}
                </Text>
                <Text style={styles.miniSub}>Panic Button</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Devices</Text>
          </View>
          <View style={styles.deviceGrid}>
            {devices.map(device => {
              const data = getDeviceSensorData(device.id);
              const statusColor = device.status === "critical" ? Colors.critical :
                                  device.status === "warning" ? Colors.high :
                                  device.status === "online" ? Colors.normal : Colors.textMuted;
              return (
                <View
                  key={device.id}
                  style={styles.deviceMiniCard}
                  onTouchEnd={() => router.push({ pathname: "/device/[id]", params: { id: device.id } })}
                >
                  <View style={[styles.deviceMiniDot, { backgroundColor: statusColor }]} />
                  <Text style={styles.deviceMiniName} numberOfLines={1}>{device.name}</Text>
                  <Text style={styles.deviceMiniLoc} numberOfLines={1}>{device.location}</Text>
                  {data && (
                    <Text style={[styles.deviceMiniTemp, {
                      color: data.temperature > 45 ? Colors.critical : data.temperature > 35 ? Colors.high : Colors.textSecondary
                    }]}>
                      {data.temperature.toFixed(0)}°C
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TelemetryTile({
  icon,
  iconColor,
  label,
  value,
  highlight,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.telemetryTile, highlight ? styles.telemetryTileHighlight : null]}>
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      <Text style={styles.telemetryLabel}>{label}</Text>
      <Text style={[styles.telemetryValue, { color: highlight ? Colors.critical : Colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  aboutHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: Colors.bgCardElevated,
  },
  aboutHeaderText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  signInText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarDropdown: {
    position: "absolute",
    top: 72,
    right: 16,
    zIndex: 100,
    backgroundColor: Colors.bgCardElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    minWidth: 180,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  dropdownName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  dropdownEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 8 },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoutText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.critical },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusBarText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  quickActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  qaBtn: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  qaBtnRed: { borderColor: Colors.criticalBorder, backgroundColor: Colors.criticalBg },
  qaBtnAmber: { borderColor: "rgba(234,179,8,0.4)", backgroundColor: "rgba(234,179,8,0.1)" },
  qaBtnGreen: { borderColor: Colors.normalBorder, backgroundColor: Colors.normalBg },
  qaBtnDefault: { borderColor: Colors.border, backgroundColor: Colors.bgCard },
  qaBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statusCard: { borderRadius: 18, borderWidth: 1, padding: 18 },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  statusText: { flex: 1 },
  statusLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  statusValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10 },
  statChip: { alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionCount: { fontSize: 12, color: Colors.critical, fontFamily: "Inter_700Bold", backgroundColor: Colors.criticalBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  deviceTag: { fontSize: 11, color: Colors.accent, fontFamily: "Inter_500Medium" },
  gaugeGrid: { flexDirection: "row", gap: 10 },
  miniCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, borderWidth: 1 },
  miniCardActive: { backgroundColor: Colors.normalBg, borderColor: Colors.normalBorder },
  miniCardInactive: { backgroundColor: Colors.bgCard, borderColor: Colors.border },
  miniCardCritical: { backgroundColor: Colors.criticalBg, borderColor: Colors.criticalBorder },
  miniLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  miniSub: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  moreAlerts: { fontSize: 12, color: Colors.accent, fontFamily: "Inter_500Medium", textAlign: "center", paddingVertical: 4 },
  deviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  deviceMiniCard: { width: "47.5%", backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 3 },
  deviceMiniDot: { width: 7, height: 7, borderRadius: 3.5, marginBottom: 4 },
  deviceMiniName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.text },
  deviceMiniLoc: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  deviceMiniTemp: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 4 },
  emptyCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 17,
  },
  liveTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  livePulse: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.normal },
  fwLevelTag: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  telemetryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  telemetryTile: {
    width: "47.5%",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  telemetryTileHighlight: {
    borderColor: Colors.criticalBorder,
    backgroundColor: Colors.criticalBg,
  },
  telemetryLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  telemetryValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  fwReasonBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  fwReasonText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
