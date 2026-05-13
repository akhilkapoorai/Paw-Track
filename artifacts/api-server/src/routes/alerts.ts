import { Router } from "express";
import { db, alertSubscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendVerificationEmail } from "../services/alertService.js";

const router = Router();

router.get("/alerts/config", (_req, res) => {
  res.json({
    smsEnabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
  });
});

router.post("/alerts/subscribe", async (req, res) => {
  try {
    const { email, phone, locationName, lat, lng, radiusMiles, species } = req.body as {
      email: string;
      phone?: string;
      locationName: string;
      lat: number;
      lng: number;
      radiusMiles?: number;
      species?: string;
    };

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Valid email is required" });
      return;
    }

    if (typeof lat !== "number" || typeof lng !== "number") {
      res.status(400).json({ error: "lat and lng are required" });
      return;
    }

    const existing = await db
      .select()
      .from(alertSubscriptionsTable)
      .where(
        and(
          eq(alertSubscriptionsTable.email, email.toLowerCase().trim()),
          eq(alertSubscriptionsTable.lat, lat),
          eq(alertSubscriptionsTable.lng, lng),
        ),
      )
      .limit(1);

    let sub = existing[0];

    if (sub) {
      const [updated] = await db
        .update(alertSubscriptionsTable)
        .set({
          phone: phone ?? null,
          locationName,
          radiusMiles: radiusMiles ?? 25,
          species: species ?? "all",
          isEmailVerified: false,
        })
        .where(eq(alertSubscriptionsTable.id, sub.id))
        .returning();
      sub = updated;
    } else {
      const id = crypto.randomUUID();
      const verificationToken = crypto.randomUUID();
      const unsubscribeToken = crypto.randomUUID();

      const [created] = await db
        .insert(alertSubscriptionsTable)
        .values({
          id,
          email: email.toLowerCase().trim(),
          phone: phone ?? null,
          locationName,
          lat,
          lng,
          radiusMiles: radiusMiles ?? 25,
          species: species ?? "all",
          isEmailVerified: false,
          verificationToken,
          unsubscribeToken,
        })
        .returning();

      sub = created;
    }

    await sendVerificationEmail(sub.email, sub.verificationToken).catch((err) =>
      logger.warn({ err }, "Verification email failed"),
    );

    res.json({ ok: true, message: "Check your email to confirm your subscription" });
  } catch (err) {
    logger.error({ err }, "Error subscribing to alerts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/alerts/verify", async (req, res) => {
  try {
    const { token } = req.query as { token?: string };
    if (!token) {
      res.status(400).send("Missing token");
      return;
    }

    const [sub] = await db
      .select()
      .from(alertSubscriptionsTable)
      .where(eq(alertSubscriptionsTable.verificationToken, token))
      .limit(1);

    if (!sub) {
      res.status(404).send("Invalid or expired token");
      return;
    }

    await db
      .update(alertSubscriptionsTable)
      .set({ isEmailVerified: true })
      .where(eq(alertSubscriptionsTable.id, sub.id));

    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
    const proto = domains.includes("localhost") ? "http" : "https";
    res.redirect(`${proto}://${domains}/alert-confirmed?location=${encodeURIComponent(sub.locationName)}`);
  } catch (err) {
    logger.error({ err }, "Error verifying alert subscription");
    res.status(500).send("Internal server error");
  }
});

router.get("/alerts/unsubscribe", async (req, res) => {
  try {
    const { token } = req.query as { token?: string };
    if (!token) {
      res.status(400).send("Missing token");
      return;
    }

    const [sub] = await db
      .select()
      .from(alertSubscriptionsTable)
      .where(eq(alertSubscriptionsTable.unsubscribeToken, token))
      .limit(1);

    if (!sub) {
      res.status(404).send("Invalid token");
      return;
    }

    await db.delete(alertSubscriptionsTable).where(eq(alertSubscriptionsTable.id, sub.id));

    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
    const proto = domains.includes("localhost") ? "http" : "https";
    res.redirect(`${proto}://${domains}/unsubscribed`);
  } catch (err) {
    logger.error({ err }, "Error unsubscribing");
    res.status(500).send("Internal server error");
  }
});

export default router;
