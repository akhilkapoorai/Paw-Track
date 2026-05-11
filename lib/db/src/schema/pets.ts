import { pgTable, text, timestamp, real, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const petStatusEnum = pgEnum("pet_status", ["LOST", "FOUND", "REUNITED"]);

export const petsTable = pgTable("pets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed"),
  color: text("color").notNull(),
  size: text("size").notNull(),
  age: text("age"),
  description: text("description").notNull(),
  photoUrl: text("photo_url").notNull(),
  status: petStatusEnum("status").notNull().default("LOST"),
  lastSeenAddress: text("last_seen_address").notNull(),
  lastSeenLat: real("last_seen_lat").notNull(),
  lastSeenLng: real("last_seen_lng").notNull(),
  lastSeenAt: timestamp("last_seen_at").notNull(),
  ownerId: text("owner_id").notNull(),
  aiPathCache: json("ai_path_cache"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPetSchema = createInsertSchema(petsTable).omit({ createdAt: true, updatedAt: true });
export type InsertPet = z.infer<typeof insertPetSchema>;
export type Pet = typeof petsTable.$inferSelect;
