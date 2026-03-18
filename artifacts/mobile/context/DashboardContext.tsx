import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Speech from "expo-speech";

export interface SensorData {
  temperature: number;
  smoke: number;
  motion: number;
  button: number;
  battery?: number;
  crowdDensity?: string;
  audioAnomaly?: boolean;
}

export interface Device {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline" | "warning" | "critical";
  lastSeen: string;
  createdAt: string;
  battery?: number;
  sensorData?: SensorData;
}

export interface Alert {
  id: number;
  deviceId: string;
  deviceName: string;
  deviceLocation: string;
  severity: "NORMAL" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  anomalies: string[];
  message: string;
  action: string;
  dismissed: boolean;
  createdAt: string;
  aiSummary?: string;
  aiAction?: string;
  aiEstimatedCause?: string;
  triggeredSensors?: string[];
  translatedMessages?: Record<string, string>;
}

export interface AnomalyResult {
  severity: "NORMAL" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  anomalies: string[];
  action: string;
  message: string;
}

const DEMO_BATTERIES: Record<string, number> = {
  "device-001": 87,
  "device-002": 73,
  "device-003": 45,
  "device-004": 92,
  "device-005": 28,
};

const DEMO_DEVICES: Device[] = [
  { id: "device-001", name: "ESP32-001", location: "Main Lobby", status: "online", lastSeen: new Date().toISOString(), createdAt: new Date().toISOString(), battery: 87 },
  { id: "device-002", name: "ESP32-002", location: "Floor 2 East Wing", status: "online", lastSeen: new Date().toISOString(), createdAt: new Date().toISOString(), battery: 73 },
  { id: "device-003", name: "ESP32-003", location: "Kitchen", status: "online", lastSeen: new Date().toISOString(), createdAt: new Date().toISOString(), battery: 45 },
  { id: "device-004", name: "ESP32-004", location: "Conference Hall", status: "online", lastSeen: new Date().toISOString(), createdAt: new Date().toISOString(), battery: 92 },
  { id: "device-005", name: "ESP32-005", location: "Floor 3 West Wing", status: "online", lastSeen: new Date().toISOString(), createdAt: new Date().toISOString(), battery: 28 },
];

function generateSensorData(deviceId: string, tick: number, scenario: string): SensorData {
  const base = Math.sin(tick * 0.1 + deviceId.charCodeAt(7)) * 2;

  if (scenario === "fire" && deviceId === "device-003") {
    const progress = Math.min((tick % 60) / 60, 1);
    return {
      temperature: 22 + progress * 45 + base,
      smoke: 150 + progress * 350 + base * 10,
      motion: progress > 0.3 ? 0 : 1,
      button: progress > 0.7 ? 1 : 0,
      battery: DEMO_BATTERIES[deviceId],
      crowdDensity: "high",
      audioAnomaly: progress > 0.5,
    };
  }

  if (scenario === "smoke" && deviceId === "device-003") {
    const progress = Math.min((tick % 45) / 45, 1);
    return {
      temperature: 22 + progress * 8 + base,
      smoke: 180 + progress * 280 + base * 8,
      motion: 1,
      button: 0,
      battery: DEMO_BATTERIES[deviceId],
      crowdDensity: "medium",
      audioAnomaly: false,
    };
  }

  if (deviceId === "device-003") {
    return {
      temperature: 38 + (Math.random() * 4),
      smoke: 150 + (Math.random() * 50),
      motion: 1,
      button: 0,
      battery: DEMO_BATTERIES[deviceId],
      crowdDensity: "medium",
      audioAnomaly: false,
    };
  }

  if (deviceId === "device-004") {
    return {
      temperature: 21 + base,
      smoke: 120 + base * 5,
      motion: 1,
      button: 0,
      battery: DEMO_BATTERIES[deviceId],
      crowdDensity: Math.random() > 0.3 ? "high" : "medium",
      audioAnomaly: false,
    };
  }

  return {
    temperature: 21 + base + (deviceId === "device-002" ? 2 : 0),
    smoke: 130 + base * 5 + (deviceId === "device-001" ? 20 : 0),
    motion: Math.random() > 0.3 ? 1 : 0,
    button: 0,
    battery: DEMO_BATTERIES[deviceId],
    crowdDensity: "low",
    audioAnomaly: false,
  };
}

function runAnomalyDetection(data: SensorData, prev: SensorData | null): AnomalyResult {
  let confidence = 0;
  const anomalies: string[] = [];

  if (data.temperature > 45) { confidence += 30; anomalies.push("TEMP_CRITICAL"); }
  else if (data.temperature > 35) { confidence += 10; anomalies.push("TEMP_HIGH"); }

  if (prev) {
    const tempRate = data.temperature - prev.temperature;
    if (tempRate > 2) { confidence += 20; anomalies.push("TEMP_SPIKE"); }
    const smokeRate = data.smoke - prev.smoke;
    if (smokeRate > 100) { confidence += 20; anomalies.push("SMOKE_SPIKE"); }
  }

  if (data.smoke > 400) { confidence += 30; anomalies.push("SMOKE_DETECTED"); }
  else if (data.smoke > 250) { confidence += 10; anomalies.push("SMOKE_ELEVATED"); }

  if (data.button === 1) { confidence += 15; anomalies.push("PANIC_BUTTON"); }
  if (anomalies.length > 2) { confidence += 5; }
  if (data.motion === 0 && confidence > 50) { anomalies.push("OCCUPANCY_EMPTY"); }

  if (data.audioAnomaly) { confidence += 10; anomalies.push("AUDIO_ANOMALY"); }

  const clamped = Math.min(confidence, 100);

  if (confidence >= 80) return { severity: "CRITICAL", confidence: clamped, anomalies, action: "EVACUATE_IMMEDIATELY", message: "Fire detected! Evacuate immediately." };
  if (confidence >= 50) return { severity: "HIGH", confidence: clamped, anomalies, action: "ALERT_STAFF", message: "Potential fire - investigate immediately." };
  if (confidence >= 20) return { severity: "MEDIUM", confidence: clamped, anomalies, action: "MONITOR", message: "Unusual activity detected." };
  return { severity: "NORMAL", confidence: 0, anomalies: [], action: "NONE", message: "All sensors normal." };
}

interface DashboardContextValue {
  devices: Device[];
  alerts: Alert[];
  activeAlerts: Alert[];
  scenario: string;
  setScenario: (s: string) => void;
  dismissAlert: (id: number) => void;
  dismissAllAlerts: () => void;
  clearAlertHistory: () => void;
  getDeviceSensorData: (deviceId: string) => SensorData | undefined;
  getDeviceAnomaly: (deviceId: string) => AnomalyResult | undefined;
  isLive: boolean;
  tick: number;
  offlineDevices: string[];
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const ALERT_STORAGE_KEY = "unifyos_alert_history";
const AUTO_EMERGENCY_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_EMERGENCY_DURATION_MS = 30 * 1000;

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [devices, setDevices] = useState<Device[]>(DEMO_DEVICES);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scenario, setScenarioState] = useState("normal");
  const [tick, setTick] = useState(0);
  const [offlineDevices, setOfflineDevices] = useState<string[]>([]);
  const sensorDataRef = useRef<Map<string, SensorData>>(new Map());
  const anomalyRef = useRef<Map<string, AnomalyResult>>(new Map());
  const prevSensorRef = useRef<Map<string, SensorData>>(new Map());
  const alertIdRef = useRef(1);
  const [, forceUpdate] = useState(0);
  const autoEmergencyRef = useRef<{ active: boolean; startTick: number }>({ active: false, startTick: -1 });
  const lastAutoEmergencyTimeRef = useRef<number>(Date.now());

  const setScenario = useCallback((s: string) => {
    setScenarioState(s);
    setTick(0);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(ALERT_STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          setAlerts(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const now = Date.now();
    if (now - lastAutoEmergencyTimeRef.current >= AUTO_EMERGENCY_INTERVAL_MS) {
      autoEmergencyRef.current = { active: true, startTick: tick };
      lastAutoEmergencyTimeRef.current = now;
    }

    const autoActive = autoEmergencyRef.current.active;
    const autoElapsed = (tick - autoEmergencyRef.current.startTick) * 2000;
    if (autoActive && autoElapsed >= AUTO_EMERGENCY_DURATION_MS) {
      autoEmergencyRef.current = { active: false, startTick: -1 };
    }

    DEMO_DEVICES.forEach(device => {
      const prev = prevSensorRef.current.get(device.id);

      let effectiveScenario = scenario;
      if (autoActive && device.id === "device-003") {
        effectiveScenario = "fire";
      }

      const data = generateSensorData(device.id, tick, effectiveScenario);
      prevSensorRef.current.set(device.id, data);
      sensorDataRef.current.set(device.id, data);

      const anomaly = runAnomalyDetection(data, prev ?? null);
      anomalyRef.current.set(device.id, anomaly);

      if (anomaly.severity !== "NORMAL") {
        const newAlert: Alert = {
          id: alertIdRef.current++,
          deviceId: device.id,
          deviceName: device.name,
          deviceLocation: device.location,
          severity: anomaly.severity,
          confidence: anomaly.confidence,
          anomalies: anomaly.anomalies,
          message: anomaly.message,
          action: anomaly.action,
          dismissed: false,
          createdAt: new Date().toISOString(),
        };

        if (anomaly.severity === "CRITICAL") {
          AsyncStorage.getItem("unifyos_voice_alerts").then(val => {
            if (val !== "false") {
              try {
                Speech.speak(
                  `Emergency alert. ${device.location}. ${anomaly.message}`,
                  { language: "en-US", pitch: 1.0, rate: 0.85 }
                );
              } catch {}
            }
          });
        }

        setAlerts(prev => {
          const updated = [newAlert, ...prev].slice(0, 50);
          AsyncStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    });

    setDevices(DEMO_DEVICES.map(d => {
      const anomaly = anomalyRef.current.get(d.id);
      return {
        ...d,
        lastSeen: new Date().toISOString(),
        battery: DEMO_BATTERIES[d.id],
        status: anomaly?.severity === "CRITICAL" ? "critical" :
                anomaly?.severity === "HIGH" ? "warning" :
                anomaly?.severity === "MEDIUM" ? "warning" : "online",
        sensorData: sensorDataRef.current.get(d.id),
      };
    }));

    forceUpdate(n => n + 1);
  }, [tick, scenario]);

  const dismissAlert = useCallback((id: number) => {
    setAlerts(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, dismissed: true } : a);
      AsyncStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const dismissAllAlerts = useCallback(() => {
    setAlerts(prev => {
      const updated = prev.map(a => ({ ...a, dismissed: true }));
      AsyncStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAlertHistory = useCallback(() => {
    setAlerts([]);
    AsyncStorage.removeItem(ALERT_STORAGE_KEY);
  }, []);

  const getDeviceSensorData = useCallback((deviceId: string) => {
    return sensorDataRef.current.get(deviceId);
  }, []);

  const getDeviceAnomaly = useCallback((deviceId: string) => {
    return anomalyRef.current.get(deviceId);
  }, []);

  const activeAlerts = useMemo(() =>
    alerts.filter(a => !a.dismissed && a.severity !== "NORMAL"),
    [alerts]
  );

  const value = useMemo(() => ({
    devices,
    alerts,
    activeAlerts,
    scenario,
    setScenario,
    dismissAlert,
    dismissAllAlerts,
    clearAlertHistory,
    getDeviceSensorData,
    getDeviceAnomaly,
    isLive: true,
    tick,
    offlineDevices,
  }), [devices, alerts, activeAlerts, scenario, setScenario, dismissAlert, dismissAllAlerts, clearAlertHistory, getDeviceSensorData, getDeviceAnomaly, tick, offlineDevices]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
