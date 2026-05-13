import { pgTable, text, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";

export const alertSubscriptionsTable = pgTable("alert_subscriptions", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  phone: text("phone"),
  locationName: text("location_name").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  radiusMiles: integer("radius_miles").notNull().default(25),
  species: text("species").notNull().default("all"),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  verificationToken: text("verification_token").notNull().unique(),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  lastAlertSentAt: timestamp("last_alert_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AlertSubscription = typeof alertSubscriptionsTable.$inferSelect;
export type InsertAlertSubscription = typeof alertSubscriptionsTable.$inferInsert;
