import type { CartItem, Selection } from './types';
import { availableStockFor, productOptions, resolveSelection, selectionForLine, valueKey } from './attributes';

/** Choix d'une ligne de panier ou de commande: le nouveau format, ou l'ancien (pointure + couleur) converti. */
export function lineSelection(item: Pick<CartItem, 'product' | 'selection' | 'size' | 'color'>): Selection {
  return selectionForLine(item.product, item);
}

/**
 * Texte des choix d'une ligne: « Pointure 40 · Noir » (la couleur s'écrit seule), « Taille 54 · Doré »,
 * vide pour un produit sans attribut (sac). Fonctionne pour les anciennes commandes.
 */
export function lineLabel(item: Pick<CartItem, 'product' | 'selection' | 'size' | 'color'>): string {
  const colorNames = new Set(productOptions(item.product).filter((o) => o.kind === 'color').map((o) => valueKey(o.name)));
  // Ancienne ligne (sans `selection`): on affiche ce qui a été enregistré, même si la copie du produit n'a plus ses attributs.
  const shown: Selection = item.selection ?? [
    ...(item.size ? [{ name: 'Pointure', value: String(item.size) }] : []),
    ...(item.color ? [{ name: 'Couleur', value: item.color }] : []),
  ];
  return shown
    .map((s) => (colorNames.has(valueKey(s.name)) || (!item.selection && s.name === 'Couleur') ? s.value : `${s.name} ${s.value}`))
    .join(' · ');
}

/** Même choix = même ligne de panier. */
export const lineKey = (item: Pick<CartItem, 'product' | 'selection' | 'size' | 'color'>): string =>
  `${item.product.id}|${lineSelection(item).map((s) => `${valueKey(s.name)}=${valueKey(s.value)}`).join('&')}`;

/** Stock restant pour la combinaison d'une ligne (null = non suivi ou choix qui n'existe plus). */
export function lineStockLeft(item: Pick<CartItem, 'product' | 'selection' | 'size' | 'color'>): number | null {
  const resolved = resolveSelection(item.product, lineSelection(item));
  return resolved.ok ? availableStockFor(item.product, resolved.values) : null;
}

/** Ligne envoyée au serveur: le nouveau format si la ligne l'a, sinon l'ancien. */
export function orderPayloadLine(item: CartItem): { productId: string; quantity: number; selection?: Selection; size?: number; color?: string } {
  return item.selection
    ? { productId: item.product.id, quantity: item.quantity, selection: item.selection }
    : { productId: item.product.id, quantity: item.quantity, size: item.size, color: item.color };
}
