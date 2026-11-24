/**
 * Mémoire locale des commandes passées sans compte: l'identifiant de la commande et son secret
 * (reçu une seule fois du serveur) restent sur l'appareil, pour relire la confirmation et le code de livraison.
 */
const KEY = 'amani:guest-orders';
const MAX_KEPT = 10;

function read(): Record<string, string> {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveGuestOrder(orderId: string, secret: string): void {
  try {
    const map = read();
    delete map[orderId];
    map[orderId] = secret; // l'ordre d'insertion garde les plus récentes en dernier
    const keys = Object.keys(map);
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_KEPT))) delete map[old];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* stockage indisponible (navigation privée): la page de confirmation affichera un message */
  }
}

export function getGuestSecret(orderId: string): string | null {
  const secret = read()[orderId];
  return typeof secret === 'string' ? secret : null;
}

/** Toutes les commandes sans compte mémorisées sur cet appareil (la plus récente en dernier). */
export function listGuestOrders(): Array<{ orderId: string; secret: string }> {
  return Object.entries(read())
    .filter(([, secret]) => typeof secret === 'string')
    .map(([orderId, secret]) => ({ orderId, secret }));
}

/** Oublie des commandes (par exemple après leur rattachement à un compte). */
export function removeGuestOrders(orderIds: string[]): void {
  try {
    const map = read();
    for (const id of orderIds) delete map[id];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* stockage indisponible */
  }
}
