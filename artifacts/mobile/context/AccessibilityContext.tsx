import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';

const STORAGE_KEY = 'unifyos_accessibility_mode';

interface AccessibilityContextValue {
  accessibilityMode: boolean;
  setAccessibilityMode: (val: boolean) => void;
  reduceMotion: boolean;
  textScale: number;
  colors: {
    bg: string;
    text: string;
    buttonBg: string;
    buttonText: string;
    criticalColor: string;
  };
}

const A11Y_COLORS = {
  bg: '#000000',
  text: '#FFFFFF',
  buttonBg: '#FFFF00',
  buttonText: '#000000',
  criticalColor: '#FF0000',
};

const NORMAL_COLORS = {
  bg: '#0A0E1A',
  text: '#F0F4FF',
  buttonBg: '#2563EB',
  buttonText: '#FFFFFF',
  criticalColor: '#EF4444',
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [accessibilityMode, setA11yMode] = useState(false);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'true') setA11yMode(true);
    });
    AccessibilityInfo.isReduceMotionEnabled().then(val => {
      setSystemReduceMotion(val);
    });
  }, []);

  const setAccessibilityMode = useCallback((val: boolean) => {
    setA11yMode(val);
    AsyncStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
  }, []);

  const value = useMemo<AccessibilityContextValue>(() => ({
    accessibilityMode,
    setAccessibilityMode,
    reduceMotion: accessibilityMode || systemReduceMotion,
    textScale: accessibilityMode ? 4 : 0,
    colors: accessibilityMode ? A11Y_COLORS : NORMAL_COLORS,
  }), [accessibilityMode, setAccessibilityMode, systemReduceMotion]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be within AccessibilityProvider');
  return ctx;
}
