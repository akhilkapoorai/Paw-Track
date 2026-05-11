import { Router, Request, Response } from "express";
import multer from "multer";
import { getFirebaseStorage } from "../lib/firebaseAdmin.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, WebP, HEIC allowed."));
    }
  },
});

router.post(
  "/uploads/image",
  requireAuth,
  upload.single("image"),
  async (req: AuthRequest & Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }
    try {
      const storage = getFirebaseStorage();
      const bucket = storage.bucket();
      const filename = `uploads/${Date.now()}-${crypto.randomUUID()}-${req.file.originalname}`;
      const file = bucket.file(filename);

      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });
      await file.makePublic();

      const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      res.json({ url });
    } catch (err) {
      logger.error({ err }, "Image upload failed");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
