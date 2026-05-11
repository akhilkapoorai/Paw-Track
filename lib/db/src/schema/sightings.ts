import { pgTable, text, timestamp, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sightingsTable = pgTable("sightings", {
  id: text("id").primaryKey(),
  petId: text("pet_id").notNull(),
  reporterId: text("reporter_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  address: text("address").notNull(),
  seenAt: timestamp("seen_at").notNull(),
  notes: text("notes"),
  confidence: text("confidence").notNull().default("medium"),
  isFlagged: boolean("is_flagged").notNull().default(false),
  flaggedAt: timestamp("flagged_at"),
  sequence: integer("sequence").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSightingSchema = createInsertSchema(sightingsTable).omit({ createdAt: true });
export type InsertSighting = z.infer<typeof insertSightingSchema>;
export type Sighting = typeof sightingsTable.$inferSelect;
