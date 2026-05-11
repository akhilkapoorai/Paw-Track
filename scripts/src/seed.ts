import { db, usersTable, petsTable, sightingsTable, petUpdatesTable } from "@workspace/db";

const DEMO_USER_ID = "seed-user-001";
const DEMO_FIREBASE_UID = "seed-firebase-uid-001";

const DEMO_PETS = [
  {
    id: crypto.randomUUID(),
    name: "Buddy",
    species: "dog",
    breed: "Golden Retriever",
    color: "golden",
    size: "large",
    age: "3 years",
    description: "Friendly golden retriever with a red collar and a heart-shaped tag. Very friendly with strangers and other dogs. He loves parks.",
    photoUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&q=80",
    status: "LOST" as const,
    lastSeenAddress: "Central Park, New York, NY",
    lastSeenLat: 40.7851,
    lastSeenLng: -73.9683,
    lastSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: crypto.randomUUID(),
    name: "Whiskers",
    species: "cat",
    breed: "Siamese",
    color: "cream and brown",
    size: "small",
    age: "5 years",
    description: "Siamese cat with blue eyes and a distinctive dark face. She wears a blue collar. Very shy around strangers but comes to her name.",
    photoUrl: "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=600&q=80",
    status: "LOST" as const,
    lastSeenAddress: "Mission District, San Francisco, CA",
    lastSeenLat: 37.7599,
    lastSeenLng: -122.4148,
    lastSeenAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: crypto.randomUUID(),
    name: "Max",
    species: "dog",
    breed: "Beagle",
    color: "tricolor",
    size: "medium",
    age: "2 years",
    description: "Young beagle with classic tricolor markings. Has a green bandana. Very energetic and loves food.",
    photoUrl: "https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=600&q=80",
    status: "FOUND" as const,
    lastSeenAddress: "Lincoln Park, Chicago, IL",
    lastSeenLat: 41.9241,
    lastSeenLng: -87.6348,
    lastSeenAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: crypto.randomUUID(),
    name: "Luna",
    species: "cat",
    breed: "Maine Coon",
    color: "black",
    size: "medium",
    age: "4 years",
    description: "All black Maine Coon with long fur and yellow eyes. Has a silver tag with her name. Very vocal.",
    photoUrl: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&q=80",
    status: "LOST" as const,
    lastSeenAddress: "Williamsburg, Brooklyn, NY",
    lastSeenLat: 40.7081,
    lastSeenLng: -73.9571,
    lastSeenAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: crypto.randomUUID(),
    name: "Charlie",
    species: "dog",
    breed: "Labrador",
    color: "black",
    size: "large",
    age: "6 years",
    description: "Large black lab with a brown chest patch. Wearing an orange collar. Very well-trained and responds to commands.",
    photoUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80",
    status: "REUNITED" as const,
    lastSeenAddress: "Hyde Park, Austin, TX",
    lastSeenLat: 30.2849,
    lastSeenLng: -97.7341,
    lastSeenAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: crypto.randomUUID(),
    name: "Coco",
    species: "dog",
    breed: "Chihuahua",
    color: "tan",
    size: "small",
    age: "8 years",
    description: "Tiny tan chihuahua with big ears. Wears a pink rhinestone collar. Elderly and may be confused. Please approach gently.",
    photoUrl: "https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=600&q=80",
    status: "LOST" as const,
    lastSeenAddress: "Koreatown, Los Angeles, CA",
    lastSeenLat: 34.0611,
    lastSeenLng: -118.3003,
    lastSeenAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
];

async function seed() {
  console.log("🌱 Seeding database...");

  const existingUser = await db.select().from(usersTable).limit(1);
  let userId = DEMO_USER_ID;

  if (existingUser.length === 0) {
    console.log("Creating demo user...");
    const [user] = await db.insert(usersTable).values({
      id: DEMO_USER_ID,
      firebaseUid: DEMO_FIREBASE_UID,
      displayName: "PawTrack Demo",
      email: "demo@pawtrack.app",
      photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=pawtrack",
      provider: "google",
    }).onConflictDoNothing().returning();
    if (user) userId = user.id;
    else userId = DEMO_USER_ID;
  } else {
    userId = existingUser[0].id;
    console.log(`Using existing user: ${existingUser[0].displayName}`);
  }

  const existingPets = await db.select().from(petsTable).limit(1);
  if (existingPets.length > 0) {
    console.log(`Database already has pets — skipping pet seed.`);
    console.log("✅ Seed check complete.");
    return;
  }

  console.log(`Inserting ${DEMO_PETS.length} demo pets...`);
  for (const petData of DEMO_PETS) {
    const [pet] = await db.insert(petsTable).values({
      ...petData,
      ownerId: userId,
      aiPathCache: null,
      updatedAt: petData.lastSeenAt,
    }).returning();

    await db.insert(petUpdatesTable).values({
      id: crypto.randomUUID(),
      petId: pet.id,
      authorId: userId,
      content: `${pet.name} was reported ${pet.status === "REUNITED" ? "lost (now reunited!)" : "lost"}`,
      type: "GENERAL",
    });

    if (pet.status === "REUNITED") {
      await db.insert(petUpdatesTable).values({
        id: crypto.randomUUID(),
        petId: pet.id,
        authorId: userId,
        content: `${pet.name} has been reunited with their family! Thank you to everyone who helped!`,
        type: "GENERAL",
      });
    }

    if (petData.species === "dog" && pet.status !== "REUNITED") {
      const sightingLat = petData.lastSeenLat + 0.005;
      const sightingLng = petData.lastSeenLng + 0.003;
      await db.insert(sightingsTable).values({
        id: crypto.randomUUID(),
        petId: pet.id,
        reporterId: userId,
        photoUrl: petData.photoUrl,
        lat: sightingLat,
        lng: sightingLng,
        address: `Near ${petData.lastSeenAddress.split(",")[0]} and Main St`,
        seenAt: new Date(petData.lastSeenAt.getTime() + 3 * 60 * 60 * 1000),
        notes: "Running north on the sidewalk",
        confidence: "high",
        isFlagged: false,
        sequence: 2,
      });

      await db.insert(petUpdatesTable).values({
        id: crypto.randomUUID(),
        petId: pet.id,
        authorId: userId,
        content: `New sighting reported near ${petData.lastSeenAddress.split(",")[0]}`,
        type: "GENERAL",
      });
    }

    console.log(`  ✓ ${pet.name} (${pet.species})`);
  }

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
