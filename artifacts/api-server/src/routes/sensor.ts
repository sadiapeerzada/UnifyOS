import { Router, type IRouter } from 'express';
import cors from 'cors';
import { anomalyDetector } from '../lib/anomalyDetector.js';
import { broadcastSensorUpdate, recordHardwarePing, getStatus } from '../lib/wsServer.js';
import { generateIncidentSummary } from '../services/gemini.js';
import { getAllTranslations } from '../services/translator.js';
import { db } from '@workspace/db';
import { devicesTable, sensorReadingsTable, alertsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

const router: IRouter = Router();

const openCors = cors({ origin: '*' });

function normalisePayload(body: Record<string, any>): {
  temperature: number;
  smoke: number;
  motion: number;
  button: number;
  deviceId: string;
  battery: number;
  roomId: string;
  crowdDensity: string;
  audioAnomaly: boolean;
  timestamp: string;
} {
  const isNewFormat = 'device_id' in body || 'temp' in body || 'alert_type' in body;

  if (isNewFormat) {
    const alertType = body.alert_type;
    let button = 0;
    if (alertType === 'panic_button') button = 1;
    else if (typeof alertType === 'number') button = alertType;

    return {
      temperature: body.temp ?? body.temperature ?? 0,
      smoke: body.smoke ?? 0,
      motion: body.motion ?? 0,
      button,
      deviceId: body.device_id ?? body.deviceId ?? 'device-001',
      battery: body.battery ?? 100,
      roomId: body.room_id ?? '',
      crowdDensity: body.crowd_density ?? 'low',
      audioAnomaly: body.audio_anomaly ?? false,
      timestamp: body.timestamp ?? new Date().toISOString(),
    };
  }

  const btn = body.button ?? 0;
  return {
    temperature: body.temperature ?? 0,
    smoke: body.smoke ?? 0,
    motion: body.motion ?? 0,
    button: btn,
    deviceId: body.deviceId ?? 'device-001',
    battery: body.battery ?? 100,
    roomId: '',
    crowdDensity: 'low',
    audioAnomaly: false,
    timestamp: new Date().toISOString(),
  };
}

router.post('/sensor-data', openCors, async (req, res) => {
  try {
    const norm = normalisePayload(req.body);
    const { temperature, smoke, motion, button, deviceId, battery, roomId, crowdDensity, audioAnomaly } = norm;

    recordHardwarePing(deviceId, { battery, roomId, temp: temperature, smoke });

    try {
      await db.update(devicesTable)
        .set({ lastSeen: new Date(), status: 'online' })
        .where(eq(devicesTable.id, deviceId));

      await db.insert(sensorReadingsTable).values({
        deviceId,
        temperature,
        smoke,
        motion,
        button,
        timestamp: new Date(),
      });
    } catch {}

    const anomaly = anomalyDetector.checkAnomalies(deviceId, { temperature, smoke, motion, button });

    let translatedMessages: Record<string, string> | undefined;

    if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
      const sensors = anomaly.triggeredSensors ?? [];
      let alertType: 'evacuate' | 'fire' | 'smoke' | 'panic' | 'all_clear' = 'evacuate';
      if (sensors.includes('SMOKE_DETECTED')) alertType = 'smoke';
      else if (sensors.includes('TEMP_CRITICAL')) alertType = 'fire';
      else if (sensors.includes('PANIC_BUTTON')) alertType = 'panic';
      translatedMessages = getAllTranslations(alertType);
    }

    let aiSummary: string | undefined;
    let aiAction: string | undefined;
    let aiEstimatedCause: string | undefined;

    if (anomaly.severity === 'HIGH' || anomaly.severity === 'CRITICAL') {
      try {
        const ai = await generateIncidentSummary({
          location: anomaly.location,
          severity: anomaly.severity,
          confidence: anomaly.confidence,
          triggeredSensors: anomaly.triggeredSensors,
          temperature,
          smoke,
          motion,
          button,
          suggestedAction: anomaly.suggestedAction,
          explanation: anomaly.explanation,
        });
        aiSummary = ai.summary;
        aiAction = ai.immediateAction;
        aiEstimatedCause = ai.estimatedCause;
      } catch {}
    }

    if (anomaly.severity !== 'NORMAL' && anomaly.severity !== 'CALIBRATING') {
      try {
        let deviceName = deviceId;
        let deviceLocation = anomaly.location;
        const deviceRows = await db.select().from(devicesTable).where(eq(devicesTable.id, deviceId));
        if (deviceRows[0]) {
          deviceName = deviceRows[0].name;
          deviceLocation = deviceRows[0].location || anomaly.location;
          const status = anomaly.severity === 'CRITICAL' ? 'critical' : 'warning';
          await db.update(devicesTable).set({ status }).where(eq(devicesTable.id, deviceId));
        }
        await db.insert(alertsTable).values({
          deviceId,
          deviceName,
          deviceLocation,
          severity: anomaly.severity as any,
          confidence: anomaly.confidence,
          anomalies: anomaly.anomalies,
          message: anomaly.message,
          action: anomaly.action,
          dismissed: false,
          createdAt: new Date(),
        });
      } catch {}
    }

    broadcastSensorUpdate({
      deviceId,
      temperature,
      smoke,
      motion,
      button,
      battery,
      roomId,
      crowdDensity,
      audioAnomaly,
      severity: anomaly.severity,
      confidence: anomaly.confidence,
      message: anomaly.message,
      translatedMessages,
      aiSummary,
      aiAction,
      aiEstimatedCause,
    });

    res.json({
      status: 'ok',
      severity: anomaly.severity,
      confidence: anomaly.confidence,
      message: anomaly.message,
      suggestedAction: anomaly.suggestedAction,
      location: anomaly.location,
      triggeredSensors: anomaly.triggeredSensors,
      translatedMessages,
      aiSummary,
      aiAction,
      aiEstimatedCause,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process sensor data' });
  }
});

router.get('/status', openCors, (_req, res) => {
  res.json(getStatus());
});

export default router;
