import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function initializeFirebase() {
  if (app) return;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const missing = [
    !apiKey && 'NEXT_PUBLIC_FIREBASE_API_KEY',
    !authDomain && 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    !projectId && 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    !storageBucket && 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    !messagingSenderId && 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    !appId && 'NEXT_PUBLIC_FIREBASE_APP_ID',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing required Firebase environment variables: ${missing.join(', ')}`);
  }

  const firebaseConfig = { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };

  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

if (typeof window !== 'undefined') {
  initializeFirebase();
}

export function getClientAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Auth can only be used on the client');
  }
  initializeFirebase();
  return auth!;
}

export function getClientDb(): Firestore {
  if (typeof window === 'undefined') {
    throw new Error('Firestore can only be used on the client');
  }
  initializeFirebase();
  return db!;
}

export function getClientStorage(): FirebaseStorage {
  if (typeof window === 'undefined') {
    throw new Error('Storage can only be used on the client');
  }
  initializeFirebase();
  return storage!;
}

export { app, auth, db, storage };
