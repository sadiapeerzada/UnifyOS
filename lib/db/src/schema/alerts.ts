import { boolean, integer, json, pgTable, real, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id", { length: 100 }).notNull(),
  deviceName: text("device_name").notNull(),
  deviceLocation: text("device_location").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  confidence: real("confidence").notNull(),
  anomalies: json("anomalies").$type<string[]>().notNull().default([]),
  message: text("message").notNull(),
  action: text("action").notNull(),
  dismissed: boolean("dismissed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
