import { Router } from "express";
import { db, petsTable, usersTable, sightingsTable, petUpdatesTable } from "@workspace/db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";
import { generateAiPath } from "../services/aiService.js";
import type { Server as SocketServer } from "socket.io";

export function createPetsRouter(io?: SocketServer) {
  const router = Router();

  async function getUserByFirebaseUid(uid: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, uid)).limit(1);
    return user;
  }

  router.get("/pets", async (req, res) => {
    try {
      const { species, status, page = "1", limit = "12" } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];
      if (species && species !== "all") conditions.push(eq(petsTable.species, species));
      if (status && status !== "all") conditions.push(eq(petsTable.status, status as "LOST" | "FOUND" | "REUNITED"));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total }] = await db
        .select({ total: count() })
        .from(petsTable)
        .where(where);

      const pets = await db
        .select({
          id: petsTable.id,
          name: petsTable.name,
          species: petsTable.species,
          breed: petsTable.breed,
          color: petsTable.color,
          size: petsTable.size,
          age: petsTable.age,
          description: petsTable.description,
          photoUrl: petsTable.photoUrl,
          status: petsTable.status,
          lastSeenAddress: petsTable.lastSeenAddress,
          lastSeenLat: petsTable.lastSeenLat,
          lastSeenLng: petsTable.lastSeenLng,
          lastSeenAt: petsTable.lastSeenAt,
          ownerId: petsTable.ownerId,
          createdAt: petsTable.createdAt,
          updatedAt: petsTable.updatedAt,
          ownerDisplayName: usersTable.displayName,
          ownerPhotoUrl: usersTable.photoUrl,
          ownerEmail: usersTable.email,
          ownerFirebaseUid: usersTable.firebaseUid,
          ownerProvider: usersTable.provider,
          ownerCreatedAt: usersTable.createdAt,
          sightingCount: sql<number>`(SELECT COUNT(*) FROM sightings WHERE sightings.pet_id = ${petsTable.id} AND sightings.is_flagged = false)`,
        })
        .from(petsTable)
        .leftJoin(usersTable, eq(petsTable.ownerId, usersTable.id))
        .where(where)
        .orderBy(desc(petsTable.updatedAt))
        .limit(limitNum)
        .offset(offset);

      const result = pets.map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        breed: p.breed,
        color: p.color,
        size: p.size,
        age: p.age,
        description: p.description,
        photoUrl: p.photoUrl,
        status: p.status,
        lastSeenAddress: p.lastSeenAddress,
        lastSeenLat: p.lastSeenLat,
        lastSeenLng: p.lastSeenLng,
        lastSeenAt: p.lastSeenAt?.toISOString(),
        ownerId: p.ownerId,
        createdAt: p.createdAt?.toISOString(),
        updatedAt: p.updatedAt?.toISOString(),
        sightingCount: Number(p.sightingCount),
        owner: {
          id: p.ownerId,
          firebaseUid: p.ownerFirebaseUid ?? "",
          displayName: p.ownerDisplayName ?? "",
          email: p.ownerEmail ?? "",
          photoUrl: p.ownerPhotoUrl,
          provider: p.ownerProvider ?? "google",
          createdAt: p.ownerCreatedAt?.toISOString() ?? "",
        },
      }));

      res.json({ pets: result, total, page: pageNum, limit: limitNum });
    } catch (err) {
      logger.error({ err }, "Error listing pets");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/pets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [pet] = await db
        .select()
        .from(petsTable)
        .where(eq(petsTable.id, id))
        .limit(1);

      if (!pet) { res.status(404).json({ error: "Pet not found" }); return; }

      const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, pet.ownerId)).limit(1);

      const sightings = await db
        .select({
          s: sightingsTable,
          reporterDisplayName: usersTable.displayName,
          reporterPhotoUrl: usersTable.photoUrl,
          reporterEmail: usersTable.email,
          reporterFirebaseUid: usersTable.firebaseUid,
          reporterProvider: usersTable.provider,
          reporterCreatedAt: usersTable.createdAt,
        })
        .from(sightingsTable)
        .leftJoin(usersTable, eq(sightingsTable.reporterId, usersTable.id))
        .where(eq(sightingsTable.petId, id))
        .orderBy(sightingsTable.sequence);

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
        .where(eq(petUpdatesTable.petId, id))
        .orderBy(desc(petUpdatesTable.createdAt));

      res.json({
        ...pet,
        lastSeenAt: pet.lastSeenAt?.toISOString(),
        createdAt: pet.createdAt?.toISOString(),
        updatedAt: pet.updatedAt?.toISOString(),
        owner: owner
          ? { ...owner, createdAt: owner.createdAt?.toISOString() }
          : null,
        sightings: sightings.map(({ s, reporterDisplayName, reporterPhotoUrl, reporterEmail, reporterFirebaseUid, reporterProvider, reporterCreatedAt }) => ({
          ...s,
          seenAt: s.seenAt?.toISOString(),
          flaggedAt: s.flaggedAt?.toISOString() ?? null,
          createdAt: s.createdAt?.toISOString(),
          reporter: {
            id: s.reporterId,
            firebaseUid: reporterFirebaseUid ?? "",
            displayName: reporterDisplayName ?? "",
            email: reporterEmail ?? "",
            photoUrl: reporterPhotoUrl,
            provider: reporterProvider ?? "google",
            createdAt: reporterCreatedAt?.toISOString() ?? "",
          },
        })),
        updates: updates.map(({ u, authorDisplayName, authorPhotoUrl, authorEmail, authorFirebaseUid, authorProvider, authorCreatedAt }) => ({
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
        })),
      });
    } catch (err) {
      logger.error({ err }, "Error fetching pet");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/pets", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await getUserByFirebaseUid(req.user!.uid);
      if (!user) { res.status(401).json({ error: "User not found. Please sync auth first." }); return; }

      const { name, species, breed, color, size, age, description, photoUrl, lastSeenAddress, lastSeenLat, lastSeenLng, lastSeenAt } = req.body as {
        name: string; species: string; breed?: string; color: string; size: string;
        age?: string; description: string; photoUrl: string; lastSeenAddress: string;
        lastSeenLat: number; lastSeenLng: number; lastSeenAt: string;
      };

      const id = crypto.randomUUID();
      const now = new Date();
      const [pet] = await db.insert(petsTable).values({
        id, name, species, breed: breed ?? null, color, size, age: age ?? null,
        description, photoUrl, status: "LOST", lastSeenAddress,
        lastSeenLat, lastSeenLng, lastSeenAt: new Date(lastSeenAt),
        ownerId: user.id, aiPathCache: null, updatedAt: now,
      }).returning();

      await db.insert(petUpdatesTable).values({
        id: crypto.randomUUID(),
        petId: id,
        authorId: user.id,
        content: `${name} was reported lost`,
        type: "GENERAL",
      });

      res.status(201).json({
        ...pet,
        lastSeenAt: pet.lastSeenAt?.toISOString(),
        createdAt: pet.createdAt?.toISOString(),
        updatedAt: pet.updatedAt?.toISOString(),
        owner: { ...user, createdAt: user.createdAt?.toISOString() },
      });
    } catch (err) {
      logger.error({ err }, "Error creating pet");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.patch("/pets/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const user = await getUserByFirebaseUid(req.user!.uid);
      if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

      const [pet] = await db.select().from(petsTable).where(eq(petsTable.id, id)).limit(1);
      if (!pet) { res.status(404).json({ error: "Pet not found" }); return; }
      if (pet.ownerId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

      const { name, species, breed, color, size, age, description, photoUrl } = req.body as Partial<{
        name: string; species: string; breed: string; color: string;
        size: string; age: string; description: string; photoUrl: string;
      }>;

      const [updated] = await db
        .update(petsTable)
        .set({ name, species, breed, color, size, age, description, photoUrl, updatedAt: new Date() })
        .where(eq(petsTable.id, id))
        .returning();

      res.json({ ...updated, lastSeenAt: updated.lastSeenAt?.toISOString(), createdAt: updated.createdAt?.toISOString(), updatedAt: updated.updatedAt?.toISOString() });
    } catch (err) {
      logger.error({ err }, "Error updating pet");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.patch("/pets/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: "LOST" | "FOUND" | "REUNITED" };
      const user = await getUserByFirebaseUid(req.user!.uid);
      if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

      const [pet] = await db.select().from(petsTable).where(eq(petsTable.id, id)).limit(1);
      if (!pet) { res.status(404).json({ error: "Pet not found" }); return; }
      if (pet.ownerId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

      const [updated] = await db
        .update(petsTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(petsTable.id, id))
        .returning();

      const typeMap: Record<string, "PET_FOUND" | "PET_STILL_MISSING" | "GENERAL"> = {
        FOUND: "PET_FOUND",
        LOST: "PET_STILL_MISSING",
        REUNITED: "GENERAL",
      };
      await db.insert(petUpdatesTable).values({
        id: crypto.randomUUID(),
        petId: id,
        authorId: user.id,
        content: status === "REUNITED" ? `${pet.name} has been reunited with their owner!` : `Status updated to ${status}`,
        type: typeMap[status] ?? "GENERAL",
      });

      if (io) io.to(`pet:${id}`).emit("pet:updated", { status });

      res.json({ ...updated, lastSeenAt: updated.lastSeenAt?.toISOString(), createdAt: updated.createdAt?.toISOString(), updatedAt: updated.updatedAt?.toISOString() });
    } catch (err) {
      logger.error({ err }, "Error updating status");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.patch("/pets/:id/approve-ai-path", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const user = await getUserByFirebaseUid(req.user!.uid);
      if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

      const [pet] = await db.select().from(petsTable).where(eq(petsTable.id, id)).limit(1);
      if (!pet) { res.status(404).json({ error: "Pet not found" }); return; }
      if (pet.ownerId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

      const cache = pet.aiPathCache as Record<string, unknown> | null;
      if (!cache) { res.status(400).json({ error: "No AI path to approve" }); return; }

      const updatedCache = { ...cache, approved: true };
      const [updated] = await db
        .update(petsTable)
        .set({ aiPathCache: updatedCache, updatedAt: new Date() })
        .where(eq(petsTable.id, id))
        .returning();

      await db.insert(petUpdatesTable).values({
        id: crypto.randomUUID(),
        petId: id,
        authorId: user.id,
        content: "AI predicted path approved by owner",
        type: "AI_PATH_APPROVED",
      });

      if (io) io.to(`pet:${id}`).emit("ai:path-approved", { approved: true });

      res.json({ ...updated, lastSeenAt: updated.lastSeenAt?.toISOString(), createdAt: updated.createdAt?.toISOString(), updatedAt: updated.updatedAt?.toISOString() });
    } catch (err) {
      logger.error({ err }, "Error approving AI path");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.patch("/pets/:id/deny-ai-path", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const user = await getUserByFirebaseUid(req.user!.uid);
      if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

      const [pet] = await db.select().from(petsTable).where(eq(petsTable.id, id)).limit(1);
      if (!pet) { res.status(404).json({ error: "Pet not found" }); return; }
      if (pet.ownerId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

      const [updated] = await db
        .update(petsTable)
        .set({ aiPathCache: null, updatedAt: new Date() })
        .where(eq(petsTable.id, id))
        .returning();

      await db.insert(petUpdatesTable).values({
        id: crypto.randomUUID(),
        petId: id,
        authorId: user.id,
        content: "AI predicted path dismissed by owner. Will regenerate on next sighting.",
        type: "AI_PATH_DENIED",
      });

      if (io) io.to(`pet:${id}`).emit("ai:path-denied", {});

      res.json({ ...updated, lastSeenAt: updated.lastSeenAt?.toISOString(), createdAt: updated.createdAt?.toISOString(), updatedAt: updated.updatedAt?.toISOString() });
    } catch (err) {
      logger.error({ err }, "Error denying AI path");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
