import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Speech from 'expo-speech';
import { ENV } from "@/config/env";

export interface SensorData {
  temperature: number;
  smoke: number;
  motion: number;
  button: number;
  humidity?: number;
  flame?: boolean;
  battery?: number;
  smokeRaw?: number;
  firmwareConfidence?: number;
  firmwareAlertLevel?: string;
  firmwareAlertReason?: string;
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

function generateScenarioSensorData(tick: number, scenario: string): SensorData | null {
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

  return null;
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
  deviceId: string;
  deviceName: string;
  deviceLocation: string;
  updateDeviceInfo: (id: string, name: string, location: string) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const ALERT_STORAGE_KEY = "unifyos_alert_history";
const DEMO_ALERTS_LOADED_KEY = "unifyos_demo_alerts_loaded";
const DEMO_ALERT_ID_PREFIX = "demo-";

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeDeviceId, setActiveDeviceId] = useState("device-001");
  const [deviceName, setDeviceName] = useState("UnifyOS-001");
  const [deviceLocation, setDeviceLocation] = useState("Main Lobby");
  const [devices, setDevices] = useState<Device[]>(BASE_DEVICES);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scenario, setScenarioState] = useState("normal");
  const [tick, setTick] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const sensorDataRef = useRef<Map<string, SensorData>>(new Map());
  const anomalyRef = useRef<Map<string, AnomalyResult>>(new Map());
  const prevSensorRef = useRef<Map<string, SensorData>>(new Map());
  const liveDataRef = useRef<Map<string, SensorData>>(new Map());
  const liveSeverityRef = useRef<Map<string, { severity: AnomalyResult["severity"] | "CALIBRATING"; confidence: number; message: string; aiSummary?: string; aiAction?: string; aiEstimatedCause?: string; translatedMessages?: Record<string, string>; lastSeen: number }>>(new Map());
  const lastLiveAlertIdRef = useRef<Map<string, string>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertIdRef = useRef(1000);
  const [, forceUpdate] = useState(0);

  const setScenario = useCallback((s: string) => {
    setScenarioState(s);
    setTick(0);
  }, []);

  const updateDeviceInfo = useCallback((id: string, name: string, location: string) => {
    setActiveDeviceId(id);
    setDeviceName(name);
    setDeviceLocation(location);
    setDevices(prev => prev.map(d => d.id === id ? { ...d, name, location } : d));
  }, []);

  useEffect(() => {
    async function init() {
      const savedId = await AsyncStorage.getItem("device_id");
      const savedName = await AsyncStorage.getItem("device_name");
      const savedLocation = await AsyncStorage.getItem("device_location");
      const id = savedId || "device-001";
      const name = savedName || "UnifyOS-001";
      const location = savedLocation || "Main Lobby";
      setActiveDeviceId(id);
      setDeviceName(name);
      setDeviceLocation(location);
      setDevices(prev => prev.map(d => d.id === "device-001" ? { ...d, id, name, location } : d));

      const raw = await AsyncStorage.getItem(ALERT_STORAGE_KEY);
      if (raw) {
        try {
          const parsed: Alert[] = JSON.parse(raw);
          const cleaned = parsed.filter(a => !String(a.id).startsWith(DEMO_ALERT_ID_PREFIX));
          if (cleaned.length !== parsed.length) {
            await AsyncStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(cleaned));
          }
          setAlerts(cleaned);
        } catch {}
      }
      await AsyncStorage.removeItem(DEMO_ALERTS_LOADED_KEY);
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
    let cancelled = false;

    function connect() {
      try {
        const ws = new WebSocket(ENV.WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[Hardware] WebSocket connected:", ENV.WS_URL);
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          try {
            const msg = JSON.parse(typeof event.data === "string" ? event.data : "");
            if (msg.type !== "sensor-update" || !msg.data) return;
            const d = msg.data;
            const id: string = d.deviceId || "device-001";
            const live: SensorData = {
              temperature: Number(d.temperature ?? 0),
              smoke: Number(d.smoke ?? 0),
              motion: typeof d.motion === "boolean" ? (d.motion ? 1 : 0) : Number(d.motion ?? 0),
              button: Number(d.button ?? 0),
              humidity: d.humidity != null ? Number(d.humidity) : undefined,
              flame: d.flame === true || d.flame === 1,
              battery: d.battery != null ? Number(d.battery) : undefined,
              smokeRaw: d.smokeRaw != null ? Number(d.smokeRaw) : undefined,
              firmwareConfidence: d.firmwareConfidence != null ? Number(d.firmwareConfidence) : undefined,
              firmwareAlertLevel: d.firmwareAlertLevel,
              firmwareAlertReason: d.firmwareAlertReason,
            };
            liveDataRef.current.set(id, live);
            if (d.severity && d.severity !== "CALIBRATING") {
              liveSeverityRef.current.set(id, {
                severity: d.severity,
                confidence: Number(d.confidence ?? 0),
                message: d.message ?? "",
                aiSummary: d.aiSummary,
                aiAction: d.aiAction,
                aiEstimatedCause: d.aiEstimatedCause,
                translatedMessages: d.translatedMessages,
                lastSeen: Date.now(),
              });
            }
            setIsLive(true);
            setTick(t => t + 1);
          } catch (err) {
            console.warn("[Hardware] Bad WS message:", err);
          }
        };

        ws.onerror = () => {
          console.log("[Hardware] WebSocket error — falling back to demo");
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (!cancelled) {
            setIsLive(false);
            wsReconnectRef.current = setTimeout(connect, 5000);
          }
        };
      } catch (err) {
        console.warn("[Hardware] WS connect failed:", err);
        if (!cancelled) wsReconnectRef.current = setTimeout(connect, 5000);
      }
    }

    connect();

    liveTimeoutRef.current = setInterval(() => {
      const now = Date.now();
      let anyFresh = false;
      liveDataRef.current.forEach((_, id) => {
        const sev = liveSeverityRef.current.get(id);
        const fresh = sev ? (now - sev.lastSeen < 60000) : false;
        if (fresh) anyFresh = true;
      });
      if (!anyFresh && liveDataRef.current.size > 0) {
        liveDataRef.current.clear();
        setIsLive(false);
      }
    }, 5000);

    return () => {
      cancelled = true;
      if (wsReconnectRef.current) clearTimeout(wsReconnectRef.current);
      if (liveTimeoutRef.current) clearInterval(liveTimeoutRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const currentDevices = BASE_DEVICES.map(d => ({
      ...d,
      id: activeDeviceId,
      name: deviceName,
      location: deviceLocation,
    }));

    currentDevices.forEach(device => {
      const prev = prevSensorRef.current.get(device.id);
      const liveData = liveDataRef.current.get(device.id);
      const liveSev = liveSeverityRef.current.get(device.id);
      const liveFresh = liveSev ? (Date.now() - liveSev.lastSeen < 60000) : false;

      let data: SensorData | null = null;
      if (liveData && liveFresh) {
        data = liveData;
      } else {
        const scenarioData = generateScenarioSensorData(tick, scenario);
        if (scenarioData) data = scenarioData;
      }

      if (!data) {
        sensorDataRef.current.delete(device.id);
        prevSensorRef.current.delete(device.id);
        anomalyRef.current.delete(device.id);
        return;
      }

      prevSensorRef.current.set(device.id, data);
      sensorDataRef.current.set(device.id, data);

      let anomaly: AnomalyResult;
      if (liveSev && liveFresh) {
        anomaly = {
          severity: liveSev.severity === "CALIBRATING" ? "NORMAL" : liveSev.severity,
          confidence: liveSev.confidence,
          anomalies: [],
          action: liveSev.severity === "CRITICAL" ? "EVACUATE_IMMEDIATELY" :
                  liveSev.severity === "HIGH" ? "ALERT_STAFF" :
                  liveSev.severity === "MEDIUM" ? "MONITOR" : "NONE",
          message: liveSev.message || "Live hardware reading",
        };
      } else {
        anomaly = runAnomalyDetection(data, prev ?? null);
      }
      anomalyRef.current.set(device.id, anomaly);

      if (anomaly.severity !== "NORMAL") {
        const isHighOrCritical = anomaly.severity === "CRITICAL" || anomaly.severity === "HIGH";
        const fromLive = !!(liveSev && liveFresh);

        if (fromLive) {
          const liveKey = `${device.id}:${liveSev!.lastSeen}:${anomaly.severity}`;
          if (lastLiveAlertIdRef.current.get(device.id) === liveKey) {
            return;
          }
          lastLiveAlertIdRef.current.set(device.id, liveKey);
        }

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
          ...(fromLive && liveSev?.aiSummary ? { aiSummary: liveSev.aiSummary } : {}),
          ...(fromLive && liveSev?.aiAction ? { aiAction: liveSev.aiAction } : {}),
          ...(fromLive && liveSev?.aiEstimatedCause ? { aiEstimatedCause: liveSev.aiEstimatedCause } : {}),
          ...(fromLive && liveSev?.translatedMessages
            ? { translatedMessages: liveSev.translatedMessages }
            : isHighOrCritical
              ? { translatedMessages: DEMO_TRANSLATED_MESSAGES }
              : {}),
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
      const data = sensorDataRef.current.get(d.id);
      const liveData = liveDataRef.current.get(d.id);
      const liveSev = liveSeverityRef.current.get(d.id);
      const liveFresh = liveSev ? (Date.now() - liveSev.lastSeen < 60000) : false;
      const hasRealData = !!(liveData && liveFresh);
      return {
        ...d,
        lastSeen: new Date().toISOString(),
        status: hasRealData
          ? (anomaly?.severity === "CRITICAL" ? "critical" :
             anomaly?.severity === "HIGH" || anomaly?.severity === "MEDIUM" ? "warning" : "online")
          : data
            ? (anomaly?.severity === "CRITICAL" ? "critical" :
               anomaly?.severity === "HIGH" || anomaly?.severity === "MEDIUM" ? "warning" : "online")
            : "offline",
        sensorData: data,
      };
    }));

    forceUpdate(n => n + 1);
  }, [tick, scenario, activeDeviceId, deviceName, deviceLocation]);

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
    isLive,
    tick,
    deviceId: activeDeviceId,
    deviceName,
    deviceLocation,
    updateDeviceInfo,
  }), [devices, alerts, activeAlerts, scenario, setScenario, dismissAlert, dismissAllAlerts, clearAlertHistory, markAlertsSeen, getDeviceSensorData, getDeviceAnomaly, isLive, tick, activeDeviceId, deviceName, deviceLocation, updateDeviceInfo]);

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
