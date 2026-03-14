import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AlertBanner } from "@/components/AlertBanner";
import { SensorGauge } from "@/components/SensorGauge";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Colors } from "@/constants/colors";
import { useDashboard } from "@/context/DashboardContext";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { devices, activeAlerts, dismissAlert, getDeviceSensorData, getDeviceAnomaly } = useDashboard();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const criticalCount = activeAlerts.filter(a => a.severity === "CRITICAL").length;
  const highCount = activeAlerts.filter(a => a.severity === "HIGH").length;
  const normalDevices = devices.filter(d => d.status === "online").length;

  const worstDevice = devices.find(d => d.status === "critical") || devices.find(d => d.status === "warning") || devices[0];
  const displayData = worstDevice ? getDeviceSensorData(worstDevice.id) : undefined;
  const displayAnomaly = worstDevice ? getDeviceAnomaly(worstDevice.id) : undefined;

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

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Live sensor monitoring</Text>
        </View>
        <LiveIndicator />
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
              const anomaly = getDeviceAnomaly(device.id);
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
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
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
});
