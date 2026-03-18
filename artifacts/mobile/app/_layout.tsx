import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as Font from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardProvider } from "@/context/DashboardContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { AuthWrapper } from "@/components/AuthWrapper";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const ONBOARDING_KEY = "unifyos_onboarding_done";
const FONT_TIMEOUT_MS = 5000;

async function loadFontsWithTimeout(): Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const fontPromise = Font.loadAsync({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  }).catch((e: unknown) => {
    console.warn("Font load failed — using system font:", e);
  });

  const timeoutPromise = new Promise<void>(resolve => {
    timeoutId = setTimeout(() => resolve(), FONT_TIMEOUT_MS);
  });

  await Promise.race([fontPromise, timeoutPromise]);
  clearTimeout(timeoutId!);
}

function LoadingScreen({ onDone }: { onDone: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        onDone();
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
      <LinearGradient colors={["#0D1B3E", "#0A1628"]} style={StyleSheet.absoluteFill} />
      <View style={styles.loadingContent}>
        <View style={styles.loadingIcon}>
          <MaterialCommunityIcons name="shield-check" size={56} color="#1A73E8" />
        </View>
        <Text style={styles.loadingTitle}>UnifyOS</Text>
        <Animated.Text
          style={[
            styles.loadingSubtitle,
            { opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
          ]}
        >
          Initialising sensors...
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0E1A" } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="device/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="login" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="guest-status" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        await loadFontsWithTimeout();
      } finally {
        try {
          await SplashScreen.hideAsync();
        } catch {}
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  async function handleLoadingDone() {
    setShowLoading(false);
    try {
      const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!onboardingDone) {
        router.replace("/onboarding");
      }
    } catch {}
  }

  if (!appReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AccessibilityProvider>
            <DashboardProvider>
              <AuthWrapper>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <RootLayoutNav />
                    {showLoading && <LoadingScreen onDone={handleLoadingDone} />}
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </AuthWrapper>
            </DashboardProvider>
          </AccessibilityProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContent: {
    alignItems: "center",
    gap: 16,
  },
  loadingIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "rgba(26,115,232,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(26,115,232,0.3)",
    marginBottom: 8,
  },
  loadingTitle: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  loadingSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8B9EC5",
  },
});
