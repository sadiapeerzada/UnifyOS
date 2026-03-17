import { Router, type IRouter } from 'express';
import cors from 'cors';
import { anomalyDetector } from '../lib/anomalyDetector.js';
import { broadcastSensorUpdate, recordHardwarePing, getStatus } from '../lib/wsServer.js';
import { generateIncidentSummary } from '../services/gemini.js';
import { db } from '@workspace/db';
import { devicesTable, sensorReadingsTable, alertsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

const router: IRouter = Router();

const openCors = cors({ origin: '*' });

router.post('/sensor-data', openCors, async (req, res) => {
  try {
    const { temperature, smoke, motion, button, deviceId: rawDeviceId } = req.body;
    const deviceId = rawDeviceId ?? 'device-001';

    recordHardwarePing(deviceId);

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
      severity: anomaly.severity,
      confidence: anomaly.confidence,
      message: anomaly.message,
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
