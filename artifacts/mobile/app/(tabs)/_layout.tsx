import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { usePathname } from "expo-router";
import { useDashboard } from "@/context/DashboardContext";

export default function TabLayout() {
  const { markAlertsSeen } = useDashboard();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/alerts") markAlertsSeen?.();
  }, [pathname]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="devices" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
