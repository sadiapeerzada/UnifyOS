import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { router, usePathname } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "gauge", route: "/(tabs)/dashboard" },
  { label: "Devices", icon: "cpu-64-bit", route: "/(tabs)/devices" },
  { label: "Alerts", icon: "bell-outline", route: "/(tabs)/alerts" },
  { label: "Settings", icon: "cog-outline", route: "/(tabs)/settings" },
  { label: "About", icon: "information-outline", route: "/about" },
];

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SidebarDrawer({ open, onClose }: SidebarDrawerProps) {
  const slideAnim = useRef(new Animated.Value(-260)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          stiffness: 280,
          damping: 26,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -260,
          useNativeDriver: true,
          stiffness: 300,
          damping: 30,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [open]);

  function navigate(route: string) {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  }

  const initials = currentUser
    ? currentUser.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "G";

  if (!open) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={open ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
        pointerEvents={open ? "auto" : "none"}
      >
        <View style={styles.sidebarHeader}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="shield-check" size={22} color={Colors.accent} />
            </View>
            <View>
              <Text style={styles.logoName}>UnifyOS</Text>
              <Text style={styles.logoSub}>Crisis Platform</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Feather name="x" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.navSection}>
          <Text style={styles.navLabel}>NAVIGATION</Text>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.route || pathname.startsWith(item.route.replace("/(tabs)", ""));
            return (
              <TouchableOpacity
                key={item.route}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => navigate(item.route)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={20}
                  color={isActive ? Colors.accent : Colors.textSecondary}
                />
                <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                  {item.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sidebarFooter}>
          <View style={styles.userRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {currentUser?.isDemo ? "Guest Mode" : currentUser?.name || "User"}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {currentUser?.isDemo ? "Limited access" : currentUser?.email || ""}
              </Text>
            </View>
          </View>
          {!currentUser?.isDemo && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => { onClose(); setTimeout(() => logout().then(() => router.replace("/")), 150); }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="logout" size={14} color={Colors.critical} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const SIDEBAR_W = 240;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_W,
    backgroundColor: Colors.bgCard,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 20,
    justifyContent: "space-between",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "web" ? 24 : 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: Colors.accent + "40",
    alignItems: "center",
    justifyContent: "center",
  },
  logoName: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -0.3 },
  logoSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navSection: { flex: 1, paddingHorizontal: 10, paddingTop: 16, gap: 2 },
  navLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    letterSpacing: 1.2,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  navItemActive: {
    backgroundColor: Colors.accentGlow,
  },
  navItemText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    flex: 1,
  },
  navItemTextActive: {
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
  },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  userInitials: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  userInfo: { flex: 1, gap: 1 },
  userName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  userEmail: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.criticalBorder,
    backgroundColor: Colors.criticalBg,
  },
  logoutText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.critical },
});
