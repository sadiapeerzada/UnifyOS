import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardProvider } from "@/context/DashboardContext";
import { AuthWrapper } from "@/components/AuthWrapper";
import { useAuth } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function CustomSplash({ opacity }: { opacity: Animated.Value }) {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, splashStyles.container, { opacity }]} pointerEvents="none">
      <View style={splashStyles.inner}>
        <View style={splashStyles.logoWrap}>
          <MaterialCommunityIcons name="shield-check" size={64} color="#1A73E8" />
        </View>
        <Text style={splashStyles.title}>UnifyOS</Text>
        <Text style={splashStyles.sub}>Real-time Crisis Coordination</Text>
      </View>
      <Text style={splashStyles.footer}>Team BlackBit · Google Solution Challenge 2026</Text>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0D1B3E",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  inner: {
    alignItems: "center",
    gap: 14,
  },
  logoWrap: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: "rgba(26,115,232,0.12)",
    borderWidth: 1,
    borderColor: "rgba(26,115,232,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 44,
    fontFamily: Platform.OS === "web" ? "system-ui" : "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -1.5,
  },
  sub: {
    fontSize: 13,
    fontFamily: Platform.OS === "web" ? "system-ui" : "Inter_400Regular",
    color: "#8B9EC5",
  },
  footer: {
    position: "absolute",
    bottom: 44,
    fontSize: 11,
    fontFamily: Platform.OS === "web" ? "system-ui" : "Inter_400Regular",
    color: "#3D5278",
  },
});

function RootLayoutNav() {
  const pathname = usePathname();
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const parsed = Linking.parse(url);
      if (parsed.scheme === "unifyos" && parsed.path === "setup") {
        const deviceId = parsed.queryParams?.device_id as string | undefined;
        router.push({ pathname: "/device-setup", params: { device_id: deviceId || "UnifyOS-001" } });
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const publicRoutes = ["/", "/auth", "/login", "/signup"];
    if (!isLoading && !currentUser && !publicRoutes.includes(pathname)) {
      router.replace("/auth");
    }
  }, [currentUser, isLoading, pathname]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0E1A" } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="device/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="device-setup" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="device-intro" options={{ headerShown: false }} />
      <Stack.Screen name="emergency-contacts" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="login" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="signup" options={{ headerShown: false, presentation: "card" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [splashDone, setSplashDone] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      const timer = setTimeout(() => {
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setSplashDone(true));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <DashboardProvider>
            <AuthWrapper>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                  {!splashDone && <CustomSplash opacity={splashOpacity} />}
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AuthWrapper>
          </DashboardProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
