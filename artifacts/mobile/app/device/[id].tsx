import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
import { SensorGauge } from "@/components/SensorGauge";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { LiveIndicator } from "@/components/LiveIndicator";
import { AlertBanner } from "@/components/AlertBanner";
import { Colors } from "@/constants/colors";
import { useDashboard } from "@/context/DashboardContext";

const ANOMALY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  TEMP_CRITICAL: { label: "Temperature Critical (>45°C)", color: Colors.critical, icon: "thermometer-alert" },
  TEMP_HIGH: { label: "Temperature High (>35°C)", color: Colors.high, icon: "thermometer-chevron-up" },
  TEMP_SPIKE: { label: "Rapid Temperature Rise", color: Colors.high, icon: "trending-up" },
  SMOKE_DETECTED: { label: "Smoke Detected (>400 ppm)", color: Colors.critical, icon: "smoke" },
  SMOKE_ELEVATED: { label: "Smoke Elevated (>250 ppm)", color: Colors.high, icon: "cloud-alert" },
  SMOKE_SPIKE: { label: "Rapid Smoke Increase", color: Colors.high, icon: "arrow-up-bold" },
  PANIC_BUTTON: { label: "Panic Button Pressed", color: Colors.critical, icon: "alert-decagram" },
  OCCUPANCY_EMPTY: { label: "Room Evacuated", color: Colors.medium, icon: "run-fast" },
};

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { devices, alerts, getDeviceSensorData, getDeviceAnomaly, dismissAlert } = useDashboard();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const device = devices.find(d => d.id === id);
  const sensorData = id ? getDeviceSensorData(id) : undefined;
  const anomaly = id ? getDeviceAnomaly(id) : undefined;
  const deviceAlerts = alerts.filter(a => a.deviceId === id && !a.dismissed && a.severity !== "NORMAL");

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
