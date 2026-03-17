import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { Alert } from "@/context/DashboardContext";

interface AlertBannerProps {
  alert: Alert;
  onDismiss: () => void;
  onPress?: () => void;
  compact?: boolean;
}

const SEVERITY_CONFIG = {
  CRITICAL: {
    bg: Colors.criticalBg,
    border: Colors.criticalBorder,
    color: Colors.critical,
    label: "CRITICAL",
    icon: "fire-alert" as const,
  },
  HIGH: {
    bg: Colors.highBg,
    border: Colors.highBorder,
    color: Colors.high,
    label: "HIGH",
    icon: "alert" as const,
  },
  MEDIUM: {
    bg: Colors.mediumBg,
    border: Colors.mediumBorder,
    color: Colors.medium,
    label: "MEDIUM",
    icon: "alert-circle" as const,
  },
  NORMAL: {
    bg: Colors.normalBg,
    border: Colors.normalBorder,
    color: Colors.normal,
    label: "NORMAL",
    icon: "check-circle" as const,
  },
};

const SENSOR_COLORS: Record<string, string> = {
  TEMP: Colors.critical,
  SMOKE: Colors.high,
  BUTTON: "#A78BFA",
  MOTION: Colors.accent,
};

export function AlertBanner({ alert, onDismiss, onPress, compact }: AlertBannerProps) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

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

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

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
            <Text style={styles.location}>Alert from: {alert.deviceLocation}</Text>
            <Text style={styles.time}>{timeAgo(alert.createdAt)}</Text>
          </View>
          <Text style={[styles.message, compact && styles.messageCompact]} numberOfLines={compact ? 1 : 2}>
            {alert.message}
          </Text>
          {!compact && (
            <>
              <View style={styles.confidence}>
                <View style={[styles.confidenceBar, { width: `${alert.confidence}%`, backgroundColor: cfg.color }]} />
                <Text style={[styles.confidenceText, { color: cfg.color }]}>
                  {Math.round(alert.confidence)}% confidence
                </Text>
              </View>
              {alert.triggeredSensors && alert.triggeredSensors.length > 0 && (
                <View style={styles.sensorTags}>
                  {alert.triggeredSensors.map(s => (
                    <View key={s} style={[styles.sensorTag, { backgroundColor: (SENSOR_COLORS[s] || Colors.textSecondary) + "20", borderColor: (SENSOR_COLORS[s] || Colors.textSecondary) + "50" }]}>
                      <Text style={[styles.sensorTagText, { color: SENSOR_COLORS[s] || Colors.textSecondary }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
              {alert.aiSummary && (
                <View style={styles.aiSection}>
                  <Text style={styles.aiLabel}>AI Analysis</Text>
                  <Text style={styles.aiSummary}>{alert.aiSummary}</Text>
                  {alert.aiEstimatedCause && (
                    <View style={styles.causeRow}>
                      <Text style={styles.causeLabel}>Estimated Cause: </Text>
                      <Text style={styles.causeText}>{alert.aiEstimatedCause}</Text>
                    </View>
                  )}
                  {alert.aiAction && (
                    <Text style={styles.aiAction}>{alert.aiAction}</Text>
                  )}
                </View>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  inner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  location: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  time: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  message: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
    lineHeight: 19,
  },
  messageCompact: {
    fontSize: 12,
  },
  confidence: {
    gap: 4,
  },
  confidenceBar: {
    height: 3,
    borderRadius: 2,
    maxWidth: "100%",
  },
  confidenceText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  sensorTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sensorTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sensorTagText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  aiSection: {
    backgroundColor: "rgba(37,99,235,0.08)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    gap: 4,
  },
  aiLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  aiSummary: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  aiAction: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    lineHeight: 17,
  },
  causeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  causeLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  causeText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    flex: 1,
  },
  dismissBtn: {
    padding: 4,
    flexShrink: 0,
  },
});
