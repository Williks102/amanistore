'use client';

import { auth } from '@/firebase';

/** Jeton d'identité Firebase de l'utilisateur connecté (chaîne vide si déconnecté). */
export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) return '';
  try {
    return await user.getIdToken();
  } catch {
    return '';
  }
}
