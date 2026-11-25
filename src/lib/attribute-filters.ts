import type { AttributeKind, Shoe } from './types';
import { productOptions, shoeColors, valueKey } from './attributes';
import { PALETTE, canonicalColor, canonicalColorName } from './colors';

/** Un groupe de filtres par attribut (Pointure, Couleur, Matière…), construit à partir du catalogue affiché. */
export type FilterGroup = { key: string; name: string; kind: AttributeKind; values: Array<{ value: string; hex?: string }> };
/** Valeurs cochées, par clé de groupe. */
export type SelectedOptions = Record<string, string[]>;

/** Clé de groupe: le nom de l'attribut, sans accents ni casse (« Matière » = « matiere »). */
export const filterKey = (name: string): string => valueKey(name);

const isNumeric = (v: string) => v.trim() !== '' && Number.isFinite(Number(v.replace(',', '.')));
const paletteOrder = (name: string) => { const i = PALETTE.findIndex((p) => p.name === name); return i === -1 ? 999 : i; };

/**
 * Groupes de filtres du catalogue. Pointure d'abord, puis Couleur, puis les autres par nom.
 * Valeurs: nombres croissants, couleurs dans l'ordre de la palette (écritures regroupées: « noire » = « Noir »), sinon alphabétique.
 */
export function catalogFilterGroups(shoes: Shoe[]): FilterGroup[] {
  const groups = new Map<string, FilterGroup>();
  for (const shoe of shoes) {
    const colors = new Map(shoeColors(shoe).map((c) => [valueKey(c.name), c.hex]));
    for (const option of productOptions(shoe)) {
      const key = filterKey(option.name);
      const group = groups.get(key) ?? { key, name: option.name.trim(), kind: option.kind, values: [] };
      for (const raw of option.values) {
        const value = option.kind === 'color' ? canonicalColorName(raw) : raw.trim();
        if (group.values.some((v) => valueKey(v.value) === valueKey(value))) continue;
        group.values.push({ value, ...(option.kind === 'color' ? { hex: canonicalColor(raw)?.hex ?? colors.get(valueKey(raw)) ?? '#C5C7CB' } : {}) });
      }
      groups.set(key, group);
    }
  }
  const order = (g: FilterGroup) => (g.key === 'pointure' ? 0 : g.kind === 'color' ? 1 : 2);
  for (const g of groups.values()) {
    if (g.kind === 'color') g.values.sort((a, b) => paletteOrder(a.value) - paletteOrder(b.value) || a.value.localeCompare(b.value, 'fr'));
    else if (g.values.every((v) => isNumeric(v.value))) g.values.sort((a, b) => Number(a.value.replace(',', '.')) - Number(b.value.replace(',', '.')));
    else g.values.sort((a, b) => a.value.localeCompare(b.value, 'fr', { numeric: true }));
  }
  return [...groups.values()].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name, 'fr'));
}

/** Un produit correspond si, pour chaque groupe filtré, il propose au moins une des valeurs cochées (ET entre groupes, OU dans un groupe). */
export function matchesOptionFilters(shoe: Shoe, selected: SelectedOptions): boolean {
  const active = Object.entries(selected).filter(([, values]) => values.length > 0);
  if (active.length === 0) return true;
  const options = productOptions(shoe);
  return active.every(([key, values]) => {
    const option = options.find((o) => filterKey(o.name) === key);
    if (!option) return false;
    const have = new Set(option.values.map((v) => valueKey(option.kind === 'color' ? canonicalColorName(v) : v)));
    return values.some((v) => have.has(valueKey(option.kind === 'color' ? canonicalColorName(v) : v)));
  });
}

/** Nombre total de valeurs cochées. */
export const selectedCount = (selected: SelectedOptions): number => Object.values(selected).reduce((n, v) => n + v.length, 0);
