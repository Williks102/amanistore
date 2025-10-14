
import * as admin from 'firebase-admin';

// Assurez-vous que les variables d'environnement sont définies
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    if (process.env.NODE_ENV === 'production') {
        console.warn('Firebase admin environment variables are not set. Admin SDK will not be initialized.');
    }
} else {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };

    if (!admin.apps.length) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as any),
            });
        } catch (error) {
            console.error('Firebase Admin initialization error', error);
        }
    }
}


// Exporter les services seulement après une initialisation potentielle.
// Si l'initialisation a échoué ou n'a pas eu lieu, ces appels lèveront des erreurs claires.
let adminDb, adminAuth;

if (admin.apps.length) {
    adminDb = admin.firestore();
    adminAuth = admin.auth();
} else {
    // Fournir des objets factices ou null pour éviter les erreurs d'importation,
    // mais les tentatives d'utilisation échoueront, ce qui est attendu.
    adminDb = null;
    adminAuth = null;
}

export { adminDb, adminAuth };
