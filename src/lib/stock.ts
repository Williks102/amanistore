import type { Shoe } from './types';

/** Stock disponible pour une pointure; null = stock non suivi (illimité). */
export function availableStock(shoe: Pick<Shoe, 'stock'>, size: number): number | null {
  if (!shoe.stock) return null;
  const n = shoe.stock[String(size)];
  return typeof n === 'number' && n > 0 ? Math.floor(n) : 0;
}

/**
 * Analyse une saisie « 38:5, 39:3 ». Vide => undefined (stock non suivi).
 * Retourne { error } si la saisie est invalide.
 */
export function parseStockInput(input: string): { stock?: Record<string, number>; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { stock: undefined };
  const stock: Record<string, number> = {};
  for (const part of trimmed.split(',')) {
    const [rawSize, rawQty, ...rest] = part.split(':').map((x) => x.trim());
    const size = Number(rawSize);
    const qty = Number(rawQty);
    if (rest.length > 0 || !rawSize || rawQty === undefined || rawQty === '' ||
        !Number.isFinite(size) || size <= 0 || !Number.isInteger(qty) || qty < 0 || qty > 100000) {
      return { error: `Stock invalide: « ${part.trim()} ». Format attendu: 38:5, 39:3` };
    }
    stock[String(size)] = qty;
  }
  return { stock };
}

export function formatStockInput(stock?: Record<string, number>): string {
  if (!stock) return '';
  return Object.entries(stock)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([size, qty]) => `${size}:${qty}`)
    .join(', ');
}

/** Résumé pour les cartes produit. `tracked` = false: stock non suivi (jamais de badge). */
export function stockSummary(shoe: Pick<Shoe, 'stock' | 'availableSizes'>): { tracked: boolean; total: number; soldOut: boolean } {
  if (!shoe.stock) return { tracked: false, total: 0, soldOut: false };
  const total = shoe.availableSizes.reduce((sum, size) => sum + (availableStock(shoe, size) ?? 0), 0);
  return { tracked: true, total, soldOut: total === 0 };
}

/** Première pointure disponible (en stock ou non suivie), ou null si tout est épuisé. */
export function firstAvailableSize(shoe: Pick<Shoe, 'stock' | 'availableSizes'>): number | null {
  return shoe.availableSizes.find((size) => availableStock(shoe, size) !== 0) ?? null;
}
