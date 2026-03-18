import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardProvider } from "@/context/DashboardContext";
import { AuthWrapper } from "@/components/AuthWrapper";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  useEffect(() => {
    async function checkIntroAndDeepLink() {
      const seen = await AsyncStorage.getItem("seen_device_intro");
      if (!seen) {
        router.replace("/device-intro");
        return;
      }

      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const parsed = Linking.parse(initialUrl);
        if (parsed.scheme === "unifyos" && parsed.path === "setup") {
          const deviceId = parsed.queryParams?.device_id as string | undefined;
          router.push({ pathname: "/device-setup", params: { device_id: deviceId || "UnifyOS-001" } });
        }
      }
    }
    checkIntroAndDeepLink();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      const parsed = Linking.parse(url);
      if (parsed.scheme === "unifyos" && parsed.path === "setup") {
        const deviceId = parsed.queryParams?.device_id as string | undefined;
        router.push({ pathname: "/device-setup", params: { device_id: deviceId || "UnifyOS-001" } });
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0E1A" } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="device/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="device-setup" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="device-intro" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, presentation: "modal" }} />
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
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
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AuthWrapper>
          </DashboardProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
