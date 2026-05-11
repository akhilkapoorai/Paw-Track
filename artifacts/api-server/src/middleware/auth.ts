import { Request, Response, NextFunction } from "express";
import { getFirebaseAuth } from "../lib/firebaseAdmin.js";
import { logger } from "../lib/logger.js";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
    next();
  } catch (err) {
    logger.warn({ err }, "Invalid Firebase token");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
