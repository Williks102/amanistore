import type { CartItem, Selection, Shoe } from './types';
import { isListable } from './product-validation';
import { availableStockFor, productOptions, resolveSelection, selectionForLine } from './attributes';

const MAX_PER_LINE = 20; // même plafond que le serveur

export type ReorderPlan = {
  toAdd: Array<{ product: Shoe; quantity: number; selection: Selection }>;
  /** Articles qui ne peuvent pas être recommandés, avec la raison (affichée à la cliente). */
  skipped: Array<{ name: string; reason: string }>;
  /** Articles ajoutés avec une quantité réduite faute de stock. */
  reduced: string[];
};

/**
 * Prépare « Recommander »: compare les articles d'une ancienne commande au catalogue d'aujourd'hui
 * (produit encore affichable, choix toujours proposés, stock). Les anciennes commandes (pointure + couleur) sont comprises.
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
    const resolved = resolveSelection(product, selectionForLine(product, item));
    if (!resolved.ok) {
      plan.skipped.push({
        name,
        reason: resolved.option && resolved.value ? `${resolved.option} ${resolved.value} n’est plus proposé` : 'les options choisies ne sont plus proposées',
      });
      continue;
    }
    const options = productOptions(product);
    const selection: Selection = options.map((o, i) => ({ name: o.name, value: resolved.values[i] }));
    const stock = availableStockFor(product, resolved.values);
    if (stock === 0) {
      const what = selection.map((s) => `${s.name} ${s.value}`).join(' · ');
      plan.skipped.push({ name, reason: `${what || 'ce produit'} est épuisé` });
      continue;
    }
    const quantity = Math.min(item.quantity, stock ?? MAX_PER_LINE, MAX_PER_LINE);
    if (quantity < item.quantity) plan.reduced.push(name);
    plan.toAdd.push({ product, quantity, selection });
  }
  return plan;
}
