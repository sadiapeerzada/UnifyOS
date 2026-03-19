import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Speech from 'expo-speech';

export interface SensorData {
  temperature: number;
  smoke: number;
  motion: number;
  button: number;
}

export interface Device {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline" | "warning" | "critical";
  lastSeen: string;
  createdAt: string;
  sensorData?: SensorData;
}

export interface Alert {
  id: string | number;
  deviceId: string;
  deviceName: string;
  deviceLocation: string;
  severity: "NORMAL" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  anomalies: string[];
  message: string;
  action: string;
  dismissed: boolean;
  seen: boolean;
  createdAt: string;
  aiSummary?: string;
  aiAction?: string;
  aiEstimatedCause?: string;
  triggeredSensors?: string[];
  explanation?: string;
  translatedMessages?: Record<string, string>;
}

const DEMO_TRANSLATED_MESSAGES: Record<string, string> = {
  en: "Emergency detected. Please evacuate immediately.",
  hi: "आपातकाल! कृपया तुरंत निकासी करें।",
  ur: "ہنگامی صورتحال! فوری طور پر نکلیں۔",
  ar: "طوارئ! يرجى الإخلاء فوراً.",
  fr: "Urgence! Veuillez évacuer immédiatement.",
};

export interface AnomalyResult {
  severity: "NORMAL" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  anomalies: string[];
  action: string;
  message: string;
}

const BASE_DEVICES: Device[] = [
  { id: "device-001", name: "UnifyOS-001", location: "Main Lobby", status: "online", lastSeen: new Date().toISOString(), createdAt: new Date().toISOString() },
];

let _motionState = true;
let _motionLast = Date.now();

function generateSensorData(deviceId: string, tick: number, scenario: string): SensorData {
  const now = Date.now();
  if (now - _motionLast >= 45000) {
    _motionState = !_motionState;
    _motionLast = now;
  }

  if (scenario === "fire") {
    const progress = Math.min((tick % 60) / 60, 1);
    return {
      temperature: 22 + progress * 45,
      smoke: 150 + progress * 350,
      motion: progress > 0.3 ? 0 : 1,
      button: progress > 0.7 ? 1 : 0,
    };
  }

  if (scenario === "smoke") {
    const progress = Math.min((tick % 45) / 45, 1);
    return {
      temperature: 22 + progress * 8,
      smoke: 180 + progress * 280,
      motion: 1,
      button: 0,
    };
  }

  return {
    temperature: 24 + Math.sin(Date.now() / 10000) * 2,
    smoke: 120 + Math.random() * 20,
    motion: _motionState ? 1 : 0,
    button: 0,
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

  const clamped = Math.min(confidence, 100);

  if (confidence >= 80) return { severity: "CRITICAL", confidence: clamped, anomalies, action: "EVACUATE_IMMEDIATELY", message: "Fire detected! Evacuate immediately." };
  if (confidence >= 50) return { severity: "HIGH", confidence: clamped, anomalies, action: "ALERT_STAFF", message: "Potential fire - investigate immediately." };
  if (confidence >= 20) return { severity: "MEDIUM", confidence: clamped, anomalies, action: "MONITOR", message: "Unusual activity detected." };
  return { severity: "NORMAL", confidence: 0, anomalies: [], action: "NONE", message: "All sensors normal." };
}

function buildDemoAlerts(deviceName: string, deviceLocation: string): Alert[] {
  return [
    {
      id: "demo-001",
      deviceId: "device-001",
      deviceName,
      deviceLocation,
      severity: "HIGH",
      confidence: 73,
      anomalies: ["TEMP_ELEVATED", "SMOKE_DETECTED"],
      message: "Elevated temperature and smoke detected",
      action: "ALERT_STAFF",
      dismissed: false,
      seen: false,
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      aiSummary: "Temperature 12°C above baseline with smoke at 380ppm. Pattern consistent with early smoke accumulation. Recommend immediate investigation.",
      aiAction: "Alert staff. Investigate now.",
      explanation: "Temperature rose 12°C above normal baseline. Smoke levels 260ppm above normal.",
      triggeredSensors: ["TEMP_ELEVATED", "SMOKE_DETECTED"],
      translatedMessages: {
        en: "High temperature and smoke detected. Please investigate immediately.",
        hi: "उच्च तापमान और धुआं पाया गया। कृपया तुरंत जांच करें।",
        ur: "زیادہ درجہ حرارت اور دھواں پایا گیا۔ فوری جانچ کریں۔",
        ar: "تم اكتشاف درجة حرارة مرتفعة ودخان. يرجى التحقق فوراً.",
        fr: "Température élevée et fumée détectées. Veuillez enquêter immédiatement.",
      },
    },
    {
      id: "demo-002",
      deviceId: "device-001",
      deviceName,
      deviceLocation,
      severity: "MEDIUM",
      confidence: 42,
      anomalies: ["MOTION_DETECTED"],
      message: "Unusual motion pattern detected",
      action: "MONITOR",
      dismissed: false,
      seen: false,
      createdAt: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
      aiSummary: "Repeated motion triggers outside normal hours. Could indicate unauthorized access.",
      aiAction: "Monitor closely. Check for false trigger.",
      explanation: "Motion sensor triggered 8 times in 5 minutes.",
      triggeredSensors: ["MOTION_DETECTED"],
      translatedMessages: {
        en: "Unusual motion detected. Please monitor the area.",
        hi: "असामान्य गतिविधि का पता चला। कृपया क्षेत्र की निगरानी करें।",
        ur: "غیر معمولی حرکت کا پتہ چلا۔ براہ کرم علاقے کی نگرانی کریں۔",
        ar: "تم اكتشاف حركة غير عادية. يرجى مراقبة المنطقة.",
        fr: "Mouvement inhabituel détecté. Veuillez surveiller la zone.",
      },
    },
    {
      id: "demo-003",
      deviceId: "device-001",
      deviceName,
      deviceLocation,
      severity: "CRITICAL",
      confidence: 91,
      anomalies: ["TEMP_CRITICAL", "SMOKE_DETECTED", "FIRE_CORRELATION", "PANIC_BUTTON"],
      message: "CRITICAL — Fire pattern confirmed",
      action: "EVACUATE_IMMEDIATELY",
      dismissed: true,
      seen: true,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      aiSummary: "Temperature 28°C above baseline with smoke at 750ppm. Panic button pressed. Triple sensor confirmation. Incident resolved by staff in 4 minutes.",
      aiAction: "Evacuate immediately. Call 112.",
      explanation: "Temperature critical at 52°C, smoke at 750ppm. Fire correlation confirmed. Staff responded in 4 minutes.",
      triggeredSensors: ["TEMP_CRITICAL", "SMOKE_DETECTED", "FIRE_CORRELATION", "PANIC_BUTTON"],
      translatedMessages: {
        en: "CRITICAL EMERGENCY. Evacuate immediately. Do not use elevators.",
        hi: "गंभीर आपातकाल। तुरंत निकासी करें। लिफ्ट का उपयोग न करें।",
        ur: "سنگین ہنگامی صورتحال۔ فوری طور پر نکلیں۔ لفٹ استعمال نہ کریں۔",
        ar: "طوارئ حرجة. أخلِ الفور. لا تستخدم المصاعد.",
        fr: "URGENCE CRITIQUE. Évacuez immédiatement. N'utilisez pas les ascenseurs.",
      },
    },
  ];
}

interface DashboardContextValue {
  devices: Device[];
  alerts: Alert[];
  activeAlerts: Alert[];
  scenario: string;
  setScenario: (s: string) => void;
  dismissAlert: (id: string | number) => void;
  dismissAllAlerts: () => void;
  clearAlertHistory: () => void;
  markAlertsSeen: () => void;
  getDeviceSensorData: (deviceId: string) => SensorData | undefined;
  getDeviceAnomaly: (deviceId: string) => AnomalyResult | undefined;
  isLive: boolean;
  tick: number;
  deviceName: string;
  deviceLocation: string;
  updateDeviceInfo: (name: string, location: string) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const ALERT_STORAGE_KEY = "unifyos_alert_history";
const DEMO_ALERTS_LOADED_KEY = "unifyos_demo_alerts_loaded";

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [deviceName, setDeviceName] = useState("UnifyOS-001");
  const [deviceLocation, setDeviceLocation] = useState("Main Lobby");
  const [devices, setDevices] = useState<Device[]>(BASE_DEVICES);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scenario, setScenarioState] = useState("normal");
  const [tick, setTick] = useState(0);
  const sensorDataRef = useRef<Map<string, SensorData>>(new Map());
  const anomalyRef = useRef<Map<string, AnomalyResult>>(new Map());
  const prevSensorRef = useRef<Map<string, SensorData>>(new Map());
  const alertIdRef = useRef(1000);
  const [, forceUpdate] = useState(0);

  const setScenario = useCallback((s: string) => {
    setScenarioState(s);
    setTick(0);
  }, []);

  const updateDeviceInfo = useCallback((name: string, location: string) => {
    setDeviceName(name);
    setDeviceLocation(location);
    setDevices(prev => prev.map(d => d.id === "device-001" ? { ...d, name, location } : d));
  }, []);

  useEffect(() => {
    async function init() {
      const savedName = await AsyncStorage.getItem("device_name");
      const savedLocation = await AsyncStorage.getItem("device_location");
      const name = savedName || "UnifyOS-001";
      const location = savedLocation || "Main Lobby";
      setDeviceName(name);
      setDeviceLocation(location);
      setDevices(prev => prev.map(d => d.id === "device-001" ? { ...d, name, location } : d));

      const raw = await AsyncStorage.getItem(ALERT_STORAGE_KEY);
      const demoLoaded = await AsyncStorage.getItem(DEMO_ALERTS_LOADED_KEY);

      if (raw) {
        try { setAlerts(JSON.parse(raw)); } catch {}
      } else if (!demoLoaded) {
        const demos = buildDemoAlerts(name, location);
        setAlerts(demos);
        await AsyncStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(demos));
        await AsyncStorage.setItem(DEMO_ALERTS_LOADED_KEY, "true");
      }
    }
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const currentDevices = BASE_DEVICES.map(d => ({
      ...d,
      name: deviceName,
      location: deviceLocation,
    }));

    currentDevices.forEach(device => {
      const prev = prevSensorRef.current.get(device.id);
      const data = generateSensorData(device.id, tick, scenario);
      prevSensorRef.current.set(device.id, data);
      sensorDataRef.current.set(device.id, data);

      const anomaly = runAnomalyDetection(data, prev ?? null);
      anomalyRef.current.set(device.id, anomaly);

      if (anomaly.severity !== "NORMAL") {
        const isHighOrCritical = anomaly.severity === "CRITICAL" || anomaly.severity === "HIGH";
        const newAlert: Alert = {
          id: String(alertIdRef.current++),
          deviceId: device.id,
          deviceName,
          deviceLocation,
          severity: anomaly.severity,
          confidence: anomaly.confidence,
          anomalies: anomaly.anomalies,
          message: anomaly.message,
          action: anomaly.action,
          dismissed: false,
          seen: false,
          createdAt: new Date().toISOString(),
          triggeredSensors: anomaly.anomalies,
          ...(isHighOrCritical ? { translatedMessages: DEMO_TRANSLATED_MESSAGES } : {}),
        };

        if (anomaly.severity === "CRITICAL") {
          AsyncStorage.getItem("unifyos_voice_alerts").then(val => {
            if (val !== "false") {
              Speech.speak(`Emergency alert. ${deviceLocation}. ${anomaly.message}`, {
                language: "en-US",
                pitch: 1.0,
                rate: 0.85,
              });
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

    setDevices(currentDevices.map(d => {
      const anomaly = anomalyRef.current.get(d.id);
      return {
        ...d,
        lastSeen: new Date().toISOString(),
        status: anomaly?.severity === "CRITICAL" ? "critical" :
                anomaly?.severity === "HIGH" ? "warning" :
                anomaly?.severity === "MEDIUM" ? "warning" : "online",
        sensorData: sensorDataRef.current.get(d.id),
      };
    }));

    forceUpdate(n => n + 1);
  }, [tick, scenario, deviceName, deviceLocation]);

  const dismissAlert = useCallback((id: string | number) => {
    setAlerts(prev => {
      const updated = prev.map(a => String(a.id) === String(id) ? { ...a, dismissed: true } : a);
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

  const markAlertsSeen = useCallback(() => {
    setAlerts(prev => {
      const updated = prev.map(a => ({ ...a, seen: true }));
      AsyncStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
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
    markAlertsSeen,
    getDeviceSensorData,
    getDeviceAnomaly,
    isLive: true,
    tick,
    deviceName,
    deviceLocation,
    updateDeviceInfo,
  }), [devices, alerts, activeAlerts, scenario, setScenario, dismissAlert, dismissAllAlerts, clearAlertHistory, markAlertsSeen, getDeviceSensorData, getDeviceAnomaly, tick, deviceName, deviceLocation, updateDeviceInfo]);

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
