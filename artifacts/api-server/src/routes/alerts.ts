import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/alerts", async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit ?? "50"));
    const deviceId = req.query.deviceId as string | undefined;

    let query = db.select().from(alertsTable);

    const alerts = await db.select()
      .from(alertsTable)
      .orderBy(desc(alertsTable.createdAt))
      .limit(limit);

    const filtered = deviceId ? alerts.filter(a => a.deviceId === deviceId) : alerts;

    res.json(filtered.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.post("/alerts/:alertId/dismiss", async (req, res) => {
  try {
    const alertId = parseInt(req.params.alertId);

    const [alert] = await db.update(alertsTable)
      .set({ dismissed: true })
      .where(eq(alertsTable.id, alertId))
      .returning();

    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    res.json({
      ...alert,
      createdAt: alert.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to dismiss alert" });
  }
});

export default router;
