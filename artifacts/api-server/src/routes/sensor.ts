import { Router, type IRouter } from 'express';
import cors from 'cors';
import { anomalyDetector } from '../lib/anomalyDetector.js';
import { broadcastSensorUpdate, recordHardwarePing, getStatus } from '../lib/wsServer.js';
import { generateIncidentSummary, generateIncidentReport, testGeminiConnection } from '../services/gemini.js';
import { getAllTranslations } from '../services/translator.js';
import { db } from '@workspace/db';
import { devicesTable, sensorReadingsTable, alertsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

const router: IRouter = Router();

const openCors = cors({ origin: '*' });

router.options('/sensor-data', openCors, (_req, res) => { res.sendStatus(204); });

router.post('/hardware/heartbeat', openCors, async (req, res) => {
  const { deviceId: rawDeviceId, deviceName, firmware } = req.body;
  const deviceId = rawDeviceId ?? 'device-001';
  recordHardwarePing(deviceId);
  const ts = new Date().toISOString();
  console.log(`💓 [Heartbeat] ${ts} | device=${deviceId} | name="${deviceName ?? 'unknown'}" | firmware=${firmware ?? 'unknown'}`);
  try {
    await db.update(devicesTable)
      .set({ lastSeen: new Date(), status: 'online' })
      .where(eq(devicesTable.id, deviceId));
  } catch {}
  res.json({ ok: true, deviceId, serverTime: ts });
});

router.post('/sensor-data', openCors, async (req, res) => {
  const ts = new Date().toISOString();
  try {
    const { temperature, smoke, motion, button, deviceId: rawDeviceId, crowd_density, audio_anomaly } = req.body;
    const deviceId = rawDeviceId ?? 'device-001';
    const crowdDensity: 'low' | 'medium' | 'high' | undefined = crowd_density;
    const audioAnomaly: boolean | undefined = audio_anomaly;

    console.log(`📡 [Sensor] ${ts} | device=${deviceId} | temp=${temperature}°C | smoke=${smoke}ppm | motion=${motion} | button=${button}`);

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

    const anomaly = anomalyDetector.checkAnomalies(deviceId, { temperature, smoke, motion, button, crowdDensity, audioAnomaly });

    let aiSummary: string | undefined;
    let aiAction: string | undefined;
    let aiEstimatedCause: string | undefined;

    if (anomaly.severity === 'HIGH' || anomaly.severity === 'CRITICAL') {
      try {
        console.log(`🤖 [Gemini] Calling triage for ${anomaly.severity} at "${anomaly.location}" (${anomaly.confidence}% confidence)...`);
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
        console.log(`✅ [Gemini] Triage complete — "${aiSummary?.slice(0, 80)}"`);
      } catch (err: any) {
        console.error(`❌ [Gemini] Triage failed, using rule-based fallback: ${err?.message}`);
      }
    }

    let resolvedDeviceName = deviceId;
    let resolvedDeviceLocation = anomaly.location;

    if (anomaly.severity !== 'NORMAL' && anomaly.severity !== 'CALIBRATING') {
      try {
        const deviceRows = await db.select().from(devicesTable).where(eq(devicesTable.id, deviceId));
        if (deviceRows[0]) {
          resolvedDeviceName = deviceRows[0].name;
          resolvedDeviceLocation = deviceRows[0].location || anomaly.location;
          const status = anomaly.severity === 'CRITICAL' ? 'critical' : 'warning';
          await db.update(devicesTable).set({ status }).where(eq(devicesTable.id, deviceId));
        }
        console.log(`🚨 [Alert] ${ts} | device=${deviceId} ("${resolvedDeviceName}") | severity=${anomaly.severity} | confidence=${anomaly.confidence}% | sensors=${anomaly.triggeredSensors?.join(',')}`);
        await db.insert(alertsTable).values({
          deviceId,
          deviceName: resolvedDeviceName,
          deviceLocation: resolvedDeviceLocation,
          severity: anomaly.severity as any,
          confidence: anomaly.confidence,
          anomalies: anomaly.anomalies,
          message: anomaly.message,
          action: anomaly.action,
          dismissed: false,
          createdAt: new Date(),
        });
      } catch (dbErr: any) {
        console.error(`⚠️ [Alert] DB write failed for device=${deviceId}: ${dbErr?.message}`);
      }
    }

    const isHighOrCritical = anomaly.severity === 'HIGH' || anomaly.severity === 'CRITICAL';
    const translatedMessages = isHighOrCritical ? getAllTranslations('evacuate') : undefined;

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
      ...(translatedMessages ? { translatedMessages } : {}),
    });

    res.json({
      status: 'ok',
      deviceId,
      deviceName: resolvedDeviceName,
      deviceLocation: resolvedDeviceLocation,
      severity: anomaly.severity,
      confidence: anomaly.confidence,
      message: anomaly.message,
      suggestedAction: anomaly.suggestedAction,
      location: anomaly.location,
      triggeredSensors: anomaly.triggeredSensors,
      explanation: anomaly.explanation,
      aiSummary,
      aiAction,
      aiEstimatedCause,
      ...(translatedMessages ? { translatedMessages } : {}),
    });
  } catch (err) {
    console.error(`❌ [Sensor] ${ts} Unhandled error:`, err);
    res.status(500).json({ error: 'Failed to process sensor data' });
  }
});

router.get('/status', openCors, (_req, res) => {
  res.json(getStatus());
});

router.post('/test-gemini', openCors, async (_req, res) => {
  console.log('🤖 [Gemini] /test-gemini endpoint called');
  const result = await testGeminiConnection();
  res.json(result);
});

router.post('/generate-incident-report', openCors, async (req, res) => {
  try {
    const { venue, alerts: alertHistory } = req.body;
    console.log('📄 [Report] Generate incident report request for venue:', venue);
    const content = await generateIncidentReport(venue || 'Unknown Venue', alertHistory || []);
    res.json({ ok: true, content });
  } catch (err: any) {
    console.error('❌ [Report] Failed to generate report:', err?.message);
    res.status(500).json({ ok: false, error: err?.message || 'Failed' });
  }
});

export default router;
