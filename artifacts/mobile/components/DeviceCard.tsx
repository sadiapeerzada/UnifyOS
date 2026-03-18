import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { Device, SensorData, AnomalyResult } from "@/context/DashboardContext";

interface DeviceCardProps {
  device: Device;
  sensorData?: SensorData;
  anomaly?: AnomalyResult;
  onPress: () => void;
}

const STATUS_COLORS = {
  online: Colors.normal,
  offline: Colors.textMuted,
  warning: Colors.high,
  critical: Colors.critical,
};

export function DeviceCard({ device, sensorData, anomaly, onPress }: DeviceCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;

  const statusColor = STATUS_COLORS[device.status] ?? Colors.textMuted;
  const isCritical = device.status === "critical";
  const isWarning = device.status === "warning";

  useEffect(() => {
    if (isCritical || isWarning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(dotOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      dotOpacity.setValue(1);
    }
  }, [isCritical, isWarning]);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const tempColor = sensorData && sensorData.temperature > 45 ? Colors.critical :
                    sensorData && sensorData.temperature > 35 ? Colors.high : Colors.temp;
  const smokeColor = sensorData && sensorData.smoke > 400 ? Colors.critical :
                     sensorData && sensorData.smoke > 250 ? Colors.high : Colors.smoke;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPress={handlePress} style={[
        styles.container,
        isCritical && styles.containerCritical,
        isWarning && styles.containerWarning,
      ]}>
        <View style={styles.header}>
          <View style={styles.statusRow}>
            <Animated.View style={[styles.statusDot, { backgroundColor: statusColor, opacity: dotOpacity }]} />
            <Text style={styles.deviceName}>{device.name}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusColor + "40", backgroundColor: statusColor + "15" }]}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{device.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.location}>
          <Feather name="map-pin" size={11} color={Colors.textMuted} />
          <Text style={styles.locationText}>{device.location}</Text>
        </View>

        {sensorData ? (
          <View style={styles.readings}>
            <ReadingPill
              icon={<MaterialCommunityIcons name="thermometer" size={12} color={tempColor} />}
              value={`${sensorData.temperature.toFixed(1)}°C`}
              color={tempColor}
            />
            <ReadingPill
              icon={<MaterialCommunityIcons name="smoke" size={12} color={smokeColor} />}
              value={`${sensorData.smoke.toFixed(0)} ppm`}
              color={smokeColor}
            />
            <ReadingPill
              icon={<MaterialCommunityIcons name="motion-sensor" size={12} color={sensorData.motion ? Colors.normal : Colors.textMuted} />}
              value={sensorData.motion ? "Motion" : "Still"}
              color={sensorData.motion ? Colors.normal : Colors.textMuted}
            />
            {sensorData.button === 1 && (
              <ReadingPill
                icon={<MaterialCommunityIcons name="alert" size={12} color={Colors.critical} />}
                value="PANIC"
                color={Colors.critical}
              />
            )}
          </View>
        ) : (
          <View style={styles.readings}>
            <Text style={styles.noData}>No data yet</Text>
          </View>
        )}

        {anomaly && anomaly.severity !== "NORMAL" && (
          <View style={[styles.anomalyRow, {
            backgroundColor: isCritical ? Colors.criticalBg : Colors.highBg,
          }]}>
            <MaterialCommunityIcons
              name={isCritical ? "fire-alert" : "alert-circle-outline"}
              size={12}
              color={isCritical ? Colors.critical : Colors.high}
            />
            <Text style={[styles.anomalyMsg, { color: isCritical ? Colors.critical : Colors.high }]} numberOfLines={1}>
              {anomaly.message}
            </Text>
            <Text style={[styles.anomalyConf, { color: isCritical ? Colors.critical : Colors.high }]}>
              {Math.round(anomaly.confidence)}%
            </Text>
          </View>
        )}

        <Feather name="chevron-right" size={16} color={Colors.textMuted} style={styles.arrow} />
      </Pressable>
    </Animated.View>
  );
}

function ReadingPill({ icon, value, color }: { icon: React.ReactNode; value: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color + "30", backgroundColor: color + "10" }]}>
      {icon}
      <Text style={[styles.pillText, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerCritical: {
    borderColor: Colors.criticalBorder,
    backgroundColor: Colors.criticalBg,
  },
  containerWarning: {
    borderColor: Colors.highBorder,
    backgroundColor: Colors.highBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deviceName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  readings: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  noData: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  anomalyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
  },
  anomalyMsg: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  anomalyConf: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  arrow: {
    position: "absolute",
    right: 14,
    top: 16,
  },
});
