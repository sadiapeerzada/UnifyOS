import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

interface ConfidenceMeterProps {
  confidence: number;
  severity: string;
}

export function ConfidenceMeter({ confidence, severity }: ConfidenceMeterProps) {
  const animWidth = useRef(new Animated.Value(0)).current;

  const color = severity === "CRITICAL" ? Colors.critical :
                severity === "HIGH" ? Colors.high :
                severity === "MEDIUM" ? Colors.medium : Colors.normal;

  useEffect(() => {
    Animated.spring(animWidth, {
      toValue: confidence,
      useNativeDriver: false,
      tension: 40,
      friction: 10,
    }).start();
  }, [confidence]);

  const barWidth = animWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Confidence Score</Text>
        <Text style={[styles.pct, { color }]}>{Math.round(confidence)}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: color }]} />
        <View style={[styles.marker, { left: "20%" }]} />
        <View style={[styles.marker, { left: "50%" }]} />
        <View style={[styles.marker, { left: "80%" }]} />
      </View>
      <View style={styles.labels}>
        <Text style={styles.labelText}>Low</Text>
        <Text style={styles.labelText}>Med</Text>
        <Text style={styles.labelText}>High</Text>
        <Text style={styles.labelText}>Critical</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pct: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  track: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  marker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.bg + "80",
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  labelText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
});
