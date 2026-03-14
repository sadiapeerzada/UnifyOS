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
            <Text style={styles.location}>{alert.deviceLocation}</Text>
            <Text style={styles.time}>{timeAgo(alert.createdAt)}</Text>
          </View>
          <Text style={[styles.message, compact && styles.messageCompact]} numberOfLines={compact ? 1 : 2}>
            {alert.message}
          </Text>
          {!compact && (
            <View style={styles.confidence}>
              <View style={[styles.confidenceBar, { width: `${alert.confidence}%`, backgroundColor: cfg.color }]} />
              <Text style={[styles.confidenceText, { color: cfg.color }]}>
                {Math.round(alert.confidence)}% confidence
              </Text>
            </View>
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
  dismissBtn: {
    padding: 4,
    flexShrink: 0,
  },
});
