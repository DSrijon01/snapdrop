import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

let firebaseAdminApp: App | undefined;
let firebaseAdminAuth: Auth | undefined;

/**
 * Initializes and exports the Firebase Admin instance using modern modular v12 SDK.
 * Supports:
 * 1. Environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * 2. Service account JSON file path (GOOGLE_APPLICATION_CREDENTIALS)
 * 3. Default app initialization
 */
export function getFirebaseAdminAuth(): Auth {
  if (firebaseAdminAuth) {
    return firebaseAdminAuth;
  }

  const apps = getApps();
  if (apps.length > 0) {
    firebaseAdminApp = apps[0];
    firebaseAdminAuth = getAuth(firebaseAdminApp);
    return firebaseAdminAuth;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "streetsync-ss";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  try {
    if (clientEmail && privateKey) {
      firebaseAdminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      firebaseAdminApp = initializeApp({
        projectId,
      });
    }
  } catch (error) {
    console.warn("[Firebase Admin] Initialization warning:", error);
    // If already initialized in another module
    const currentApps = getApps();
    if (currentApps.length > 0) {
      firebaseAdminApp = currentApps[0];
    }
  }

  firebaseAdminAuth = firebaseAdminApp ? getAuth(firebaseAdminApp) : getAuth();
  return firebaseAdminAuth;
}
