import { firebaseConfig } from '@/firebase/config';
import type { Shoe } from './types';

/**
 * Lecture publique des produits côté serveur via l'API REST de Firestore (les règles autorisent la lecture
 * publique du catalogue). Sert aux pages produit, à leur aperçu de partage et au sitemap, sans identifiants
 * d'administration. Mis en cache 5 minutes par Next.
 */
const BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const REVALIDATE_SECONDS = 300;

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

/** Convertit une valeur typée de l'API REST en valeur JavaScript. */
export function fromFirestoreValue(v: FirestoreValue): unknown {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue?.values ?? []).map(fromFirestoreValue);
  if ('mapValue' in v) return fromFirestoreFields(v.mapValue?.fields ?? {});
  return undefined;
}

export function fromFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFirestoreValue(v)]));
}

type RestDocument = { name: string; fields?: Record<string, FirestoreValue> };

function toShoe(doc: RestDocument): Shoe {
  const id = doc.name.split('/').pop() as string;
  return { id, ...fromFirestoreFields(doc.fields ?? {}) } as Shoe;
}

/** Un produit par son identifiant, ou null s'il n'existe pas (ou si la lecture échoue). */
export async function fetchShoeById(id: string): Promise<Shoe | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  try {
    const res = await fetch(`${BASE}/shoes/${id}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    return toShoe((await res.json()) as RestDocument);
  } catch {
    return null;
  }
}

/** Tous les produits (pagination REST), pour le sitemap. */
export async function fetchAllShoes(): Promise<Shoe[]> {
  const shoes: Shoe[] = [];
  let pageToken = '';
  try {
    for (let page = 0; page < 20; page++) {
      const url = `${BASE}/shoes?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
      if (!res.ok) break;
      const body = (await res.json()) as { documents?: RestDocument[]; nextPageToken?: string };
      shoes.push(...(body.documents ?? []).map(toShoe));
      if (!body.nextPageToken) break;
      pageToken = body.nextPageToken;
    }
  } catch {
    /* on retourne ce qu'on a */
  }
  return shoes;
}
