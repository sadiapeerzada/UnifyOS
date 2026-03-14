import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AlertBanner } from "@/components/AlertBanner";
import { Colors } from "@/constants/colors";
import { useDashboard } from "@/context/DashboardContext";

type Filter = "all" | "active" | "critical" | "high" | "medium";

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const { alerts, dismissAlert } = useDashboard();
  const [filter, setFilter] = useState<Filter>("active");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const filteredAlerts = alerts.filter(a => {
    if (filter === "active") return !a.dismissed && a.severity !== "NORMAL";
    if (filter === "critical") return a.severity === "CRITICAL";
    if (filter === "high") return a.severity === "HIGH";
    if (filter === "medium") return a.severity === "MEDIUM";
    return true;
  });

  const activeCount = alerts.filter(a => !a.dismissed && a.severity !== "NORMAL").length;
  const criticalCount = alerts.filter(a => a.severity === "CRITICAL").length;

  const dismissAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    filteredAlerts.forEach(a => dismissAlert(a.id));
  };

  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: "active", label: "Active", count: activeCount },
    { key: "critical", label: "Critical", count: criticalCount },
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
    { key: "all", label: "All" },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Alert History</Text>
          <Text style={styles.subtitle}>{alerts.length} total events logged</Text>
        </View>
        {filteredAlerts.length > 0 && (
          <Pressable onPress={dismissAll} style={styles.clearBtn}>
            <Feather name="check-square" size={14} color={Colors.textSecondary} />
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map(f => (
          <Pressable
            key={f.key}
            onPress={() => { Haptics.selectionAsync(); setFilter(f.key); }}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
            {f.count !== undefined && f.count > 0 && (
              <View style={[styles.filterBadge, filter === f.key ? styles.filterBadgeActive : null]}>
                <Text style={[styles.filterBadgeText, filter === f.key && styles.filterBadgeTextActive]}>
                  {f.count}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredAlerts.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="shield" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No alerts</Text>
            <Text style={styles.emptyText}>All systems are operating normally</Text>
          </View>
        ) : (
          filteredAlerts.map(alert => (
            <AlertBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => dismissAlert(alert.id)}
            />
          ))
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
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.bgCard,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  filterScroll: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  filterTextActive: {
    color: "#fff",
  },
  filterBadge: {
    backgroundColor: Colors.criticalBg,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  filterBadgeText: {
    fontSize: 10,
    color: Colors.critical,
    fontFamily: "Inter_700Bold",
  },
  filterBadgeTextActive: {
    color: "#fff",
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 4,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
