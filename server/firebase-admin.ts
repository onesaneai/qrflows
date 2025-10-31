import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables (prefer server/.env when running locally)
dotenv.config({ path: path.join(process.cwd(), "server", ".env") });

// Prevent re-initializing Firebase in case of hot reloads
if (!admin.apps.length) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  // const serviceAccountInput = process.env.FIREBASE_SERVICE_ACCOUNT;

  const serviceAccountInput = {
    type: process.env.SERVICE_TYPE,                 // match .env exactly
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    // Convert literal "\n" sequences into real newlines:
    private_key: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
    universe_domain: process.env.UNIVERSE_DOMAIN,
  };
  if (!projectId) {
    throw new Error(
      "❌ Missing environment variable: VITE_FIREBASE_PROJECT_ID"
    );
  }

  if (!serviceAccountInput) {
    throw new Error(
      "❌ Missing FIREBASE_SERVICE_ACCOUNT. Please provide either a path to the JSON key file or the JSON content."
    );
  }

  let serviceAccount: admin.ServiceAccount;

  try {
      // Otherwise, assume it’s a JSON string from an environment variable
      serviceAccount = JSON.parse(JSON.stringify(serviceAccountInput));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`,
    });

    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", error);
    throw new Error(
      `Firebase Admin initialization failed. Check FIREBASE_SERVICE_ACCOUNT format. Error: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export const auth = admin.auth();
export const database = admin.database();
export default admin;
