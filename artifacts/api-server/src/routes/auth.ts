import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/auth/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { displayName, email, photoUrl, provider } = req.body as {
      displayName: string;
      email: string;
      photoUrl?: string;
      provider: string;
    };
    const uid = req.user!.uid;

    const existing = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, uid)).limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(usersTable)
        .set({ displayName, photoUrl: photoUrl ?? null })
        .where(eq(usersTable.firebaseUid, uid))
        .returning();
      res.json(updated);
      return;
    }

    const id = crypto.randomUUID();
    const [user] = await db
      .insert(usersTable)
      .values({ id, firebaseUid: uid, displayName, email, photoUrl: photoUrl ?? null, provider })
      .returning();

    res.json(user);
  } catch (err) {
    logger.error({ err }, "Error syncing auth");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.firebaseUid, req.user!.uid))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    logger.error({ err }, "Error fetching user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
