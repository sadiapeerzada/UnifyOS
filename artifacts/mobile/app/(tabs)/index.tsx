import { useEffect } from "react";
import { router } from "expo-router";

export default function TabIndex() {
  useEffect(() => {
    router.replace("/(tabs)/dashboard");
  }, []);
  return null;
}
