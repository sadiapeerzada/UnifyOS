import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

let wss: WebSocketServer | null = null;
let lastHardwarePing: Date | null = null;
let deviceCount = 0;
const startTime = new Date();

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
  aiSummary?: string;
  aiAction?: string;
}) {
  if (!wss) return;
  const payload = JSON.stringify({ type: 'sensor-update', data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function recordHardwarePing(_devId: string) {
  lastHardwarePing = new Date();
  deviceCount = 1;
}

export function getStatus() {
  return {
    status: 'ok',
    lastHardwarePing: lastHardwarePing?.toISOString() ?? null,
    deviceCount,
    uptime: Math.floor((Date.now() - startTime.getTime()) / 1000),
  };
}
