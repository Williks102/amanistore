import type { Shoe } from './types';
import { isSizeValid, MAX_SIZE, MIN_SIZE } from './product-validation';

/** Une ligne du formulaire: une pointure et, si le stock est suivi, sa quantité. Saisies gardées en texte. */
export type SizeRow = { id: string; size: string; qty: string };

const MAX_QTY = 100000;
let counter = 0;
export const newSizeRow = (size = '', qty = ''): SizeRow => ({ id: `size-row-${++counter}`, size, qty });

/** Lignes de départ d'un produit existant; `tracked` = false quand le stock n'est pas suivi (illimité). */
export function rowsFromShoe(shoe: Pick<Shoe, 'availableSizes' | 'stock'>): { rows: SizeRow[]; tracked: boolean } {
  const tracked = !!shoe.stock;
  const sizes = [...shoe.availableSizes].sort((a, b) => a - b);
  const rows = sizes.map((s) => newSizeRow(String(s), tracked ? String(shoe.stock?.[String(s)] ?? 0) : ''));
  return { rows: rows.length > 0 ? rows : [newSizeRow()], tracked };
}

/** Valide les lignes et produit `availableSizes` (triées) et `stock` (absent si non suivi). Les lignes vides sont ignorées. */
export function parseSizeRows(
  rows: SizeRow[],
  tracked: boolean,
): { sizes: number[]; stock?: Record<string, number>; error?: string } {
  const filled = rows.filter((r) => r.size.trim() !== '' || (tracked && r.qty.trim() !== ''));
  if (filled.length === 0) return { sizes: [], error: 'Ajoutez au moins une pointure.' };

  const sizes: number[] = [];
  const stock: Record<string, number> = {};
  for (const row of filled) {
    const label = row.size.trim() || '(vide)';
    const size = Number(row.size.trim().replace(',', '.'));
    if (row.size.trim() === '' || !isSizeValid(size)) {
      return { sizes: [], error: `Pointure invalide: ${label} (entre ${MIN_SIZE} et ${MAX_SIZE}, par pas de 0,5).` };
    }
    if (sizes.includes(size)) return { sizes: [], error: `La pointure ${size} est saisie deux fois.` };
    sizes.push(size);
    if (tracked) {
      const raw = row.qty.trim();
      const qty = Number(raw);
      if (raw === '' || !Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) {
        return { sizes: [], error: `Stock invalide pour la pointure ${size}: entrez un nombre entier (0 si épuisée).` };
      }
      stock[String(size)] = qty;
    }
  }
  sizes.sort((a, b) => a - b);
  return tracked ? { sizes, stock } : { sizes };
}
