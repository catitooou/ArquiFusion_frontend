import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from './env.js';

export const firebaseApp = FIREBASE_ENABLED ? initializeApp(FIREBASE_CONFIG) : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
