import { Router, type IRouter } from 'express';
import cors from 'cors';
import { getDeviceStatuses } from '../lib/wsServer.js';

const router: IRouter = Router();
const openCors = cors({ origin: '*' });

const FLOOR_MAP: Record<string, { floor: number; zone: string; device_id: string }> = {
  'ESP32-001': { floor: 1, zone: 'Main Lobby', device_id: 'ESP32-001' },
  'ESP32-002': { floor: 2, zone: 'East Wing', device_id: 'ESP32-002' },
  'ESP32-003': { floor: 1, zone: 'Kitchen', device_id: 'ESP32-003' },
  'ESP32-004': { floor: 2, zone: 'Conference Hall', device_id: 'ESP32-004' },
  'ESP32-005': { floor: 3, zone: 'West Wing', device_id: 'ESP32-005' },
  'device-001': { floor: 1, zone: 'Main Lobby', device_id: 'device-001' },
  'device-002': { floor: 2, zone: 'East Wing', device_id: 'device-002' },
  'device-003': { floor: 1, zone: 'Kitchen', device_id: 'device-003' },
  'device-004': { floor: 2, zone: 'Conference Hall', device_id: 'device-004' },
  'device-005': { floor: 3, zone: 'West Wing', device_id: 'device-005' },
};

function getThreatLevel(temp: number, smoke: number): string {
  if (temp > 45 || smoke > 400) return 'critical';
  if (temp > 35 || smoke > 250) return 'high';
  if (temp > 28 || smoke > 150) return 'medium';
  return 'normal';
}

router.get('/heatmap', openCors, (_req, res) => {
  try {
    const statuses = getDeviceStatuses();
    const floorMap = new Map<number, any[]>();

    for (const device of statuses.devices) {
      const info = FLOOR_MAP[device.device_id];
      if (!info) continue;

      const floorNum = info.floor;
      if (!floorMap.has(floorNum)) floorMap.set(floorNum, []);

      const crowdValues: Record<string, number> = { low: 0.2, medium: 0.55, high: 0.8 };
      const temp = device.lastReading.temp;
      const smoke = device.lastReading.smoke;

      floorMap.get(floorNum)!.push({
        zone: info.zone,
        device_id: device.device_id,
        threat_level: device.status === 'offline' ? 'offline' : getThreatLevel(temp, smoke),
        crowd_density: 'low',
        temp,
        smoke,
        audio_anomaly: false,
        battery: device.battery,
        status: device.status,
      });
    }

    if (floorMap.size === 0) {
      const demoFloors = [
        { floor: 1, zones: [
          { zone: 'Main Lobby', device_id: 'device-001', threat_level: 'normal', crowd_density: 'low', temp: 28.5, smoke: 145, audio_anomaly: false, battery: 87, status: 'demo' },
          { zone: 'Kitchen', device_id: 'device-003', threat_level: 'medium', crowd_density: 'low', temp: 40.2, smoke: 175, audio_anomaly: false, battery: 45, status: 'demo' },
        ]},
        { floor: 2, zones: [
          { zone: 'East Wing', device_id: 'device-002', threat_level: 'normal', crowd_density: 'low', temp: 26.3, smoke: 130, audio_anomaly: false, battery: 73, status: 'demo' },
          { zone: 'Conference Hall', device_id: 'device-004', threat_level: 'normal', crowd_density: 'high', temp: 24.1, smoke: 120, audio_anomaly: false, battery: 92, status: 'demo' },
        ]},
        { floor: 3, zones: [
          { zone: 'West Wing', device_id: 'device-005', threat_level: 'normal', crowd_density: 'low', temp: 25.0, smoke: 125, audio_anomaly: false, battery: 28, status: 'demo' },
        ]},
      ];
      res.json({ floors: demoFloors });
      return;
    }

    const floors = Array.from(floorMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, zones]) => ({ floor, zones }));

    res.json({ floors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate heatmap' });
  }
});

export default router;
