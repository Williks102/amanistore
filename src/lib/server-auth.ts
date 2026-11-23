import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import { adminDb } from '@/firebase/admin';

export type Role = 'admin' | 'productManager' | 'orderManager';

export class AuthError extends Error {
  constructor(message = 'Accès refusé.') {
    super(message);
    this.name = 'AuthError';
  }
}

export type Roles = { admin: boolean; productManager: boolean; orderManager: boolean };

/** Vérifie le jeton Firebase envoyé par le client et retourne l'UID. */
export async function verifyToken(idToken: unknown): Promise<string> {
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 4096 || getApps().length === 0) {
    throw new AuthError('Authentification requise.');
  }
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    throw new AuthError('Session invalide ou expirée.');
  }
}

/** Lit les rôles dans roles/{uid}. Seule source de vérité (jamais users/{uid}.role, modifiable par l'utilisateur). */
export async function getRolesForUid(uid: string): Promise<Roles> {
  const none: Roles = { admin: false, productManager: false, orderManager: false };
  if (!adminDb) return none;
  const snap = await adminDb.collection('roles').doc(uid).get();
  if (!snap.exists) return none;
  const d = snap.data() ?? {};
  return {
    admin: d.admin === true,
    productManager: d.productManager === true,
    orderManager: d.orderManager === true,
  };
}

/** Exige un jeton valide. Retourne l'UID. */
export async function requireUser(idToken: unknown): Promise<string> {
  return verifyToken(idToken);
}

/** Exige un jeton valide et au moins un des rôles listés (admin passe toujours). */
export async function requireRole(idToken: unknown, allowed: Role[]): Promise<string> {
  const uid = await verifyToken(idToken);
  const roles = await getRolesForUid(uid);
  if (roles.admin || allowed.some((r) => roles[r])) return uid;
  throw new AuthError('Accès refusé.');
}
