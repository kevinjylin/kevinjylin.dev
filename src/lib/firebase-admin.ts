import { readFileSync } from "node:fs";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firebaseApp: App | null = null;
let firestoreClient: Firestore | null = null;

function parseInlineServiceAccount(): ServiceAccount | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    return null;
  }

  try {
    const parsed = JSON.parse(json) as ServiceAccount & {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (parsed.projectId || parsed.project_id) {
      return {
        projectId: parsed.projectId ?? parsed.project_id,
        clientEmail: parsed.clientEmail ?? parsed.client_email,
        privateKey: parsed.privateKey ?? parsed.private_key,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function parseSplitServiceAccount(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

function loadServiceAccountFromFile(): ServiceAccount | null {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(credentialsPath, "utf8")) as ServiceAccount;
  } catch {
    return null;
  }
}

function resolveCredential() {
  const serviceAccount =
    parseInlineServiceAccount() ?? parseSplitServiceAccount() ?? loadServiceAccountFromFile();

  if (serviceAccount?.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    return cert(serviceAccount);
  }

  // Application Default Credentials (GCP, Cloud Run, etc.)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCLOUD_PROJECT) {
    return applicationDefault();
  }

  return null;
}

export function isFirebaseConfigured(): boolean {
  return resolveCredential() !== null;
}

export function getFirebaseApp(): App | null {
  const credential = resolveCredential();
  if (!credential) {
    return null;
  }

  if (!firebaseApp) {
    firebaseApp =
      getApps()[0] ??
      initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT,
      });
  }

  return firebaseApp;
}

export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  if (!firestoreClient) {
    firestoreClient = getFirestore(app);
  }

  return firestoreClient;
}
