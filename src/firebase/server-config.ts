import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './config';

// This is a server-only file.

let adminApp: FirebaseApp;

if (getApps().some(app => app.name === 'admin')) {
    adminApp = getApp('admin');
} else {
    adminApp = initializeApp(firebaseConfig, 'admin');
}

export const getAdminApp = () => adminApp;
