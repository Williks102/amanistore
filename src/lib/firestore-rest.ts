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

/** Firestore n'a pas pu répondre (réseau, délai, erreur serveur, accès refusé): ce n'est PAS un produit introuvable. */
export class ShoeUnavailableError extends Error {
  constructor(detail: string) {
    super(`Produit momentanément indisponible (${detail})`);
    this.name = 'ShoeUnavailableError';
  }
}

const RETRY_DELAY_MS = 250;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Un produit par son identifiant. `null` seulement s'il n'existe pas (404) ou si l'identifiant est invalide.
 * Une panne passagère (réseau coupé, 5xx) est retentée une fois, puis signalée par une erreur: avant, elle
 * s'affichait comme « page introuvable » devant la cliente (constaté dans les journaux de production).
 */
export async function fetchShoeById(id: string, fetchImpl: typeof fetch = fetch): Promise<Shoe | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  let lastDetail = 'inconnu';
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await delay(RETRY_DELAY_MS);
    try {
      const res = await fetchImpl(`${BASE}/shoes/${id}`, { next: { revalidate: REVALIDATE_SECONDS } } as RequestInit);
      if (res.status === 404) return null;
      if (res.ok) return toShoe((await res.json()) as RestDocument);
      lastDetail = `HTTP ${res.status}`;
      if (res.status < 500) break; // 4xx: réessayer ne changerait rien
    } catch (error) {
      lastDetail = error instanceof Error ? error.name : 'réseau';
    }
  }
  throw new ShoeUnavailableError(lastDetail);
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
