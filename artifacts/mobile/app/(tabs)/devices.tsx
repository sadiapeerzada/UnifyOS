import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { DeviceCard } from "@/components/DeviceCard";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Colors } from "@/constants/colors";
import { useDashboard } from "@/context/DashboardContext";

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const { devices, getDeviceSensorData, getDeviceAnomaly } = useDashboard();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const criticalDevices = devices.filter(d => d.status === "critical");
  const warningDevices = devices.filter(d => d.status === "warning");
  const normalDevices = devices.filter(d => d.status === "online" || d.status === "offline");

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Devices</Text>
          <Text style={styles.subtitle}>{devices.length} device registered · Single device deployment</Text>
        </View>
        <LiveIndicator />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {criticalDevices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Critical</Text>
            {criticalDevices.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                sensorData={getDeviceSensorData(device.id)}
                anomaly={getDeviceAnomaly(device.id)}
                onPress={() => router.push({ pathname: "/device/[id]", params: { id: device.id } })}
              />
            ))}
          </View>
        )}

        {warningDevices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Warning</Text>
            {warningDevices.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                sensorData={getDeviceSensorData(device.id)}
                anomaly={getDeviceAnomaly(device.id)}
                onPress={() => router.push({ pathname: "/device/[id]", params: { id: device.id } })}
              />
            ))}
          </View>
        )}

        {normalDevices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Normal</Text>
            {normalDevices.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                sensorData={getDeviceSensorData(device.id)}
                anomaly={getDeviceAnomaly(device.id)}
                onPress={() => router.push({ pathname: "/device/[id]", params: { id: device.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
});
