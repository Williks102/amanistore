
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Ce fichier est destiné à être importé UNIQUEMENT côté serveur (ex: actions.ts).
// Il garantit que l'initialisation de Firebase n'inclut pas de dépendances client.

let firebaseApp: FirebaseApp;

if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

const db = getFirestore(firebaseApp);

export { db, firebaseApp };
