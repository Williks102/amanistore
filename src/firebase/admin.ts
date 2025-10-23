
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminDb: Firestore;

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    if (process.env.NODE_ENV === 'production') {
        console.error('Firebase admin environment variables are not set. Admin SDK will not be initialized.');
    }
} else {
    let app: App;
    if (!getApps().length) {
        try {
            app = initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
            adminDb = getFirestore(app);
        } catch (error) {
            console.error('Firebase Admin initialization error', error);
        }
    } else {
        app = getApps()[0];
        adminDb = getFirestore(app);
    }
}


export { adminDb };
