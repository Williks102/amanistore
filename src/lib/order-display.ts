import type { Order, OrderStatus } from './types';
import { lineLabel } from './cart-line';

/** Numéro de commande lisible: les 6 premiers caractères de l'identifiant, en majuscules (sans points de suspension). */
export const shortOrderNumber = (id: string): string => id.slice(0, 6).toUpperCase();

export const STATUS_STEPS: OrderStatus[] = ['En attente', 'Prêt', 'Livré'];

/** Ce que chaque état signifie, au sens littéral du mot (aucune promesse de délai ou de procédure). */
export const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  'En attente': 'Votre commande est enregistrée.',
  'Prêt': 'Votre commande est préparée.',
  'Livré': 'La livraison est confirmée.',
  'Annulé': 'Cette commande a été annulée.',
};

/** Étape (1 à 3) pour la barre de suivi, ou null si la commande est annulée. */
export function statusStep(status: OrderStatus): number | null {
  const index = STATUS_STEPS.indexOf(status);
  return index === -1 ? null : index + 1;
}

/** Largeur de la barre de suivi, en pourcentage. */
export function progressPercent(status: OrderStatus): number {
  const step = statusStep(status);
  if (step === null) return 0;
  return step === 1 ? 15 : step === 2 ? 50 : 100;
}

export type OrderLine = {
  id: string;
  productId: string;
  name: string;
  imageUrl: string;
  /** Choix de la ligne: « Pointure 40 · Noir » (vide pour un produit sans attribut). */
  options: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export function orderLines(order: Pick<Order, 'items'>): OrderLine[] {
  return (order.items ?? []).map((item) => ({
    id: item.id,
    productId: item.product.id,
    name: item.product.name,
    imageUrl: item.product.gridImage?.url ?? '',
    options: lineLabel(item),
    quantity: item.quantity,
    unitPrice: item.product.price,
    total: item.product.price * item.quantity,
  }));
}

/** Sous-total, remise et total d'une commande (anciennes commandes sans sous-total: recalculé depuis les lignes). */
export function orderTotals(order: Pick<Order, 'items' | 'subtotal' | 'discount' | 'total'>): { subtotal: number; discount: number; total: number } {
  const subtotal = order.subtotal ?? orderLines(order).reduce((sum, line) => sum + line.total, 0);
  const discount = order.discount ?? Math.max(subtotal - order.total, 0);
  return { subtotal, discount, total: order.total };
}

export const itemCount = (order: Pick<Order, 'items'>): number => (order.items ?? []).reduce((n, i) => n + i.quantity, 0);
