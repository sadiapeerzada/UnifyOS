import { useEffect, useRef, useState } from 'react';

export interface SensorReading {
  temperature: number;
  smoke: number;
  motion: boolean;
  button: number;
  isLive: boolean;
}

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : 'http://localhost:8080/api';

const WS_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `wss://${process.env.EXPO_PUBLIC_DOMAIN}/api/ws`
  : 'ws://localhost:8080/api/ws';

function generateDemoReading(motionToggleRef: React.MutableRefObject<{ last: number; state: boolean }>): SensorReading {
  const now = Date.now();
  if (now - motionToggleRef.current.last >= 45000) {
    motionToggleRef.current.state = !motionToggleRef.current.state;
    motionToggleRef.current.last = now;
  }
  return {
    temperature: 24 + Math.sin(now / 10000) * 2,
    smoke: 120 + Math.random() * 60,
    motion: motionToggleRef.current.state,
    button: 0,
    isLive: false,
  };
}

export function useSensorData(): SensorReading {
  const motionToggleRef = useRef({ last: Date.now(), state: true });
  const [reading, setReading] = useState<SensorReading>(() => generateDemoReading(motionToggleRef));
  const wsRef = useRef<WebSocket | null>(null);
  const hardwareModeRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tryHardwareMode() {
      try {
        const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) return;
        if (cancelled) return;
        connectWebSocket();
      } catch {
      }
    }

    function connectWebSocket() {
      try {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!cancelled) {
            hardwareModeRef.current = true;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'sensor-update' && msg.data) {
              setReading({
                temperature: msg.data.temperature,
                smoke: msg.data.smoke,
                motion: Boolean(msg.data.motion),
                button: msg.data.button,
                isLive: true,
              });
            }
          } catch {}
        };

        ws.onerror = () => {
          hardwareModeRef.current = false;
          startDemoInterval();
        };

        ws.onclose = () => {
          if (!cancelled) {
            hardwareModeRef.current = false;
            startDemoInterval();
          }
        };
      } catch {
        startDemoInterval();
      }
    }

    function startDemoInterval() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        if (!hardwareModeRef.current && !cancelled) {
          setReading(generateDemoReading(motionToggleRef));
        }
      }, 2000);
    }

    startDemoInterval();
    tryHardwareMode();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return reading;
}

export async function simulateEmergency(): Promise<{ severity: string; confidence: number; message: string; suggestedAction: string }> {
  const res = await fetch(`${API_BASE}/sensor-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temperature: 75, smoke: 750, motion: 1, button: 1, deviceId: 'device-001' }),
  });
  if (!res.ok) throw new Error('Failed to post sensor data');
  return res.json();
}
