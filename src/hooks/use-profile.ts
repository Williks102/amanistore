'use client';

import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, useUser } from '@/firebase';
import { EMPTY_PROFILE, sanitizeProfile, validateProfile, type Profile } from '@/lib/profile';

/**
 * Coordonnées enregistrées de la cliente connectée (users/{uid}: nom, téléphone, adresse).
 * `enabled` évite une lecture Firestore à chaque page: on ne charge que quand on en a besoin.
 */
export function useProfile(enabled: boolean = true) {
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;
    setIsLoading(true);
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => { if (!cancelled) setProfile(sanitizeProfile(snap.exists() ? snap.data() : null)); })
      .catch(() => { /* lecture impossible: formulaire vide, la commande reste possible */ })
      .finally(() => { if (!cancelled) { setIsLoading(false); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [enabled, user]);

  /** Enregistre (fusionne) les coordonnées. Retourne un message d'erreur, ou null si tout va bien. */
  const save = useCallback(async (input: Partial<Profile>): Promise<string | null> => {
    const clean = sanitizeProfile(input);
    const problem = validateProfile(clean);
    if (problem) return problem;
    if (!user) return 'Connexion requise.';
    try {
      await setDoc(doc(db, 'users', user.uid), { id: user.uid, email: user.email ?? '', ...clean, updatedAt: serverTimestamp() }, { merge: true });
      setProfile(clean);
      return null;
    } catch {
      return 'Enregistrement impossible pour le moment.';
    }
  }, [user]);

  return { profile, isLoading, loaded, save };
}
