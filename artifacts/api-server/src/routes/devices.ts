import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { devicesTable, sensorReadingsTable, alertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { anomalyDetector } from "../lib/anomalyDetector.js";

const router: IRouter = Router();

router.get("/devices", async (_req, res) => {
  try {
    const devices = await db.select().from(devicesTable).orderBy(desc(devicesTable.lastSeen));
    res.json(devices.map(d => ({
      ...d,
      lastSeen: d.lastSeen.toISOString(),
      createdAt: d.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch devices" });
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
