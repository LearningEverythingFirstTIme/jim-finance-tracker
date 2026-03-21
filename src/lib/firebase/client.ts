import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

function initializeFirebase() {
  if (app) return;

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };

  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
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

export { app, auth, db };
