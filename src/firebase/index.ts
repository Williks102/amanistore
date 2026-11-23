
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp;
// Ensure Firebase is only initialized once
if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
} else {
    firebaseApp = getApp();
}

// App Check: prouve à Firebase que les appels viennent bien de ce site.
// Inactif tant que NEXT_PUBLIC_RECAPTCHA_SITE_KEY n'est pas définie (rien ne casse).
// N'activez « Appliquer » dans la console (Firestore) qu'après déploiement et
// vérification des métriques App Check, sinon les lectures non signées seront refusées.
declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
if (typeof window !== 'undefined' && recaptchaSiteKey) {
  if (process.env.NODE_ENV !== 'production') {
    // En développement local: un jeton de débogage s'affiche dans la console du navigateur
    // et doit être enregistré dans App Check > Applications > Gérer les jetons de débogage.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  try {
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    // Déjà initialisé (rechargement à chaud) ou clé invalide: on n'empêche pas le site de fonctionner.
    console.warn('App Check non initialisé:', error);
  }
}

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// This function can be called to get the initialized services.
export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} {
  // The services are already initialized above, so we just return them.
  return { firebaseApp, auth, firestore: db };
}

// Re-exporting initialized services for direct use
export { firebaseApp, auth, db };


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';