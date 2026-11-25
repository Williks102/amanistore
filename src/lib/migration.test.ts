import { describe, expect, it } from 'vitest';
import type { Shoe } from './types';
import { mergedValues, planMigration, planShoe } from './migration';
import { availableStockFor, productOptions, validateProductAttributes } from './attributes';
import { availableStock } from './stock';

const shoe = (over: Partial<Shoe> = {}): Shoe => ({
  id: 's1', name: 'Escarpin', description: 'd', price: 20000, categoryId: 'c', collectionIds: [], gridImage: { id: 'i', url: 'u', hint: '' }, detailImages: [],
  availableSizes: [39, 38, 40.5], availableColors: [{ name: 'noire', hex: '#000' }, { name: 'Beige', hex: '#D9C4A3' }], ...over,
});
const noAttrs: never[] = [];

describe('planShoe', () => {
  it('pointures triées et couleurs de la palette, Pointure puis Couleur', () => {
    const item = planShoe(shoe());
    expect(item.status).toBe('convert');
    expect(item.options).toEqual([{ attribute: 'Pointure', values: ['38', '39', '40.5'] }, { attribute: 'Couleur', values: ['Noir', 'Beige'] }]);
    expect(item.variantStock).toBeUndefined();
  });
  it('stock par pointure conservé: partagé entre les couleurs, absent = 0, et identique à l’ancien calcul', () => {
    const s = shoe({ stock: { '38': 3, '39': 0, '41': 9 } });
    const item = planShoe(s);
    expect(item.stockScope).toBe('attribute1');
    expect(item.variantStock).toEqual({ '38': 3, '39': 0, '40%2E5': 0 });
    expect(item.notes[0]).toMatch(/41/);
    const migrated = { ...s, options: item.options.map((o) => ({ attributeId: o.attribute, name: o.attribute, kind: o.attribute === 'Couleur' ? 'color' as const : 'text' as const, values: o.values })), stockScope: item.stockScope, variantStock: item.variantStock };
    expect(validateProductAttributes(migrated)).toBeNull();
    for (const size of s.availableSizes) for (const c of ['Noir', 'Beige']) expect(availableStockFor(migrated, [String(size), c])).toBe(availableStock(s, size));
    expect(productOptions(migrated)).toHaveLength(2);
  });
  it('quantités à nettoyer: décimales arrondies, négatives à 0, texte à 0', () => {
    expect(planShoe(shoe({ stock: { '38': 2.9, '39': -4, '40.5': NaN as any } })).variantStock).toEqual({ '38': 2, '39': 0, '40%2E5': 0 });
  });
  it('ignore, avec la raison: pointure invalide, couleur hors palette, rien à convertir, stock sans pointure', () => {
    expect(planShoe(shoe({ availableSizes: [3, 3637] }))).toMatchObject({ status: 'skip', reason: expect.stringMatching(/3, 3637/) });
    expect(planShoe(shoe({ availableColors: [{ name: 'Turquoise', hex: '#0ff' }] }))).toMatchObject({ status: 'skip', reason: expect.stringMatching(/Turquoise/) });
    expect(planShoe(shoe({ availableSizes: [], availableColors: [] }))).toMatchObject({ status: 'skip' });
    expect(planShoe(shoe({ availableSizes: [], stock: { '38': 1 } }))).toMatchObject({ status: 'skip', reason: expect.stringMatching(/sans pointure/) });
  });
  it('un produit sans couleur ou sans pointure garde un seul attribut', () => {
    expect(planShoe(shoe({ availableColors: [] })).options.map((o) => o.attribute)).toEqual(['Pointure']);
    expect(planShoe(shoe({ availableSizes: [] })).options.map((o) => o.attribute)).toEqual(['Couleur']);
  });
  it('doublons retirés (36 et 36, Noir et noire)', () => {
    const item = planShoe(shoe({ availableSizes: [36, 36], availableColors: [{ name: 'Noir', hex: '' }, { name: 'noire', hex: '' }] }));
    expect(item.options).toEqual([{ attribute: 'Pointure', values: ['36'] }, { attribute: 'Couleur', values: ['Noir'] }]);
  });
});

describe('planMigration', () => {
  it('compte convertibles, ignorés et déjà faits; crée les attributs avec les valeurs utilisées', () => {
    const plan = planMigration([shoe(), shoe({ id: 's2', availableSizes: [3] }), shoe({ id: 's3', options: [] })], noAttrs);
    expect([plan.convertible, plan.skipped, plan.alreadyDone]).toEqual([1, 1, 1]);
    expect(plan.blockers).toEqual([]);
    const [pointure, couleur] = plan.attributeChanges;
    expect(pointure).toMatchObject({ name: 'Pointure', action: 'create' });
    expect(pointure.addValues.map((v) => v.label)).toEqual(['38', '39', '40.5']);
    expect(couleur).toMatchObject({ name: 'Couleur', kind: 'color', action: 'create' });
    expect(couleur.addValues).toEqual([{ label: 'Noir', hex: '#1C1B1A' }, { label: 'Beige', hex: '#D9C4A3' }]);
  });
  it('complète un attribut existant sans doublon; rien à faire si tout y est', () => {
    const attrs = [
      { id: 'p', name: 'pointure', kind: 'text' as const, values: ['38', '39'].map((label) => ({ label })) },
      { id: 'c', name: 'Couleur', kind: 'color' as const, values: [{ label: 'Noir', hex: '#1C1B1A' }, { label: 'Beige', hex: '#D9C4A3' }] },
    ];
    const [p, c] = planMigration([shoe()], attrs).attributeChanges;
    expect(p).toMatchObject({ action: 'extend', addValues: [{ label: '40.5' }] });
    expect(c).toMatchObject({ action: 'none', addValues: [] });
  });
  it('blocage: un attribut du même nom mais d’un autre type', () => {
    const plan = planMigration([shoe()], [{ id: 'c', name: 'Couleur', kind: 'text', values: [{ label: 'x' }] }]);
    expect(plan.blockers[0]).toMatch(/Couleur.*Texte/);
    expect(plan.attributeChanges.find((a) => a.name === 'Couleur')!.action).toBe('conflict');
  });
  it('blocage: trop de valeurs', () => {
    const many = Array.from({ length: 58 }, (_, i) => ({ label: `v${i}` }));
    const plan = planMigration([shoe()], [{ id: 'p', name: 'Pointure', kind: 'text', values: many }]);
    expect(plan.blockers[0]).toMatch(/60 valeurs/);
  });
  it('catalogue sans produit ancien: rien à faire', () => {
    const plan = planMigration([shoe({ options: [] })], noAttrs);
    expect(plan).toMatchObject({ convertible: 0, skipped: 0, alreadyDone: 1, attributeChanges: [] });
  });
  it('les produits ignorés n’ajoutent pas leurs valeurs aux attributs', () => {
    const plan = planMigration([shoe({ availableSizes: [3, 45] })], noAttrs);
    expect(plan.attributeChanges).toEqual([]);
  });
});

describe('mergedValues', () => {
  it('Pointure: ordre numérique; autres: existant puis ajouts', () => {
    expect(mergedValues([{ label: '40' }, { label: '38' }], [{ label: '39' }], true).map((v) => v.label)).toEqual(['38', '39', '40']);
    expect(mergedValues([{ label: 'S' }], [{ label: 'M' }], false).map((v) => v.label)).toEqual(['S', 'M']);
  });
});
