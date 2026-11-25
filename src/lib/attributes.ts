import type { Attribute, ProductOption, Selection, Shoe, StockScope } from './types';
import { canonicalColor, canonicalColorName } from './colors';

export const MAX_OPTIONS = 2;
export const MAX_COMBINATIONS = 100;
export const MAX_ATTRIBUTE_VALUES = 60;
export const MAX_QTY = 100000;
const NAME_MAX = 40;
const LABEL_MAX = 30;

/** Identifiants des attributs reconstruits à partir des anciens champs (pointure, couleur). */
export const LEGACY_SIZE_ID = 'legacy-size';
export const LEGACY_COLOR_ID = 'legacy-color';

type OptionShoe = Pick<Shoe, 'options' | 'availableSizes' | 'availableColors'>;
type StockShoe = OptionShoe & Pick<Shoe, 'stock' | 'stockScope' | 'variantStock'>;

/** Écriture comparable: sans accents ni casse, espaces réduits. « Bleu  nuit » = « bleu nuit ». */
export const valueKey = (raw: string): string =>
  String(raw).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Produit ancien: pas d'`options`, tout vient de availableSizes / availableColors / stock. */
export const isLegacy = (shoe: Pick<Shoe, 'options'>): boolean => !shoe.options;

/**
 * Attributs d'un produit. Point d'entrée unique: un produit ancien est converti à la volée
 * (Pointure puis Couleur), ce qui permet de migrer produit par produit sans rien casser.
 */
export function productOptions(shoe: OptionShoe): ProductOption[] {
  if (shoe.options) return shoe.options;
  const out: ProductOption[] = [];
  if (shoe.availableSizes?.length) {
    out.push({ attributeId: LEGACY_SIZE_ID, name: 'Pointure', kind: 'text', values: shoe.availableSizes.map(String) });
  }
  if (shoe.availableColors?.length) {
    out.push({ attributeId: LEGACY_COLOR_ID, name: 'Couleur', kind: 'color', values: shoe.availableColors.map((c) => c.name) });
  }
  return out;
}

/** Clé de stock d'une combinaison (sans `.` ni `/`, interdits ou risqués dans les clés Firestore). Sans attribut: « _ ». */
export function variantKey(values: string[]): string {
  if (values.length === 0) return '_';
  return values.map((v) => encodeURIComponent(valueKey(v)).replace(/\./g, '%2E')).join('|');
}

/** Toutes les combinaisons possibles (produit sans attribut: une combinaison vide). */
export function combinations(options: ProductOption[]): string[][] {
  return options.reduce<string[][]>((acc, o) => acc.flatMap((prefix) => o.values.map((v) => [...prefix, v])), [[]]);
}

export type ResolvedSelection = { ok: true; values: string[] } | { ok: false; reason: string; option?: string; value?: string };

/**
 * Vérifie un choix contre les attributs du produit (lus en base, jamais ce que le navigateur prétend).
 * Retourne les valeurs dans l'ordre des attributs, écrites comme le produit les propose.
 */
export function resolveSelection(shoe: OptionShoe, selection: Selection): ResolvedSelection {
  const options = productOptions(shoe);
  if (!Array.isArray(selection)) return { ok: false, reason: 'choix invalide' };
  const used = new Set<number>();
  const values: string[] = [];
  for (const option of options) {
    const idx = selection.findIndex((s, i) => !used.has(i) && valueKey(s?.name ?? '') === valueKey(option.name));
    if (idx === -1) return { ok: false, reason: `« ${option.name} » est à choisir` };
    used.add(idx);
    const wanted = String(selection[idx].value ?? '');
    const match = option.values.find((v) =>
      option.kind === 'color' ? canonicalColorName(v) === canonicalColorName(wanted) : valueKey(v) === valueKey(wanted));
    if (match === undefined) return { ok: false, reason: `${option.name} « ${wanted} » n’est pas proposé`, option: option.name, value: wanted };
    values.push(match);
  }
  if (selection.length !== used.size) return { ok: false, reason: 'choix en trop pour ce produit' };
  return { ok: true, values };
}

/** Ancien format d'une ligne (pointure + couleur) converti en choix. */
export const legacySelection = (size: number, color: string): Selection => [
  { name: 'Pointure', value: String(size) },
  { name: 'Couleur', value: color },
];

/**
 * Choix d'une ligne de panier: le nouveau format (`selection`), ou l'ancien (size + color) converti.
 * Pour l'ancien format, seuls les attributs que le produit possède sont gardés (produit sans couleur, etc.).
 */
export function selectionForLine(shoe: OptionShoe, line: { selection?: Selection; size?: number; color?: string }): Selection {
  if (line.selection) return line.selection;
  const names = new Set(productOptions(shoe).map((o) => valueKey(o.name)));
  return legacySelection(line.size ?? NaN, line.color ?? '').filter((s) => names.has(valueKey(s.name)));
}

/** size et color conservés sur les lignes (anciens écrans, tableau de bord): Pointure et Couleur si le produit les a, sinon 0 et ''. */
export function legacyFields(options: ProductOption[], values: string[]): { size: number; color: string } {
  let size = 0;
  let color = '';
  options.forEach((o, i) => {
    if (valueKey(o.name) === 'pointure') size = Number(values[i]) || 0;
    else if (valueKey(o.name) === 'couleur' || o.kind === 'color') color = values[i] ?? '';
  });
  return { size, color };
}

/** Texte affiché: « Pointure: 40 · Couleur: Noir ». */
export const describeSelection = (selection: Selection): string => selection.map((s) => `${s.name}: ${s.value}`).join(' · ');

// ───────────────────────────── Stock ─────────────────────────────

/** Mode et table de stock d'un produit; `tracked` = false: stock non suivi (illimité). */
function stockTable(shoe: StockShoe): { tracked: boolean; scope: StockScope; table: Record<string, number>; field: 'stock' | 'variantStock' } {
  if (isLegacy(shoe)) {
    // Ancien stock: par pointure, toutes couleurs confondues. Sans pointure, rien à suivre.
    return { tracked: !!shoe.stock && !!shoe.availableSizes?.length, scope: 'attribute1', table: shoe.stock ?? {}, field: 'stock' };
  }
  return { tracked: !!shoe.variantStock, scope: shoe.stockScope ?? 'combination', table: shoe.variantStock ?? {}, field: 'variantStock' };
}

/** Clé de stock concernée par une combinaison (valeurs déjà résolues). */
export function stockKeyFor(shoe: StockShoe, values: string[]): string {
  const { scope, field } = stockTable(shoe);
  if (field === 'stock') return values[0] ?? '_'; // clé historique: la pointure telle quelle ("40", "40.5")
  return scope === 'attribute1' ? variantKey(values.slice(0, 1)) : variantKey(values);
}

/** Quantité disponible pour une combinaison; null = stock non suivi (illimité). Clé absente d'un stock suivi = 0. */
export function availableStockFor(shoe: StockShoe, values: string[]): number | null {
  const { tracked, table } = stockTable(shoe);
  if (!tracked) return null;
  const n = table[stockKeyFor(shoe, values)];
  return typeof n === 'number' && n > 0 ? Math.floor(n) : 0;
}

/** Toutes les clés de stock attendues pour ce produit (dédoublonnées, dans l'ordre des combinaisons). */
export function expectedStockKeys(shoe: StockShoe): string[] {
  return [...new Set(combinations(productOptions(shoe)).map((c) => stockKeyFor(shoe, c)))];
}

export type StockLine = { values: string[]; quantity: number };
export type StockChange =
  | { ok: true; field: 'stock' | 'variantStock'; table: Record<string, number> | null }
  | { ok: false; reason: string; label: string; available: number };

/**
 * Contrôle puis décompte les quantités demandées (plusieurs lignes d'une même clé s'additionnent).
 * `table` = nouveau stock complet à écrire dans `field`, ou null si le stock n'est pas suivi.
 */
export function applyStockChange(shoe: StockShoe, lines: StockLine[]): StockChange {
  const { tracked, table, field, scope } = stockTable(shoe);
  if (!tracked) return { ok: true, field, table: null };
  const wanted = new Map<string, { qty: number; values: string[] }>();
  for (const l of lines) {
    const key = stockKeyFor(shoe, l.values);
    const prev = wanted.get(key);
    wanted.set(key, { qty: (prev?.qty ?? 0) + l.quantity, values: l.values });
  }
  const next = { ...table };
  for (const [key, { qty, values }] of wanted) {
    const available = availableStockFor(shoe, values) ?? 0;
    // Stock partagé par premier attribut: la couleur n'entre pas dans le message.
    const shown = scope === 'attribute1' ? values.slice(0, 1) : values;
    const label = shown.length > 0 ? shown.join(' / ') : 'ce produit';
    if (qty > available) {
      return { ok: false, label, available, reason: available === 0 ? `${label} est épuisé` : `stock insuffisant pour ${label}: ${available} restant(s)` };
    }
    next[key] = available - qty;
  }
  return { ok: true, field, table: next };
}

/** Résumé pour les cartes produit (même sens que stockSummary, pour tous les types de produit). */
export function stockSummaryFor(shoe: StockShoe): { tracked: boolean; total: number; soldOut: boolean } {
  const { tracked } = stockTable(shoe);
  if (!tracked) return { tracked: false, total: 0, soldOut: false };
  const total = expectedStockKeys(shoe).reduce((sum, key) => {
    const n = stockTable(shoe).table[key];
    return sum + (typeof n === 'number' && n > 0 ? Math.floor(n) : 0);
  }, 0);
  return { tracked: true, total, soldOut: total === 0 };
}

/** Première combinaison disponible (en stock ou non suivie), ou null si tout est épuisé. */
export function firstAvailableCombination(shoe: StockShoe): string[] | null {
  return combinations(productOptions(shoe)).find((c) => availableStockFor(shoe, c) !== 0) ?? null;
}

// ─────────────────────────── Validation ───────────────────────────

/** Valeurs d'un attribut à créer ou modifier. Message en français, ou null si valide. */
export function validateAttribute(a: Pick<Attribute, 'name' | 'kind' | 'values'>): string | null {
  if (typeof a.name !== 'string' || a.name.trim().length < 1 || a.name.trim().length > NAME_MAX) return `Le nom doit faire entre 1 et ${NAME_MAX} caractères.`;
  if (a.kind !== 'text' && a.kind !== 'color') return 'Type d’attribut inconnu.';
  if (!Array.isArray(a.values) || a.values.length === 0) return 'Ajoutez au moins une valeur.';
  if (a.values.length > MAX_ATTRIBUTE_VALUES) return `Au plus ${MAX_ATTRIBUTE_VALUES} valeurs par attribut.`;
  const seen = new Set<string>();
  for (const v of a.values) {
    const label = typeof v?.label === 'string' ? v.label.trim() : '';
    if (label.length < 1 || label.length > LABEL_MAX) return `Chaque valeur doit faire entre 1 et ${LABEL_MAX} caractères.`;
    const k = valueKey(label);
    if (seen.has(k)) return `La valeur « ${label} » est en double.`;
    seen.add(k);
    if (a.kind === 'color' && !canonicalColor(label) && !/^#[0-9a-f]{6}$/i.test(v.hex ?? '')) {
      return `La couleur « ${label} » a besoin d’un code couleur (ex: #D4A940).`;
    }
  }
  return null;
}

/** Attributs, stock et mode de stock d'un produit. Message en français, ou null si valide. */
export function validateProductAttributes(shoe: Pick<Shoe, 'options' | 'stockScope' | 'variantStock'>): string | null {
  const options = shoe.options;
  if (options === undefined) {
    return shoe.variantStock !== undefined || shoe.stockScope !== undefined ? 'Stock sans attributs: enregistrez aussi les attributs du produit.' : null;
  }
  if (!Array.isArray(options) || options.length > MAX_OPTIONS) return `Un produit a au plus ${MAX_OPTIONS} attributs.`;
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const o of options) {
    if (!o || typeof o.attributeId !== 'string' || !o.attributeId) return 'Attribut invalide.';
    if (ids.has(o.attributeId) || names.has(valueKey(o.name))) return `L’attribut « ${o.name} » est choisi deux fois.`;
    ids.add(o.attributeId);
    names.add(valueKey(o.name));
    const problem = validateAttribute({ name: o.name, kind: o.kind, values: (o.values ?? []).map((label) => ({ label, hex: o.hexes?.[label] })) });
    if (problem) return `${o.name}: ${problem}`;
  }
  if (shoe.variantStock === undefined) return shoe.stockScope !== undefined ? 'Mode de stock sans quantités.' : null;
  const scope = shoe.stockScope ?? 'combination';
  if (scope !== 'combination' && scope !== 'attribute1') return 'Mode de stock inconnu.';
  if (scope === 'attribute1' && options.length === 0) return 'Le stock par attribut demande au moins un attribut.';
  if (combinations(options).length > MAX_COMBINATIONS && scope === 'combination') {
    return `Trop de combinaisons (${combinations(options).length}): au plus ${MAX_COMBINATIONS}.`;
  }
  const expected = new Set(expectedStockKeys({ options, availableSizes: [], availableColors: [], stockScope: scope, variantStock: shoe.variantStock }));
  for (const [key, qty] of Object.entries(shoe.variantStock)) {
    if (!expected.has(key)) return `Stock pour une combinaison qui n’existe pas: ${key}.`;
    if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) return `Stock invalide (${key}): entier de 0 à ${MAX_QTY.toLocaleString('fr-FR')}.`;
  }
  return null;
}

// ─────────────── Aides d'affichage (boutique, panier, commandes) ───────────────

/** Une valeur est « épuisée » si toutes les combinaisons qui la contiennent (avec les autres choix déjà faits) n'ont plus de stock. */
export function valueSoldOut(shoe: StockShoe, optionIndex: number, value: string, chosen: Array<string | null>): boolean {
  const combos = combinations(productOptions(shoe)).filter(
    (c) => c[optionIndex] === value && c.every((v, j) => j === optionIndex || chosen[j] == null || chosen[j] === v)
  );
  return combos.length > 0 && combos.every((c) => availableStockFor(shoe, c) === 0);
}

/** Pointures numériques proposées (attribut nommé Pointure), pour le filtre de la boutique. */
export function shoeSizes(shoe: OptionShoe): number[] {
  const option = productOptions(shoe).find((o) => valueKey(o.name) === 'pointure');
  return (option?.values ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
}

/** Couleurs proposées (attribut de type couleur) avec leur code, pour les pastilles et le filtre. */
export function shoeColors(shoe: OptionShoe & Pick<Shoe, 'availableColors'>): Array<{ name: string; hex: string }> {
  const out: Array<{ name: string; hex: string }> = [];
  for (const o of productOptions(shoe)) {
    if (o.kind !== 'color') continue;
    for (const v of o.values) {
      const legacyHex = (shoe.availableColors ?? []).find((c) => canonicalColorName(c.name) === canonicalColorName(v))?.hex;
      out.push({ name: v, hex: canonicalColor(v)?.hex ?? o.hexes?.[v] ?? legacyHex ?? '#C5C7CB' });
    }
  }
  return out;
}

export type StockEntry = { key: string; values: string[]; label: string; quantity: number };

/**
 * Une entrée par clé de stock d'un produit à stock suivi (vide sinon), avec un libellé lisible
 * (« Pointure 40 », « Pointure 40 · Noir », « » pour un produit sans attribut).
 */
export function stockEntries(shoe: StockShoe): StockEntry[] {
  const { tracked, scope, field } = stockTable(shoe);
  if (!tracked) return [];
  const options = productOptions(shoe);
  const shared = scope === 'attribute1' || field === 'stock';
  const seen = new Map<string, StockEntry>();
  for (const values of combinations(options)) {
    const key = stockKeyFor(shoe, values);
    if (seen.has(key)) continue;
    const count = shared ? Math.min(1, values.length) : values.length;
    const label = options.slice(0, count).map((o, i) => `${o.name} ${values[i]}`).join(' · ');
    seen.set(key, { key, values: values.slice(0, count), label, quantity: availableStockFor(shoe, values) ?? 0 });
  }
  return [...seen.values()];
}
