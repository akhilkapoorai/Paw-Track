import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const updateTypeEnum = pgEnum("update_type", [
  "GENERAL",
  "SIGHTING_FLAGGED",
  "SIGHTING_REMOVED",
  "PET_FOUND",
  "PET_STILL_MISSING",
  "OWNER_NOTE",
  "AI_PATH_APPROVED",
  "AI_PATH_DENIED",
]);

export const petUpdatesTable = pgTable("pet_updates", {
  id: text("id").primaryKey(),
  petId: text("pet_id").notNull(),
  authorId: text("author_id").notNull(),
  content: text("content").notNull(),
  type: updateTypeEnum("type").notNull().default("GENERAL"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPetUpdateSchema = createInsertSchema(petUpdatesTable).omit({ createdAt: true });
export type InsertPetUpdate = z.infer<typeof insertPetUpdateSchema>;
export type PetUpdate = typeof petUpdatesTable.$inferSelect;
