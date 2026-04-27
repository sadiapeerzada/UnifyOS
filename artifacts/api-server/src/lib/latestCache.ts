export interface LatestReading {
  deviceId: string;
  receivedAt: string;
  alertLevel?: string;
  alertType?: string;
  temperature?: number;
  humidity?: number;
  smokeEma?: number;
  smokeRaw?: number;
  flame?: boolean;
  motion?: number;
  crowdDensity?: string;
  audioAnomaly?: boolean;
  manualPanic?: boolean;
  battery?: number;
  raw?: Record<string, unknown>;
}

export const DEVICE_OFFLINE_MS = 15_000;

const latest: Map<string, LatestReading> = new Map();

export function setLatest(deviceId: string, reading: LatestReading) {
  latest.set(deviceId, reading);
}

export function getLatest(deviceId: string): LatestReading | undefined {
  return latest.get(deviceId);
}

export function getAllLatest(): LatestReading[] {
  return Array.from(latest.values());
}

export function isOnline(receivedAtIso: string | Date | null | undefined): boolean {
  if (!receivedAtIso) return false;
  const t = typeof receivedAtIso === "string" ? new Date(receivedAtIso).getTime() : receivedAtIso.getTime();
  return Date.now() - t < DEVICE_OFFLINE_MS;
}
