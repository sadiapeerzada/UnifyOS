import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

let wss: WebSocketServer | null = null;
const startTime = new Date();

const devicePings = new Map<string, Date>();
const DEVICE_STALE_MS = 60_000;

export function initWebSocketServer(server: import('http').Server) {
  wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const ip = req.socket.remoteAddress ?? 'unknown';
    console.log(`🔌 [WS] Client connected from ${ip} — total clients: ${(wss?.clients.size ?? 0)}`);
    ws.on('close', () => {
      console.log(`🔌 [WS] Client disconnected — total clients: ${Math.max(0, (wss?.clients.size ?? 1) - 1)}`);
    });
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
  aiSummary?: string;
  aiAction?: string;
  aiEstimatedCause?: string;
  humidity?: number;
  smokeRaw?: number;
  flame?: boolean;
  battery?: number;
  firmwareConfidence?: number;
  firmwareAlertLevel?: string;
  firmwareAlertReason?: string;
  crowdDensity?: 'low' | 'medium' | 'high';
  audioAnomaly?: boolean;
  isLive?: boolean;
  translatedMessages?: Record<string, string>;
}) {
  if (!wss) return;
  const payload = JSON.stringify({ type: 'sensor-update', data, timestamp: new Date().toISOString() });
  let sent = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      sent++;
    }
  });
  if (sent > 0) {
    console.log(`📡 [WS] Broadcast to ${sent} client(s) — device=${data.deviceId} severity=${data.severity}`);
  }
}

export function recordHardwarePing(deviceId: string) {
  const isNew = !devicePings.has(deviceId);
  devicePings.set(deviceId, new Date());
  if (isNew) {
    console.log(`🆕 [Hardware] New device registered: ${deviceId} — total tracked: ${devicePings.size}`);
  }
}

export function getStatus() {
  const now = Date.now();
  const activeDevices: string[] = [];
  devicePings.forEach((lastSeen, id) => {
    if (now - lastSeen.getTime() < DEVICE_STALE_MS) {
      activeDevices.push(id);
    }
  });
  const lastPing = activeDevices.length > 0
    ? new Date(Math.max(...activeDevices.map(id => devicePings.get(id)!.getTime())))
    : null;

  return {
    status: 'ok',
    lastHardwarePing: lastPing?.toISOString() ?? null,
    deviceCount: activeDevices.length,
    activeDevices,
    uptime: Math.floor((Date.now() - startTime.getTime()) / 1000),
    wsClients: wss?.clients.size ?? 0,
  };
}
