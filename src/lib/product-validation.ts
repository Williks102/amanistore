import type { Category, Shoe } from './types';
import { canonicalColor } from './colors';

export const MIN_PRICE = 1000;
export const MAX_PRICE = 1_000_000;
export const MIN_SIZE = 16;
export const MAX_SIZE = 50;

export const isPriceValid = (price: unknown): price is number =>
  typeof price === 'number' && Number.isFinite(price) && price >= MIN_PRICE && price <= MAX_PRICE;

export const isSizeValid = (size: unknown): size is number =>
  typeof size === 'number' && Number.isFinite(size) && size >= MIN_SIZE && size <= MAX_SIZE && Number.isInteger(size * 2);

/** Un produit au prix absurde n'est ni affiché ni commandable (il reste visible dans l'admin pour être corrigé). */
export const isListable = (shoe: Pick<Shoe, 'price'>): boolean => isPriceValid(shoe.price);

/** Message d'erreur (en français) si les champs fournis sont invalides, sinon null. Ne vérifie que les champs présents. */
export function validateProductFields(data: Partial<Pick<Shoe, 'name' | 'price' | 'availableSizes' | 'availableColors'>>): string | null {
  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.length > 120)) {
    return 'Le nom doit faire entre 2 et 120 caractères.';
  }
  if (data.price !== undefined && !isPriceValid(data.price)) {
    return `Le prix doit être compris entre ${MIN_PRICE.toLocaleString('fr-FR')} et ${MAX_PRICE.toLocaleString('fr-FR')} XOF.`;
  }
  if (data.availableSizes !== undefined) {
    if (!Array.isArray(data.availableSizes) || data.availableSizes.length === 0) return 'Indiquez au moins une pointure.';
    const bad = data.availableSizes.find((s) => !isSizeValid(s));
    if (bad !== undefined) return `Pointure invalide: ${String(bad)} (entre ${MIN_SIZE} et ${MAX_SIZE}).`;
  }
  if (data.availableColors !== undefined) {
    if (!Array.isArray(data.availableColors) || data.availableColors.length === 0) return 'Choisissez au moins une couleur.';
    const unknown = data.availableColors.find((c) => !c || typeof c.name !== 'string' || !canonicalColor(c.name));
    if (unknown) return `Couleur inconnue: « ${unknown?.name ?? '?'} ». Choisissez une couleur de la palette.`;
  }
  return null;
}

export type CatalogIssue = { code: 'price' | 'size' | 'color' | 'images' | 'description' | 'category'; label: string };

/** Anomalies d'un produit, pour la page « Qualité du catalogue ». */
export function productIssues(shoe: Shoe, categories: Pick<Category, 'id'>[]): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  if (!isPriceValid(shoe.price)) issues.push({ code: 'price', label: `Prix invalide (${Number(shoe.price).toLocaleString('fr-FR')} XOF): produit masqué de la boutique` });
  const badSizes = (shoe.availableSizes ?? []).filter((s) => !isSizeValid(s));
  if (badSizes.length > 0) issues.push({ code: 'size', label: `Pointure(s) invalide(s): ${badSizes.join(', ')}` });
  const badColors = (shoe.availableColors ?? []).filter((c) => !canonicalColor(c.name));
  if (badColors.length > 0) issues.push({ code: 'color', label: `Couleur(s) hors palette: ${badColors.map((c) => c.name).join(', ')}` });
  if (!(shoe.detailImages ?? []).length) issues.push({ code: 'images', label: 'Une seule photo' });
  if (!shoe.description || shoe.description.trim().length < 5) issues.push({ code: 'description', label: 'Sans description' });
  if (!categories.some((c) => c.id === shoe.categoryId)) issues.push({ code: 'category', label: 'Catégorie introuvable' });
  return issues;
}

/** Noms portés par plusieurs produits (cartes indiscernables dans la boutique). */
export function duplicateNames(shoes: Pick<Shoe, 'name'>[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const s of shoes) {
    const k = s.name.trim().toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}
