import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/health", async (_req, res) => {
  const startTime = Date.now();
  console.log("🏥 [UnifyOS] Health check requested");

  let dbStatus = "unknown";
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "connected";
    console.log("✅ [UnifyOS] DB ping OK");
  } catch (e) {
    dbStatus = "error";
    console.error("❌ [UnifyOS] DB ping failed:", e);
  }

  const geminiConfigured = !!process.env.GEMINI_API_KEY;

  const response = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    latencyMs: Date.now() - startTime,
    database: dbStatus,
    gemini: geminiConfigured ? "configured" : "not_configured",
    platform: {
      name: "UnifyOS",
      version: "1.0.0",
      team: "Team BlackBit",
      competition: "Google Solution Challenge 2026",
    },
    hardware: {
      model: "UnifyOS-001",
      microcontroller: "ESP32 (dual-core 240MHz, WiFi)",
      sensors: [
        { name: "MQ-2", type: "Gas/Smoke", unit: "ppm" },
        { name: "DHT22", type: "Temperature & Humidity", unit: "°C / %" },
        { name: "HC-SR04", type: "Motion / Occupancy (ultrasonic)", unit: "cm" },
        { name: "Panic Button", type: "Manual SOS", unit: "digital" },
        { name: "Flame Sensor (NEW)", type: "Infrared Fire Detection", unit: "digital", range: "1m", interface: "GPIO" },
      ],
      costBreakdown: {
        esp32: "₹350",
        sensors: "₹420",
        battery18650: "₹250",
        casing: "₹150",
        misc: "₹50",
        total: "₹1,220",
      },
      connectivity: "WiFi 802.11 b/g/n (2.4GHz)",
      pollingIntervalMs: 2000,
    },
    sdgs: ["SDG 3 — Good Health & Well-Being", "SDG 9 — Industry & Innovation", "SDG 11 — Sustainable Cities"],
  };

  console.log("✅ [UnifyOS] Health check complete —", JSON.stringify({ db: dbStatus, gemini: geminiConfigured, latencyMs: response.latencyMs }));
  res.json(response);
});

export default router;
