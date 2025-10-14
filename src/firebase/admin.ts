
import * as admin from 'firebase-admin';

// Assurez-vous que les variables d'environnement sont définies
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    // En production, il est crucial que ces variables soient définies.
    // En développement, un avertissement peut suffire si l'admin SDK n'est pas toujours nécessaire.
    if (process.env.NODE_ENV === 'production') {
        console.error('Firebase admin environment variables are not set. Admin SDK will not be initialized.');
    }
} else {
    // Initialise l'application admin seulement si elle ne l'a pas déjà été.
    if (!admin.apps.length) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    // Remplace les caractères d'échappement pour la clé privée
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
        } catch (error) {
            console.error('Firebase Admin initialization error', error);
        }
    }
}

// Exporte une instance de la base de données Firestore de l'admin SDK.
// Si l'initialisation a échoué, cet appel lèvera une erreur, ce qui est attendu.
const adminDb = admin.apps.length ? admin.firestore() : null;

export { adminDb };
