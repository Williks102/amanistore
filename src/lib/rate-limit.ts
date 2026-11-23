import { headers } from 'next/headers';

/**
 * Limiteur de débit en mémoire (fenêtre glissante).
 * Limite: l'état est local à l'instance. Suffisant pour freiner les abus
 * simples sur une seule instance; à remplacer par un store partagé
 * (Redis, etc.) si l'application est déployée sur plusieurs instances.
 */
const buckets = new Map<string, number[]>();

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return h.get('x-real-ip') || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Retourne true si la requête est autorisée, false si la limite est dépassée. */
export async function rateLimit(action: string, max: number, windowMs: number): Promise<boolean> {
  const key = `${action}:${await getClientIp()}`;
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);

  // Nettoyage opportuniste pour éviter une croissance illimitée de la Map.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}
