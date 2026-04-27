import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { devicesTable, sensorReadingsTable, alertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { anomalyDetector } from "../lib/anomalyDetector.js";
import { getAllLatest, getLatest, isOnline, DEVICE_OFFLINE_MS } from "../lib/latestCache.js";

const router: IRouter = Router();

router.get("/devices", async (_req, res) => {
  let dbDevices: Array<{ id: string; name: string; location: string | null; status: string; lastSeen: Date; createdAt: Date }> = [];
  try {
    dbDevices = await db.select().from(devicesTable).orderBy(desc(devicesTable.lastSeen));
  } catch (err: any) {
    console.warn(`⚠️ [Devices] DB unavailable, returning in-memory only: ${err?.message ?? err}`);
  }

  const known = new Set(dbDevices.map(d => d.id));

  const dbResults = dbDevices.map(d => {
    const cached = getLatest(d.id);
    const lastSeenIso = cached?.receivedAt ?? d.lastSeen.toISOString();
    const online = isOnline(lastSeenIso);
    return {
      ...d,
      lastSeen: lastSeenIso,
      createdAt: d.createdAt.toISOString(),
      status: online ? d.status : "offline",
      online,
      alert_level: cached?.alertLevel ?? null,
      offline_threshold_ms: DEVICE_OFFLINE_MS,
    };
  });

  const cacheOnly = getAllLatest()
    .filter(c => !known.has(c.deviceId))
    .map(c => ({
      id: c.deviceId,
      name: c.deviceId,
      location: null,
      status: isOnline(c.receivedAt) ? "online" : "offline",
      online: isOnline(c.receivedAt),
      lastSeen: c.receivedAt,
      createdAt: c.receivedAt,
      alert_level: c.alertLevel ?? null,
      offline_threshold_ms: DEVICE_OFFLINE_MS,
    }));

  res.json([...dbResults, ...cacheOnly]);
});

router.post("/devices/register", async (req, res) => {
  try {
    const { device_id, name, location } = req.body;
    const id = device_id as string;
    if (!id) { res.status(400).json({ error: "device_id required" }); return; }

    const existing = await db.select().from(devicesTable).where(eq(devicesTable.id, id));
    if (existing.length > 0) {
      await db.update(devicesTable).set({ name, location, lastSeen: new Date() }).where(eq(devicesTable.id, id));
      res.json({ ok: true, updated: true });
      return;
    }

    const [device] = await db.insert(devicesTable).values({
      id,
      name: name ?? "Smart Panic Button",
      location: location ?? "Unknown",
      status: "online",
      lastSeen: new Date(),
      createdAt: new Date(),
    }).returning();

    res.status(201).json({
      ok: true,
      device: { ...device, lastSeen: device.lastSeen.toISOString(), createdAt: device.createdAt.toISOString() },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to register device" });
  }
});

router.post("/devices", async (req, res) => {
  try {
    const { id, name, location } = req.body;
    const existing = await db.select().from(devicesTable).where(eq(devicesTable.id, id));

    if (existing.length > 0) {
      res.status(200).json({
        ...existing[0],
        lastSeen: existing[0].lastSeen.toISOString(),
        createdAt: existing[0].createdAt.toISOString(),
      });
      return;
    }

    const [device] = await db.insert(devicesTable).values({
      id,
      name,
      location,
      status: "online",
      lastSeen: new Date(),
      createdAt: new Date(),
    }).returning();

    res.status(201).json({
      ...device,
      lastSeen: device.lastSeen.toISOString(),
      createdAt: device.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to register device" });
  }
});

router.post("/devices/:deviceId/sensor-data", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { temperature, smoke, motion, button } = req.body;

    await db.update(devicesTable)
      .set({ lastSeen: new Date(), status: "online" })
      .where(eq(devicesTable.id, deviceId));

    const [reading] = await db.insert(sensorReadingsTable).values({
      deviceId,
      temperature,
      smoke,
      motion,
      button,
      timestamp: new Date(),
    }).returning();

    const anomaly = anomalyDetector.checkAnomalies(deviceId, { temperature, smoke, motion, button });

    if (anomaly.severity !== "NORMAL") {
      const deviceRows = await db.select().from(devicesTable).where(eq(devicesTable.id, deviceId));
      const device = deviceRows[0];
      const deviceName = device?.name ?? deviceId;
      const deviceLocation = device?.location ?? "Unknown";

      const status = anomaly.severity === "CRITICAL" ? "critical" :
                     anomaly.severity === "HIGH" ? "warning" : "warning";

      await db.update(devicesTable)
        .set({ status })
        .where(eq(devicesTable.id, deviceId));

      await db.insert(alertsTable).values({
        deviceId,
        deviceName,
        deviceLocation,
        severity: anomaly.severity,
        confidence: anomaly.confidence,
        anomalies: anomaly.anomalies,
        message: anomaly.message,
        action: anomaly.action,
        dismissed: false,
        createdAt: new Date(),
      });
    } else {
      await db.update(devicesTable)
        .set({ status: "online" })
        .where(eq(devicesTable.id, deviceId));
    }

    res.json({
      reading: {
        ...reading,
        timestamp: reading.timestamp.toISOString(),
      },
      anomaly,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process sensor data" });
  }
});

router.get("/devices/:deviceId/readings", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(String(req.query.limit ?? "30"));

    const readings = await db.select()
      .from(sensorReadingsTable)
      .where(eq(sensorReadingsTable.deviceId, deviceId))
      .orderBy(desc(sensorReadingsTable.timestamp))
      .limit(limit);

    res.json(readings.map(r => ({
      ...r,
      timestamp: r.timestamp.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch readings" });
  }
});

export default router;
