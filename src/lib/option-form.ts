import type { Attribute, ProductOption, Shoe, StockScope } from './types';
import { combinations, MAX_COMBINATIONS, MAX_OPTIONS, MAX_QTY, stockEntries, variantKey } from './attributes';
import { PALETTE } from './colors';

/** État du formulaire « attributs et stock » d'un produit (saisies gardées en texte). */
export type OptionsFormState = {
  selected: Array<{ attributeId: string; values: string[] }>;
  tracked: boolean;
  scope: StockScope;
  /** Quantité saisie par clé de stock. */
  qty: Record<string, string>;
};

export const emptyOptionsForm = (): OptionsFormState => ({ selected: [], tracked: true, scope: 'combination', qty: {} });

/** Attributs choisis, dans l'ordre du formulaire, avec nom, type et codes couleur lus dans l'attribut. */
export function optionsFromState(state: OptionsFormState, attributes: Attribute[]): ProductOption[] {
  const out: ProductOption[] = [];
  for (const sel of state.selected) {
    const attribute = attributes.find((a) => a.id === sel.attributeId);
    if (!attribute) continue;
    const values = attribute.values.map((v) => v.label).filter((label) => sel.values.includes(label));
    const hexes: Record<string, string> = {};
    if (attribute.kind === 'color') for (const v of attribute.values) if (values.includes(v.label) && v.hex) hexes[v.label] = v.hex;
    out.push({ attributeId: attribute.id, name: attribute.name, kind: attribute.kind, values, ...(Object.keys(hexes).length ? { hexes } : {}) });
  }
  return out;
}

/** Une ligne de stock par pointure, combinaison ou « quantité unique » selon le mode. */
export function stockRowsFor(options: ProductOption[], scope: StockScope): Array<{ key: string; label: string }> {
  const effective: StockScope = options.length < 2 ? 'combination' : scope;
  return stockEntries({ options, stockScope: effective, variantStock: {}, availableSizes: [], availableColors: [] })
    .map((e) => ({ key: e.key, label: e.label || 'Quantité en stock' }));
}

export type ParsedOptionsForm =
  | { ok: true; options: ProductOption[]; stockScope?: StockScope; variantStock?: Record<string, number> }
  | { ok: false; error: string };

/** Valide le formulaire et produit `options`, `stockScope` et `variantStock` (absents si le stock n'est pas suivi). */
export function parseOptionsForm(state: OptionsFormState, attributes: Attribute[]): ParsedOptionsForm {
  if (state.selected.length > MAX_OPTIONS) return { ok: false, error: `Un produit a au plus ${MAX_OPTIONS} attributs.` };
  const options = optionsFromState(state, attributes);
  if (options.length !== state.selected.length) return { ok: false, error: 'Un attribut choisi n’existe plus. Rechargez la page.' };
  for (const o of options) {
    if (o.values.length === 0) return { ok: false, error: `Cochez au moins une valeur pour « ${o.name} ».` };
  }
  if (!state.tracked) return { ok: true, options };
  const scope: StockScope = options.length < 2 ? 'combination' : state.scope;
  if (scope === 'combination' && combinations(options).length > MAX_COMBINATIONS) {
    return { ok: false, error: `Trop de combinaisons (${combinations(options).length}): au plus ${MAX_COMBINATIONS}. Décochez des valeurs ou partagez le stock par ${options[0].name}.` };
  }
  const variantStock: Record<string, number> = {};
  for (const row of stockRowsFor(options, scope)) {
    const raw = (state.qty[row.key] ?? '').trim();
    const n = Number(raw);
    if (raw === '' || !Number.isInteger(n) || n < 0 || n > MAX_QTY) {
      return { ok: false, error: `Stock invalide pour « ${row.label} »: entrez un nombre entier (0 si épuisé).` };
    }
    variantStock[row.key] = n;
  }
  return { ok: true, options, stockScope: scope, variantStock };
}

/** Formulaire d'un produit qui a déjà des attributs (`options` présent). */
export function stateFromShoe(shoe: Pick<Shoe, 'options' | 'stockScope' | 'variantStock'>): OptionsFormState {
  const options = shoe.options ?? [];
  const tracked = shoe.variantStock !== undefined;
  const scope: StockScope = shoe.stockScope ?? 'combination';
  const qty: Record<string, string> = {};
  if (tracked) for (const row of stockRowsFor(options, scope)) qty[row.key] = String(shoe.variantStock?.[row.key] ?? 0);
  return { selected: options.map((o) => ({ attributeId: o.attributeId, values: [...o.values] })), tracked, scope, qty };
}

/** Attributs de base proposés à la première utilisation (les chaussures du catalogue actuel). */
export const STARTER_ATTRIBUTES: Array<{ name: string; kind: 'text' | 'color'; values: Array<{ label: string; hex?: string }> }> = [
  { name: 'Pointure', kind: 'text', values: Array.from({ length: 11 }, (_, i) => ({ label: String(36 + i) })) },
  { name: 'Couleur', kind: 'color', values: PALETTE.map((c) => ({ label: c.name, hex: c.hex })) },
];

/** Découpe une saisie « S, M ; L » en valeurs propres, sans doublon (comparaison sans casse). */
export function splitValues(input: string, existing: string[] = []): string[] {
  const seen = new Set(existing.map((v) => v.trim().toLowerCase()));
  const out: string[] = [];
  for (const part of input.split(/[,;\n]/)) {
    const label = part.trim().replace(/\s+/g, ' ');
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push(label);
  }
  return out;
}

export { variantKey };
