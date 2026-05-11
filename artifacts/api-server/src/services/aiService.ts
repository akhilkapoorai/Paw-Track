import { GoogleGenAI } from "@google/genai";
import { db, petsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

function getAiClient(): GoogleGenAI {
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("AI_INTEGRATIONS_GEMINI_BASE_URL and AI_INTEGRATIONS_GEMINI_API_KEY must be set");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "", baseUrl },
  });
}

interface Location {
  lat: number;
  lng: number;
  timestamp: string;
  notes?: string | null;
}

interface AiCoordinate {
  lat: number;
  lng: number;
  confidence: string;
  reasoning: string;
}

interface AiPathResult {
  coordinates: AiCoordinate[];
  summary: string;
  generatedAt: string;
  approved: boolean;
}

export async function generateAiPath(
  petId: string,
  petName: string,
  petSpecies: string,
  verifiedLocations: Location[],
  io?: { to: (room: string) => { emit: (event: string, data: unknown) => void } }
): Promise<void> {
  if (verifiedLocations.length < 2) return;

  try {
    const ai = getAiClient();

    const prompt = `You are an animal search-and-rescue expert. A lost ${petSpecies} named "${petName}" has been spotted at the following GPS locations in chronological order:

${verifiedLocations.map((loc, i) => `${i + 1}. Lat: ${loc.lat}, Lng: ${loc.lng} — ${loc.timestamp}${loc.notes ? ` — Notes: "${loc.notes}"` : ""}`).join("\n")}

Based on the direction of travel, time intervals between sightings, and typical ${petSpecies} behavior patterns:
- Dogs tend to follow roads, head toward parks and food smells, and move 1-4 miles per day when lost
- Cats typically stay within 1-3 blocks of familiar territory, hide during day, move at night

Predict the next 3-5 GPS coordinates where this pet is most likely to be found.
Each coordinate must be geographically realistic given the existing path (small incremental movements, not large jumps).
Return a confidence level and brief reasoning for each predicted point.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "predictedPath": [
    { "lat": 0.0, "lng": 0.0, "confidence": "high|medium|low", "reasoning": "..." }
  ],
  "summary": "2-sentence summary of predicted movement pattern"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });

    const text = response.text ?? "";
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as { predictedPath: AiCoordinate[]; summary: string };

    const aiPathCache: AiPathResult = {
      coordinates: parsed.predictedPath,
      summary: parsed.summary,
      generatedAt: new Date().toISOString(),
      approved: false,
    };

    await db
      .update(petsTable)
      .set({ aiPathCache, updatedAt: new Date() })
      .where(eq(petsTable.id, petId));

    if (io) {
      io.to(`pet:${petId}`).emit("ai:path-updated", {
        aiPath: parsed.predictedPath,
        summary: parsed.summary,
      });
    }

    logger.info({ petId }, "AI path generated successfully");
  } catch (err) {
    logger.error({ err, petId }, "Failed to generate AI path — keeping existing cache");
  }
}
