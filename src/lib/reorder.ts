import type { CartItem, Shoe } from './types';
import { canonicalColorName } from './colors';
import { isListable, isSizeValid } from './product-validation';
import { availableStock } from './stock';

const MAX_PER_LINE = 20; // même plafond que le serveur

export type ReorderPlan = {
  toAdd: Array<{ product: Shoe; quantity: number; size: number; color: string }>;
  /** Articles qui ne peuvent pas être recommandés, avec la raison (affichée à la cliente). */
  skipped: Array<{ name: string; reason: string }>;
  /** Articles ajoutés avec une quantité réduite faute de stock. */
  reduced: string[];
};

/**
 * Prépare « Recommander »: compare les articles d'une ancienne commande au catalogue d'aujourd'hui
 * (produit encore affichable, pointure et couleur toujours proposées, stock).
 */
export function planReorder(items: CartItem[], catalog: Shoe[]): ReorderPlan {
  const plan: ReorderPlan = { toAdd: [], skipped: [], reduced: [] };
  for (const item of items) {
    const name = item.product.name;
    const product = catalog.find((p) => p.id === item.product.id);
    if (!product || !isListable(product)) {
      plan.skipped.push({ name, reason: 'ce modèle n’est plus disponible' });
      continue;
    }
    if (!isSizeValid(item.size) || (product.availableSizes?.length && !product.availableSizes.includes(item.size))) {
      plan.skipped.push({ name, reason: `la pointure ${item.size} n’est plus proposée` });
      continue;
    }
    const color = product.availableColors?.find((c) => canonicalColorName(c.name) === canonicalColorName(item.color));
    if (product.availableColors?.length && !color) {
      plan.skipped.push({ name, reason: `la couleur ${item.color} n’est plus proposée` });
      continue;
    }
    const stock = availableStock(product, item.size);
    if (stock === 0) {
      plan.skipped.push({ name, reason: `la pointure ${item.size} est épuisée` });
      continue;
    }
    const quantity = Math.min(item.quantity, stock ?? MAX_PER_LINE, MAX_PER_LINE);
    if (quantity < item.quantity) plan.reduced.push(name);
    plan.toAdd.push({ product, quantity, size: item.size, color: color?.name ?? item.color });
  }
  return plan;
}
