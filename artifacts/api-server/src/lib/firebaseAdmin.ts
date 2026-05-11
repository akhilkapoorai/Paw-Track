import * as admin from "firebase-admin";

let firebaseApp: admin.app.App | undefined;

export function getFirebaseApp(): admin.app.App {
  if (!firebaseApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    if (!projectId || !clientEmail || !privateKey || !storageBucket) {
      throw new Error(
        "Firebase Admin SDK credentials not fully configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET in Replit Secrets."
      );
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket,
    });
  }
  return firebaseApp;
}

export function getFirebaseAuth(): admin.auth.Auth {
  return getFirebaseApp().auth();
}

export function getFirebaseStorage(): admin.storage.Storage {
  return getFirebaseApp().storage();
}
