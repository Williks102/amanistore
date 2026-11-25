import type { Attribute, Shoe, StockScope } from './types';
import { MAX_ATTRIBUTE_VALUES, MAX_QTY, valueKey, variantKey } from './attributes';
import { canonicalColor, PALETTE } from './colors';
import { isSizeValid, MAX_SIZE, MIN_SIZE } from './product-validation';

/**
 * Conversion des produits anciens (availableSizes / availableColors / stock) vers les attributs
 * « Pointure » et « Couleur ». Fonctions pures: l'aperçu et l'application utilisent le même calcul.
 * Les anciens champs ne sont jamais supprimés (retour arrière possible, nettoyage plus tard).
 */
export const POINTURE = 'Pointure';
export const COULEUR = 'Couleur';

export type MigrationOption = { attribute: typeof POINTURE | typeof COULEUR; values: string[] };
export type MigrationItem = {
  id: string;
  name: string;
  status: 'convert' | 'skip';
  /** Raison, quand le produit est ignoré (à corriger dans l'admin avant de relancer). */
  reason?: string;
  options: MigrationOption[];
  stockScope?: StockScope;
  variantStock?: Record<string, number>;
  /** Remarques sans gravité (stock ignoré pour une pointure absente de la liste…). */
  notes: string[];
};
export type AttributeChange = {
  name: string;
  kind: 'text' | 'color';
  action: 'create' | 'extend' | 'none' | 'conflict';
  addValues: Array<{ label: string; hex?: string }>;
  reason?: string;
};
export type MigrationPlan = {
  items: MigrationItem[];
  attributeChanges: AttributeChange[];
  /** Problèmes qui empêchent toute conversion (ex.: un attribut « Couleur » de type texte existe déjà). */
  blockers: string[];
  convertible: number;
  skipped: number;
  alreadyDone: number;
};

type LegacyShoe = Pick<Shoe, 'id' | 'name' | 'options' | 'availableSizes' | 'availableColors' | 'stock'>;

const numeric = (a: string, b: string) => Number(a) - Number(b);

/** Plan pour un seul produit ancien (utilisé aussi par l'application, dans la transaction du produit). */
export function planShoe(shoe: LegacyShoe): MigrationItem {
  const base: MigrationItem = { id: shoe.id, name: shoe.name, status: 'convert', options: [], notes: [] };
  const skip = (reason: string): MigrationItem => ({ ...base, status: 'skip', reason, options: [], notes: [] });

  const rawSizes = shoe.availableSizes ?? [];
  const badSizes = rawSizes.filter((s) => !isSizeValid(s));
  if (badSizes.length > 0) return skip(`Pointure invalide: ${badSizes.join(', ')} (entre ${MIN_SIZE} et ${MAX_SIZE}). Corrigez le produit puis relancez.`);
  const sizes = [...new Set(rawSizes.map(String))].sort(numeric);

  const colors: string[] = [];
  const unknown: string[] = [];
  for (const c of shoe.availableColors ?? []) {
    const canonical = canonicalColor(c.name);
    if (!canonical) unknown.push(c.name);
    else if (!colors.includes(canonical.name)) colors.push(canonical.name);
  }
  if (unknown.length > 0) return skip(`Couleur hors palette: ${unknown.join(', ')}. Lancez « Normaliser les couleurs » ou corrigez le produit.`);

  if (sizes.length === 0 && colors.length === 0) return skip('Ni pointure ni couleur: rien à convertir.');
  if (sizes.length === 0 && shoe.stock) return skip('Stock suivi sans pointure: ajoutez les pointures du produit avant de le convertir.');

  if (sizes.length > 0) base.options.push({ attribute: POINTURE, values: sizes });
  if (colors.length > 0) base.options.push({ attribute: COULEUR, values: colors });

  if (shoe.stock) {
    // Même règle qu'avant: une quantité par pointure, partagée entre les couleurs; pointure absente de la table = 0.
    const variantStock: Record<string, number> = {};
    for (const size of sizes) {
      const n = Number(shoe.stock[size]);
      variantStock[variantKey([size])] = Number.isFinite(n) ? Math.min(Math.max(Math.floor(n), 0), MAX_QTY) : 0;
    }
    const ignored = Object.keys(shoe.stock).filter((k) => !sizes.includes(String(Number(k))));
    if (ignored.length > 0) base.notes.push(`Stock ignoré pour les pointures absentes de la liste: ${ignored.join(', ')}.`);
    base.stockScope = 'attribute1';
    base.variantStock = variantStock;
  }
  return base;
}

/** Plan complet: produits, attributs à créer ou compléter, blocages. */
export function planMigration(shoes: LegacyShoe[], attributes: Pick<Attribute, 'id' | 'name' | 'kind' | 'values'>[]): MigrationPlan {
  const items: MigrationItem[] = [];
  let alreadyDone = 0;
  for (const shoe of shoes) {
    if (shoe.options) { alreadyDone += 1; continue; }
    items.push(planShoe(shoe));
  }
  const convertible = items.filter((i) => i.status === 'convert');

  const needed = (attribute: typeof POINTURE | typeof COULEUR): string[] => {
    const set = new Set<string>();
    for (const item of convertible) for (const o of item.options) if (o.attribute === attribute) o.values.forEach((v) => set.add(v));
    return [...set];
  };

  const blockers: string[] = [];
  const attributeChanges: AttributeChange[] = [];
  for (const [name, kind] of [[POINTURE, 'text'], [COULEUR, 'color']] as const) {
    const values = needed(name);
    if (values.length === 0) continue;
    const existing = attributes.find((a) => valueKey(a.name) === valueKey(name));
    const label = (v: string) => (kind === 'color' ? { label: v, hex: PALETTE.find((p) => p.name === v)?.hex } : { label: v });
    if (existing && existing.kind !== kind) {
      const reason = `Un attribut « ${existing.name} » existe déjà avec le type ${existing.kind === 'color' ? 'Couleur' : 'Texte'}. Renommez-le ou supprimez-le avant de convertir.`;
      attributeChanges.push({ name, kind, action: 'conflict', addValues: [], reason });
      blockers.push(reason);
      continue;
    }
    const have = new Set((existing?.values ?? []).map((v) => valueKey(v.label)));
    const missing = values.filter((v) => !have.has(valueKey(v))).map(label);
    if (have.size + missing.length > MAX_ATTRIBUTE_VALUES) {
      const reason = `L'attribut « ${name} » dépasserait ${MAX_ATTRIBUTE_VALUES} valeurs.`;
      attributeChanges.push({ name, kind, action: 'conflict', addValues: [], reason });
      blockers.push(reason);
      continue;
    }
    attributeChanges.push({ name, kind, action: !existing ? 'create' : missing.length > 0 ? 'extend' : 'none', addValues: missing });
  }

  return { items, attributeChanges, blockers, convertible: convertible.length, skipped: items.length - convertible.length, alreadyDone };
}

/** Valeurs d'un attribut après ajout; Pointure rangée dans l'ordre numérique, le reste garde l'ordre existant puis les ajouts. */
export function mergedValues(existing: Array<{ label: string; hex?: string }>, add: Array<{ label: string; hex?: string }>, numericOrder: boolean) {
  const merged = [...existing, ...add];
  return numericOrder ? merged.sort((a, b) => Number(a.label) - Number(b.label)) : merged;
}
