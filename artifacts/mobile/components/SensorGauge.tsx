import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

interface SensorGaugeProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  alertThreshold: number;
  warnThreshold: number;
  color: string;
  icon: React.ReactNode;
  isAnomaly?: boolean;
}

export function SensorGauge({
  label, value, unit, min, max, alertThreshold, warnThreshold,
  color, icon, isAnomaly,
}: SensorGaugeProps) {
  const animValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: pct,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();
  }, [pct]);

  useEffect(() => {
    if (isAnomaly) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isAnomaly]);

  const isAlert = value >= alertThreshold;
  const isWarn = value >= warnThreshold;
  const barColor = isAlert ? Colors.critical : isWarn ? Colors.high : color;

  const barWidth = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[styles.container, isAnomaly && styles.anomalyBorder, { transform: [{ scale: pulseAnim }] }]}>
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: barColor + "20" }]}>
          {icon}
        </View>
        <Text style={styles.label}>{label}</Text>
        {isAnomaly && (
          <View style={styles.anomalyBadge}>
            <Text style={styles.anomalyText}>!</Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: barColor }]}>
        {typeof value === "number" ? value.toFixed(1) : value}
        <Text style={styles.unit}> {unit}</Text>
      </Text>

      <View style={styles.barBg}>
        <Animated.View
          style={[styles.bar, { width: barWidth, backgroundColor: barColor }]}
        />
        <View style={[styles.threshold, { left: `${((warnThreshold - min) / (max - min)) * 100}%` }]} />
        <View style={[styles.threshold, styles.alertThreshold, { left: `${((alertThreshold - min) / (max - min)) * 100}%` }]} />
      </View>

      <View style={styles.range}>
        <Text style={styles.rangeText}>{min}{unit}</Text>
        <Text style={styles.rangeText}>{max}{unit}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
  },
  anomalyBorder: {
    borderColor: Colors.critical + "60",
    backgroundColor: Colors.criticalBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  anomalyBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.critical,
    alignItems: "center",
    justifyContent: "center",
  },
  anomalyText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  value: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  unit: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  barBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },
  bar: {
    height: "100%",
    borderRadius: 3,
  },
  threshold: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.high + "80",
  },
  alertThreshold: {
    backgroundColor: Colors.critical + "80",
  },
  range: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  rangeText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
});
