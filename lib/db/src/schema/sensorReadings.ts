import { integer, pgTable, real, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sensorReadingsTable = pgTable("sensor_readings", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id", { length: 100 }).notNull(),
  temperature: real("temperature").notNull(),
  smoke: real("smoke").notNull(),
  motion: integer("motion").notNull().default(0),
  button: integer("button").notNull().default(0),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertSensorReadingSchema = createInsertSchema(sensorReadingsTable).omit({ id: true });
export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type SensorReading = typeof sensorReadingsTable.$inferSelect;
