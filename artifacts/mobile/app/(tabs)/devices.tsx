import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { useDashboard } from "@/context/DashboardContext";

interface DeviceInfo {
  setupBy: string;
  setupDate: string;
}

function generateGraphData() {
  const points: { temp: number; smoke: number; confidence: number }[] = [];
  for (let h = 0; h < 24; h++) {
    let temp = 22 + Math.sin(h / 4) * 3;
    let smoke = 130 + Math.cos(h / 5) * 15;
    let confidence = 5 + Math.random() * 10;

    if (h === 21) { temp = 52; smoke = 750; confidence = 91; }
    else if (h === 22) { temp = 38; smoke = 380; confidence = 55; }
    else if (h === 18) { temp = 30; smoke = 210; confidence = 28; }

    points.push({
      temp: Math.min(100, (temp / 60) * 100),
      smoke: Math.min(100, (smoke / 750) * 100),
      confidence,
    });
  }
  return points;
}

const GRAPH_DATA = generateGraphData();

function AnomalyGraph({ width }: { width: number }) {
  const gw = width - 56;
  const gh = 130;
  const ml = 30;
  const mt = 10;
  const mb = 25;
  const innerH = gh - mb;

  function xPos(i: number) { return ml + (i / 23) * gw; }
  function yPos(v: number) { return mt + (1 - v / 100) * innerH; }

  const tempPath = GRAPH_DATA.map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(p.temp)}`).join(" ");
  const smokePath = GRAPH_DATA.map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(p.smoke)}`).join(" ");

  const thresholds = [
    { y: 20, color: "#22C55E", label: "Normal" },
    { y: 50, color: "#F59E0B", label: "Warn" },
    { y: 80, color: "#EF4444", label: "Critical" },
  ];

  const timeLabels = [0, 4, 8, 12, 16, 20, 23];

  return (
    <Svg width={width} height={gh + 20}>
      {thresholds.map(t => (
        <G key={t.y}>
          <Line
            x1={ml} y1={yPos(t.y)} x2={ml + gw} y2={yPos(t.y)}
            stroke={t.color} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.6}
          />
          <SvgText x={ml - 4} y={yPos(t.y) + 4} fontSize="7" fill={t.color} textAnchor="end" opacity={0.7}>
            {t.y}
          </SvgText>
        </G>
      ))}
      <Path d={smokePath} stroke="#F59E0B" strokeWidth={1.5} fill="none" opacity={0.8} />
      <Path d={tempPath} stroke={Colors.accentLight} strokeWidth={1.8} fill="none" />
      {GRAPH_DATA.map((p, i) =>
        p.confidence >= 50 ? (
          <Circle key={i} cx={xPos(i)} cy={yPos(p.confidence)} r={4} fill="#EF4444" opacity={0.9} />
        ) : null
      )}
      <Line x1={ml} y1={mt} x2={ml} y2={mt + innerH} stroke={Colors.border} strokeWidth={1} />
      <Line x1={ml} y1={mt + innerH} x2={ml + gw} y2={mt + innerH} stroke={Colors.border} strokeWidth={1} />
      {timeLabels.map(i => (
        <SvgText key={i} x={xPos(i)} y={mt + innerH + 14} fontSize="7" fill={Colors.textMuted} textAnchor="middle">
          {i === 0 ? "24h ago" : i === 23 ? "Now" : `${24 - i}h`}
        </SvgText>
      ))}
    </Svg>
  );
}

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const { devices, getDeviceSensorData, getDeviceAnomaly, alerts, deviceName, deviceLocation } = useDashboard();
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({ setupBy: "guest", setupDate: new Date().toLocaleDateString() });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const device = devices[0];
  const sensorData = device ? getDeviceSensorData(device.id) : undefined;
  const anomaly = device ? getDeviceAnomaly(device.id) : undefined;

  useEffect(() => {
    AsyncStorage.multiGet(["device_setup_by", "device_setup_at"]).then(pairs => {
      const by = pairs[0][1] || "guest";
      const at = pairs[1][1] ? new Date(pairs[1][1]).toLocaleDateString() : new Date().toLocaleDateString();
      setDeviceInfo({ setupBy: by, setupDate: at });
    });
  }, []);

  const battery = 87;
  const batteryColor = battery > 60 ? Colors.normal : battery > 30 ? Colors.medium : Colors.critical;

  const statusColor = device?.status === "critical" ? Colors.critical :
    device?.status === "warning" ? Colors.high : Colors.normal;

  const statusLabel = device?.status === "critical" ? "CRITICAL" :
    device?.status === "warning" ? "WARNING" : "ONLINE";

  const tempStatus = (sensorData?.temperature ?? 24) > 45 ? "Critical" : (sensorData?.temperature ?? 24) > 35 ? "Elevated" : "Normal";
  const smokeStatus = (sensorData?.smoke ?? 130) > 400 ? "Danger" : (sensorData?.smoke ?? 130) > 250 ? "Warning" : "Normal";

  const tempStatusColor = tempStatus === "Critical" ? Colors.critical : tempStatus === "Elevated" ? Colors.high : Colors.normal;
  const smokeStatusColor = smokeStatus === "Danger" ? Colors.critical : smokeStatus === "Warning" ? Colors.high : Colors.normal;

  const recentAlerts = alerts.slice(0, 5);

  const anomalyPeak = Math.max(...GRAPH_DATA.map(p => p.confidence), 0);
  const anomalyEvents = GRAPH_DATA.filter(p => p.confidence >= 50).length;

  const graphWidth = Math.min(width - 32, 380);

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Devices</Text>
          <Text style={styles.subtitle}>1 device active · Add more anytime</Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => { Haptics.selectionAsync(); router.push("/device-setup"); }}
          accessibilityRole="button"
        >
          <Text style={styles.addBtnText}>+ Add Device</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setExpanded(v => !v); }}
          style={[styles.deviceCard, device?.status === "critical" && styles.deviceCardCritical]}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <View>
                <Text style={styles.deviceName}>{deviceName}</Text>
                <View style={styles.locationRow}>
                  <Text style={styles.locationPin}>📍</Text>
                  <Text style={styles.locationText}>{deviceLocation}</Text>
                </View>
              </View>
            </View>
            <View style={styles.cardTopRight}>
              <View style={[styles.batteryRow, { borderColor: batteryColor + "50" }]}>
                <MaterialCommunityIcons name="battery-70" size={14} color={batteryColor} />
                <Text style={[styles.batteryText, { color: batteryColor }]}>{battery}%</Text>
              </View>
              <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
            </View>
          </View>

          <Text style={styles.lastSeen}>Last seen: just now</Text>

          <View style={styles.readingsRow}>
            <ReadingChip icon="🌡️" value={`${(sensorData?.temperature ?? 24).toFixed(1)}°C`} />
            <ReadingChip icon="💨" value={`${Math.round(sensorData?.smoke ?? 135)}ppm`} />
            <ReadingChip icon="👁" value={sensorData?.motion ? "Motion" : "Clear"} />
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
        </Pressable>

        {expanded && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Live Readings</Text>
              <View style={styles.metricsGrid}>
                <MetricCard
                  label="Temperature"
                  value={`${(sensorData?.temperature ?? 24).toFixed(1)}°C`}
                  status={tempStatus}
                  statusColor={tempStatusColor}
                  icon="thermometer"
                />
                <MetricCard
                  label="Smoke"
                  value={`${Math.round(sensorData?.smoke ?? 135)} ppm`}
                  status={smokeStatus}
                  statusColor={smokeStatusColor}
                  icon="air-filter"
                />
                <MetricCard
                  label="Motion"
                  value={sensorData?.motion ? "Detected" : "Clear"}
                  status={sensorData?.motion ? "Active" : "Idle"}
                  statusColor={sensorData?.motion ? Colors.accent : Colors.normal}
                  icon="motion-sensor"
                />
                <MetricCard
                  label="Battery"
                  value={`${battery}%`}
                  status={battery > 60 ? "Good" : battery > 30 ? "Low" : "Critical"}
                  statusColor={batteryColor}
                  icon="battery-charging"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Specifications</Text>
              <View style={styles.infoCard}>
                <SpecRow label="Device ID" value="device-001" />
                <SpecRow label="Model" value="ESP32 DevKit V1" />
                <SpecRow label="Sensors" value="MQ-2, DHT22, PIR, Button" />
                <SpecRow label="WiFi" value="Connected" valueColor={Colors.normal} />
                <SpecRow label="Firmware" value="v1.0.0" />
                <SpecRow label="Setup by" value={deviceInfo.setupBy} />
                <SpecRow label="Setup date" value={deviceInfo.setupDate} last />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Anomaly Activity (last 24h)</Text>
              <View style={styles.graphCard}>
                <AnomalyGraph width={graphWidth} />
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.accentLight }]} />
                    <Text style={styles.legendText}>Temperature</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                    <Text style={styles.legendText}>Smoke</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
                    <Text style={styles.legendText}>Anomaly</Text>
                  </View>
                </View>
                <View style={styles.graphStats}>
                  <GraphStat label="Peak confidence" value={`${Math.round(anomalyPeak)}%`} />
                  <GraphStat label="Events today" value={String(anomalyEvents)} />
                  <GraphStat label="Most recent" value="2h ago" />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>Recent Events</Text>
                <Pressable onPress={() => router.push("/(tabs)/alerts")}>
                  <Text style={styles.viewAll}>View All</Text>
                </Pressable>
              </View>
              <View style={styles.infoCard}>
                {recentAlerts.length === 0 ? (
                  <View style={{ padding: 16, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular" }}>
                      No events yet
                    </Text>
                  </View>
                ) : (
                  recentAlerts.map((alert, i) => {
                    const dotColor = alert.severity === "CRITICAL" ? Colors.critical :
                      alert.severity === "HIGH" ? Colors.high :
                      alert.severity === "MEDIUM" ? Colors.medium : Colors.normal;
                    return (
                      <View key={String(alert.id)} style={[styles.eventRow, i === recentAlerts.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={[styles.eventDot, { backgroundColor: dotColor }]} />
                        <Text style={styles.eventTime}>{timeAgo(alert.createdAt)}</Text>
                        <Text style={styles.eventMsg} numberOfLines={1}>{alert.message}</Text>
                        <Text style={[styles.eventConf, { color: dotColor }]}>{alert.confidence}%</Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ReadingChip({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.readingChip}>
      <Text style={styles.readingIcon}>{icon}</Text>
      <Text style={styles.readingValue}>{value}</Text>
    </View>
  );
}

function MetricCard({ label, value, status, statusColor, icon }: {
  label: string; value: string; status: string; statusColor: string; icon: string;
}) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon as any} size={18} color={statusColor} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={[styles.metricStatus, { backgroundColor: statusColor + "20" }]}>
        <Text style={[styles.metricStatusText, { color: statusColor }]}>{status}</Text>
      </View>
    </View>
  );
}

function SpecRow({ label, value, valueColor, last }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <View style={[styles.specRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={[styles.specValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

function GraphStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.graphStat}>
      <Text style={styles.graphStatValue}>{value}</Text>
      <Text style={styles.graphStatLabel}>{label}</Text>
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accentGlow,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.accent + "40",
  },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.accent },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  deviceCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  deviceCardCritical: {
    borderColor: Colors.criticalBorder,
    backgroundColor: Colors.criticalBg,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTopLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  deviceName: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  locationPin: { fontSize: 11 },
  locationText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  batteryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  batteryText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  lastSeen: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  readingsRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  readingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readingIcon: { fontSize: 12 },
  readingValue: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  statusBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  section: { gap: 8 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  viewAll: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.accent },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: {
    width: "47%",
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 4,
    alignItems: "flex-start",
  },
  metricValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 4 },
  metricLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  metricStatus: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 2 },
  metricStatusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  infoCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  specLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  specValue: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text, flex: 1, textAlign: "right" },
  graphCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  legendRow: { flexDirection: "row", gap: 16, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  graphStats: { flexDirection: "row", justifyContent: "space-around" },
  graphStat: { alignItems: "center", gap: 2 },
  graphStatValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  graphStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  eventDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  eventTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, width: 50 },
  eventMsg: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  eventConf: { fontSize: 11, fontFamily: "Inter_600SemiBold", flexShrink: 0 },
});
