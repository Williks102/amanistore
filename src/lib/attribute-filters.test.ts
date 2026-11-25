import { describe, expect, it } from 'vitest';
import type { Shoe } from './types';
import { catalogFilterGroups, matchesOptionFilters, selectedCount } from './attribute-filters';

const base = { id: 'x', name: 'X', description: '', price: 10000, categoryId: 'c', collectionIds: [], gridImage: { id: 'i', url: 'u', hint: '' }, detailImages: [] };
const old = (over: Partial<Shoe> = {}) => ({ ...base, availableSizes: [40, 38, 39.5], availableColors: [{ name: 'noire', hex: '#000' }, { name: 'Beige', hex: '#D9C4A3' }], ...over }) as Shoe;
const ring = { ...base, id: 'r', availableSizes: [], availableColors: [], options: [
  { attributeId: 'a', name: 'Taille de doigt', kind: 'text', values: ['54', '52'] },
  { attributeId: 'b', name: 'Matière', kind: 'text', values: ['Doré', 'Argenté'] },
] } as Shoe;
const bag = { ...base, id: 'b', availableSizes: [], availableColors: [], options: [
  { attributeId: 'c', name: 'Couleur', kind: 'color', values: ['Noir', 'Turquoise'], hexes: { Turquoise: '#40E0D0' } },
  { attributeId: 'm', name: 'matiere', kind: 'text', values: ['Cuir'] },
] } as Shoe;

describe('catalogFilterGroups', () => {
  const groups = catalogFilterGroups([ring, old(), bag]);
  it('Pointure, Couleur puis les autres par nom; groupes fusionnés sans accents ni casse', () => {
    expect(groups.map((g) => g.name)).toEqual(['Pointure', 'Couleur', 'Matière', 'Taille de doigt']);
    expect(groups.find((g) => g.key === 'matiere')!.values.map((v) => v.value)).toEqual(['Argenté', 'Cuir', 'Doré']);
  });
  it('pointures en ordre numérique, demi-pointures comprises', () => {
    expect(groups[0].values.map((v) => v.value)).toEqual(['38', '39.5', '40']);
    expect(groups.find((g) => g.key === 'taille de doigt')!.values.map((v) => v.value)).toEqual(['52', '54']);
  });
  it('couleurs regroupées par nom officiel, dans l’ordre de la palette, avec leur code', () => {
    const colors = groups.find((g) => g.key === 'couleur')!.values;
    expect(colors.map((c) => c.value)).toEqual(['Noir', 'Beige', 'Turquoise']);
    expect(colors[0].hex).toBe('#1C1B1A');
    expect(colors[2].hex).toBe('#40E0D0');
  });
  it('catalogue vide ou produits sans attribut: aucun groupe', () => {
    expect(catalogFilterGroups([])).toEqual([]);
    expect(catalogFilterGroups([{ ...base, availableSizes: [], availableColors: [], options: [] } as unknown as Shoe])).toEqual([]);
  });
});

describe('matchesOptionFilters', () => {
  it('aucun filtre: tout passe', () => {
    expect(matchesOptionFilters(ring, {})).toBe(true);
    expect(matchesOptionFilters(ring, { couleur: [] })).toBe(true);
  });
  it('OU dans un groupe, ET entre groupes', () => {
    expect(matchesOptionFilters(old(), { pointure: ['40', '44'] })).toBe(true);
    expect(matchesOptionFilters(old(), { pointure: ['44'] })).toBe(false);
    expect(matchesOptionFilters(old(), { pointure: ['40'], couleur: ['Noir'] })).toBe(true);
    expect(matchesOptionFilters(old(), { pointure: ['40'], couleur: ['Rouge'] })).toBe(false);
  });
  it('couleur: écriture historique reconnue des deux côtés', () => {
    expect(matchesOptionFilters(old(), { couleur: ['Noir'] })).toBe(true);
    expect(matchesOptionFilters(bag, { couleur: ['noire'] })).toBe(true);
  });
  it('un produit sans l’attribut filtré est écarté', () => {
    expect(matchesOptionFilters(ring, { pointure: ['40'] })).toBe(false);
    expect(matchesOptionFilters(bag, { 'taille de doigt': ['52'] })).toBe(false);
  });
  it('attribut libre: insensible aux accents et à la casse', () => {
    expect(matchesOptionFilters(ring, { matiere: ['dore'] })).toBe(true);
    expect(matchesOptionFilters(bag, { matiere: ['cuir'] })).toBe(true);
    expect(matchesOptionFilters(bag, { matiere: ['Toile'] })).toBe(false);
  });
});

describe('selectedCount', () => {
  it('somme des valeurs cochées', () => expect(selectedCount({ a: ['1', '2'], b: [], c: ['x'] })).toBe(3));
});
