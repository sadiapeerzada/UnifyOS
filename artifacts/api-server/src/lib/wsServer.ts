import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

let wss: WebSocketServer | null = null;
const startTime = new Date();

interface DevicePing {
  lastPing: Date;
  battery: number;
  lastReading: { temp: number; smoke: number };
  roomId: string;
  location: string;
}

const devicePings = new Map<string, DevicePing>();

const DEVICE_LOCATIONS: Record<string, string> = {
  'ESP32-001': 'Main Lobby',
  'ESP32-002': 'Floor 2 East Wing',
  'ESP32-003': 'Kitchen',
  'ESP32-004': 'Conference Hall',
  'ESP32-005': 'Floor 3 West Wing',
  'device-001': 'Main Lobby',
  'device-002': 'Floor 2 East Wing',
  'device-003': 'Kitchen',
  'device-004': 'Conference Hall',
  'device-005': 'Floor 3 West Wing',
};

const DEVICE_BATTERIES: Record<string, number> = {
  'device-001': 87,
  'device-002': 73,
  'device-003': 45,
  'device-004': 92,
  'device-005': 28,
};

export function initWebSocketServer(server: import('http').Server) {
  wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (_ws: WebSocket, _req: IncomingMessage) => {
  });

  return wss;
}

export function broadcastSensorUpdate(data: {
  deviceId: string;
  temperature: number;
  smoke: number;
  motion: number;
  button: number;
  severity: string;
  confidence: number;
  message: string;
  battery?: number;
  roomId?: string;
  crowdDensity?: string;
  audioAnomaly?: boolean;
  aiSummary?: string;
  aiAction?: string;
  aiEstimatedCause?: string;
}) {
  if (!wss) return;
  const payload = JSON.stringify({ type: 'sensor-update', data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function recordHardwarePing(
  devId: string,
  extra?: { battery?: number; roomId?: string; temp?: number; smoke?: number }
) {
  const existing = devicePings.get(devId);
  devicePings.set(devId, {
    lastPing: new Date(),
    battery: extra?.battery ?? existing?.battery ?? DEVICE_BATTERIES[devId] ?? 100,
    lastReading: {
      temp: extra?.temp ?? existing?.lastReading?.temp ?? 0,
      smoke: extra?.smoke ?? existing?.lastReading?.smoke ?? 0,
    },
    roomId: extra?.roomId ?? existing?.roomId ?? '',
    location: DEVICE_LOCATIONS[devId] ?? 'Unknown',
  });
}

export function getDeviceStatuses() {
  const now = Date.now();

  const devices = Array.from(devicePings.entries()).map(([deviceId, ping]) => {
    const secondsSinceLastPing = Math.floor((now - ping.lastPing.getTime()) / 1000);
    const status = secondsSinceLastPing > 60 ? 'offline' : 'online';
    return {
      device_id: deviceId,
      room_id: ping.roomId,
      location: ping.location,
      status,
      lastPing: ping.lastPing.toISOString(),
      secondsSinceLastPing,
      battery: ping.battery,
      lastReading: ping.lastReading,
    };
  });

  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status === 'offline');

  return {
    devices,
    totalOnline: onlineDevices.length,
    totalOffline: offlineDevices.length,
    offlineDevices: offlineDevices.map(d => d.device_id),
  };
}

export function getStatus() {
  const pings = Array.from(devicePings.values());
  const lastPing =
    pings.length > 0
      ? new Date(Math.max(...pings.map(p => p.lastPing.getTime())))
      : null;

  return {
    status: 'ok',
    lastHardwarePing: lastPing?.toISOString() ?? null,
    deviceCount: devicePings.size,
    uptime: Math.floor((Date.now() - startTime.getTime()) / 1000),
  };
}
