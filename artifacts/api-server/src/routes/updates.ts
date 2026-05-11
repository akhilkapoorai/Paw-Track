import { Router } from "express";
import { db, petUpdatesTable, usersTable, petsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

async function getUserByFirebaseUid(uid: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, uid)).limit(1);
  return user;
}

router.get("/pets/:petId/updates", async (req, res) => {
  try {
    const { petId } = req.params;
    const updates = await db
      .select({
        u: petUpdatesTable,
        authorDisplayName: usersTable.displayName,
        authorPhotoUrl: usersTable.photoUrl,
        authorEmail: usersTable.email,
        authorFirebaseUid: usersTable.firebaseUid,
        authorProvider: usersTable.provider,
        authorCreatedAt: usersTable.createdAt,
      })
      .from(petUpdatesTable)
      .leftJoin(usersTable, eq(petUpdatesTable.authorId, usersTable.id))
      .where(eq(petUpdatesTable.petId, petId))
      .orderBy(desc(petUpdatesTable.createdAt));

    res.json(updates.map(({ u, authorDisplayName, authorPhotoUrl, authorEmail, authorFirebaseUid, authorProvider, authorCreatedAt }) => ({
      ...u,
      createdAt: u.createdAt?.toISOString(),
      author: {
        id: u.authorId,
        firebaseUid: authorFirebaseUid ?? "",
        displayName: authorDisplayName ?? "",
        email: authorEmail ?? "",
        photoUrl: authorPhotoUrl,
        provider: authorProvider ?? "google",
        createdAt: authorCreatedAt?.toISOString() ?? "",
      },
    })));
  } catch (err) {
    logger.error({ err }, "Error listing updates");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/pets/:petId/updates", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { petId } = req.params;
    const { content } = req.body as { content: string };
    const user = await getUserByFirebaseUid(req.user!.uid);
    if (!user) { res.status(401).json({ error: "User not found" }); return; }

    const [pet] = await db.select().from(petsTable).where(eq(petsTable.id, petId)).limit(1);
    if (!pet) { res.status(404).json({ error: "Pet not found" }); return; }
    if (pet.ownerId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const [update] = await db.insert(petUpdatesTable).values({
      id: crypto.randomUUID(),
      petId,
      authorId: user.id,
      content,
      type: "OWNER_NOTE",
    }).returning();

    res.status(201).json({
      ...update,
      createdAt: update.createdAt?.toISOString(),
      author: { ...user, createdAt: user.createdAt?.toISOString() },
    });
  } catch (err) {
    logger.error({ err }, "Error creating update");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
