import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { FIREBASE_SERVICE_ACCOUNT } from 'astro:env/server';

const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });

export const adminAuth = getAuth(app);
export const db = getFirestore(app);
