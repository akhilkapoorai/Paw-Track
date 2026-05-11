import { Router } from "express";
import { db, sightingsTable, usersTable, petsTable, petUpdatesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";
import { generateAiPath } from "../services/aiService.js";
import type { Server as SocketServer } from "socket.io";

export function createSightingsRouter(io?: SocketServer) {
  const router = Router();

  async function getUserByFirebaseUid(uid: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, uid)).limit(1);
    return user;
  }

  router.get("/pets/:petId/sightings", async (req, res) => {
    try {
      const { petId } = req.params;
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
        .where(eq(sightingsTable.petId, petId))
        .orderBy(asc(sightingsTable.sequence));

      res.json(sightings.map(({ s, reporterDisplayName, reporterPhotoUrl, reporterEmail, reporterFirebaseUid, reporterProvider, reporterCreatedAt }) => ({
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
      })));
    } catch (err) {
      logger.error({ err }, "Error listing sightings");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/pets/:petId/sightings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { petId } = req.params;
      const user = await getUserByFirebaseUid(req.user!.uid);
      if (!user) { res.status(401).json({ error: "User not found. Please sync auth first." }); return; }

      const [pet] = await db.select().from(petsTable).where(eq(petsTable.id, petId)).limit(1);
      if (!pet) { res.status(404).json({ error: "Pet not found" }); return; }

      const { photoUrl, lat, lng, address, seenAt, notes, confidence } = req.body as {
        photoUrl: string; lat: number; lng: number; address: string;
        seenAt: string; notes?: string; confidence: string;
      };

      const existingSightings = await db
        .select({ sequence: sightingsTable.sequence })
        .from(sightingsTable)
        .where(eq(sightingsTable.petId, petId))
        .orderBy(asc(sightingsTable.sequence));

      const nextSequence = existingSightings.length > 0
        ? existingSightings[existingSightings.length - 1].sequence + 1
        : 2;

      const id = crypto.randomUUID();
      const [sighting] = await db.insert(sightingsTable).values({
        id, petId, reporterId: user.id, photoUrl, lat, lng, address,
        seenAt: new Date(seenAt), notes: notes ?? null,
        confidence, isFlagged: false, sequence: nextSequence,
      }).returning();

      await db.insert(petUpdatesTable).values({
        id: crypto.randomUUID(),
        petId,
        authorId: user.id,
        content: `New sighting added by ${user.displayName} at ${address}`,
        type: "GENERAL",
      });

      await db.update(petsTable).set({ updatedAt: new Date() }).where(eq(petsTable.id, petId));

      const allSightings = await db
        .select()
        .from(sightingsTable)
        .where(and(eq(sightingsTable.petId, petId), eq(sightingsTable.isFlagged, false)))
        .orderBy(asc(sightingsTable.sequence));

      const verifiedPath = allSightings.map((s) => ({ lat: s.lat, lng: s.lng }));

      if (io) {
        io.to(`pet:${petId}`).emit("sighting:new", {
          sighting: {
            ...sighting,
            seenAt: sighting.seenAt?.toISOString(),
            flaggedAt: null,
            createdAt: sighting.createdAt?.toISOString(),
            reporter: { ...user, createdAt: user.createdAt?.toISOString() },
          },
          verifiedPath,
        });
      }

      const locationPoints = [
        { lat: pet.lastSeenLat, lng: pet.lastSeenLng, timestamp: pet.lastSeenAt?.toISOString() ?? "", notes: null },
        ...allSightings.map((s) => ({
          lat: s.lat,
          lng: s.lng,
          timestamp: s.seenAt?.toISOString() ?? "",
          notes: s.notes,
        })),
      ];

      setImmediate(() => {
        generateAiPath(petId, pet.name, pet.species, locationPoints, io as Parameters<typeof generateAiPath>[4])
          .catch((err) => logger.error({ err }, "Background AI path generation failed"));
      });

      res.status(201).json({
        ...sighting,
        seenAt: sighting.seenAt?.toISOString(),
        flaggedAt: null,
        createdAt: sighting.createdAt?.toISOString(),
        reporter: { ...user, createdAt: user.createdAt?.toISOString() },
      });
    } catch (err) {
      logger.error({ err }, "Error creating sighting");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.patch("/sightings/:id/flag", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const user = await getUserByFirebaseUid(req.user!.uid);
      if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

      const [sighting] = await db.select().from(sightingsTable).where(eq(sightingsTable.id, id)).limit(1);
      if (!sighting) { res.status(404).json({ error: "Sighting not found" }); return; }

      const [pet] = await db.select().from(petsTable).where(eq(petsTable.id, sighting.petId)).limit(1);
      if (!pet || pet.ownerId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

      const [updated] = await db
        .update(sightingsTable)
        .set({ isFlagged: true, flaggedAt: new Date() })
        .where(eq(sightingsTable.id, id))
        .returning();

      await db.insert(petUpdatesTable).values({
        id: crypto.randomUUID(),
        petId: sighting.petId,
        authorId: user.id,
        content: "A sighting was flagged as invalid by the owner",
        type: "SIGHTING_FLAGGED",
      });

      res.json({ ...updated, seenAt: updated.seenAt?.toISOString(), flaggedAt: updated.flaggedAt?.toISOString() ?? null, createdAt: updated.createdAt?.toISOString() });
    } catch (err) {
      logger.error({ err }, "Error flagging sighting");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.patch("/sightings/:id/unflag", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const user = await getUserByFirebaseUid(req.user!.uid);
      if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

      const [sighting] = await db.select().from(sightingsTable).where(eq(sightingsTable.id, id)).limit(1);
      if (!sighting) { res.status(404).json({ error: "Sighting not found" }); return; }

      const [pet] = await db.select().from(petsTable).where(eq(petsTable.id, sighting.petId)).limit(1);
      if (!pet || pet.ownerId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

      const [updated] = await db
        .update(sightingsTable)
        .set({ isFlagged: false, flaggedAt: null })
        .where(eq(sightingsTable.id, id))
        .returning();

      res.json({ ...updated, seenAt: updated.seenAt?.toISOString(), flaggedAt: null, createdAt: updated.createdAt?.toISOString() });
    } catch (err) {
      logger.error({ err }, "Error unflagging sighting");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
