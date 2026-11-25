import { describe, expect, it } from 'vitest';
import type { ProductOption, Shoe } from './types';
import {
  applyStockChange, availableStockFor, combinations, describeSelection, expectedStockKeys, firstAvailableCombination,
  legacySelection, productOptions, resolveSelection, stockKeyFor, stockSummaryFor, validateAttribute,
  validateProductAttributes, variantKey, valueSoldOut, shoeSizes, shoeColors, stockEntries,
} from './attributes';
import { availableStock, firstAvailableSize, stockSummary } from './stock';

const noir = { name: 'Noir', hex: '#1C1B1A' };
const beige = { name: 'Beige', hex: '#D9C4A3' };

/** Chaussure ancienne: pointure + couleur, stock par pointure. */
const oldShoe: Pick<Shoe, 'availableSizes' | 'availableColors' | 'stock'> = { availableSizes: [39, 40, 40.5], availableColors: [noir, beige], stock: { '39': 2, '40': 0, '40.5': 4 } };
const oldUntracked: Pick<Shoe, 'availableSizes' | 'availableColors' | 'stock'> = { availableSizes: [39, 40], availableColors: [noir] };

const sizeOpt: ProductOption = { attributeId: 'a1', name: 'Pointure', kind: 'text', values: ['38', '39'] };
const colorOpt: ProductOption = { attributeId: 'a2', name: 'Couleur', kind: 'color', values: ['Noir', 'Beige'] };
const base = { availableSizes: [], availableColors: [] };
const newShoe = (over: Partial<Shoe> = {}) => ({ ...base, options: [sizeOpt, colorOpt], ...over }) as Pick<Shoe, 'options' | 'availableSizes' | 'availableColors' | 'stock' | 'stockScope' | 'variantStock'>;

describe('productOptions', () => {
  it('produit ancien: Pointure puis Couleur', () => {
    const o = productOptions(oldShoe);
    expect(o.map((x) => [x.name, x.kind, x.values])).toEqual([['Pointure', 'text', ['39', '40', '40.5']], ['Couleur', 'color', ['Noir', 'Beige']]]);
  });
  it('produit ancien sans couleur ou sans pointure', () => {
    expect(productOptions({ availableSizes: [40], availableColors: [] }).map((x) => x.name)).toEqual(['Pointure']);
    expect(productOptions({ availableSizes: [], availableColors: [] })).toEqual([]);
  });
  it('nouveau produit: options telles quelles, même vides (sac)', () => {
    expect(productOptions(newShoe())).toHaveLength(2);
    expect(productOptions(newShoe({ options: [] }))).toEqual([]);
  });
});

describe('variantKey et combinaisons', () => {
  it('clé sans point ni accent ni casse, séparateur sûr', () => {
    expect(variantKey(['40.5', 'Doré'])).toBe('40%2E5|dore');
    expect(variantKey(['Bleu  Nuit'])).toBe(variantKey(['bleu nuit']));
    expect(variantKey(['a|b'])).not.toBe(variantKey(['a', 'b']));
    expect(variantKey([])).toBe('_');
  });
  it('produit cartésien, une seule combinaison vide sans attribut', () => {
    expect(combinations([sizeOpt, colorOpt])).toHaveLength(4);
    expect(combinations([])).toEqual([[]]);
  });
});

describe('resolveSelection', () => {
  it('accepte dans n’importe quel ordre, renvoie dans l’ordre du produit et avec l’écriture du produit', () => {
    const r = resolveSelection(newShoe(), [{ name: 'couleur', value: 'noir' }, { name: 'Pointure', value: ' 39 ' }]);
    expect(r).toEqual({ ok: true, values: ['39', 'Noir'] });
  });
  it('couleur: écriture historique reconnue', () => {
    expect(resolveSelection(newShoe(), [{ name: 'Pointure', value: '38' }, { name: 'Couleur', value: 'noire' }])).toEqual({ ok: true, values: ['38', 'Noir'] });
  });
  it('refuse valeur inconnue, attribut manquant, attribut en trop ou doublé', () => {
    const bad = (sel: any) => resolveSelection(newShoe(), sel);
    expect(bad([{ name: 'Pointure', value: '50' }, { name: 'Couleur', value: 'Noir' }])).toMatchObject({ ok: false, reason: expect.stringMatching(/Pointure.*n’est pas proposé/) });
    expect(bad([{ name: 'Pointure', value: '38' }])).toMatchObject({ ok: false, reason: expect.stringMatching(/Couleur/) });
    expect(bad([{ name: 'Pointure', value: '38' }, { name: 'Couleur', value: 'Noir' }, { name: 'Matière', value: 'cuir' }])).toMatchObject({ ok: false });
    expect(bad([{ name: 'Pointure', value: '38' }, { name: 'Pointure', value: '39' }, { name: 'Couleur', value: 'Noir' }])).toMatchObject({ ok: false });
    expect(bad('x')).toMatchObject({ ok: false });
  });
  it('produit sans attribut: choix vide accepté, tout choix refusé', () => {
    expect(resolveSelection(newShoe({ options: [] }), [])).toEqual({ ok: true, values: [] });
    expect(resolveSelection(newShoe({ options: [] }), [{ name: 'Pointure', value: '40' }])).toMatchObject({ ok: false });
  });
  it('ancien panier (size, color) sur produit ancien', () => {
    expect(resolveSelection(oldShoe, legacySelection(40.5, 'Beige'))).toEqual({ ok: true, values: ['40.5', 'Beige'] });
    expect(resolveSelection(oldShoe, legacySelection(41, 'Beige'))).toMatchObject({ ok: false });
  });
  it('describeSelection', () => {
    expect(describeSelection(legacySelection(40, 'Noir'))).toBe('Pointure: 40 · Couleur: Noir');
  });
});

describe('stock: équivalence avec l’ancien code pour les produits anciens', () => {
  const cases = [oldShoe, oldUntracked, { ...oldShoe, stock: { '39': 0, '40': 0, '40.5': 0 } }, { ...oldShoe, stock: {} }];
  it.each(cases.map((c, i) => [i, c] as const))('cas %i', (_i, shoe) => {
    for (const size of shoe.availableSizes) {
      for (const color of shoe.availableColors) {
        expect(availableStockFor(shoe, [String(size), color.name])).toBe(availableStock(shoe, size));
      }
    }
    expect(stockSummaryFor(shoe)).toEqual(stockSummary(shoe));
    const first = firstAvailableCombination(shoe);
    expect(first ? Number(first[0]) : null).toBe(firstAvailableSize(shoe));
  });
  it('le stock ancien est partagé entre les couleurs', () => {
    expect(availableStockFor(oldShoe, ['39', 'Noir'])).toBe(2);
    expect(availableStockFor(oldShoe, ['39', 'Beige'])).toBe(2);
    expect(stockKeyFor(oldShoe, ['40.5', 'Noir'])).toBe('40.5');
  });
});

describe('stock par combinaison', () => {
  const shoe = newShoe({ stockScope: 'combination', variantStock: { [variantKey(['38', 'Noir'])]: 3, [variantKey(['39', 'Noir'])]: 0 } });
  it('quantité par combinaison, clé absente = 0, non suivi = null', () => {
    expect(availableStockFor(shoe, ['38', 'Noir'])).toBe(3);
    expect(availableStockFor(shoe, ['39', 'Noir'])).toBe(0);
    expect(availableStockFor(shoe, ['38', 'Beige'])).toBe(0);
    expect(availableStockFor(newShoe(), ['38', 'Noir'])).toBeNull();
  });
  it('mode par défaut: combinaison', () => {
    expect(availableStockFor(newShoe({ variantStock: { [variantKey(['38', 'Noir'])]: 5 } }), ['38', 'Noir'])).toBe(5);
  });
  it('résumé et première combinaison disponible', () => {
    expect(stockSummaryFor(shoe)).toEqual({ tracked: true, total: 3, soldOut: false });
    expect(firstAvailableCombination(shoe)).toEqual(['38', 'Noir']);
    const out = newShoe({ variantStock: {} });
    expect(stockSummaryFor(out)).toEqual({ tracked: true, total: 0, soldOut: true });
    expect(firstAvailableCombination(out)).toBeNull();
  });
  it('décompte: ok, additionne les lignes de même clé, refuse l’excès', () => {
    const ok = applyStockChange(shoe, [{ values: ['38', 'Noir'], quantity: 1 }, { values: ['38', 'Noir'], quantity: 1 }]);
    expect(ok).toMatchObject({ ok: true, field: 'variantStock' });
    expect((ok as any).table[variantKey(['38', 'Noir'])]).toBe(1);
    expect(applyStockChange(shoe, [{ values: ['38', 'Noir'], quantity: 2 }, { values: ['38', 'Noir'], quantity: 2 }])).toMatchObject({ ok: false, reason: expect.stringMatching(/insuffisant.*3 restant/) });
    expect(applyStockChange(shoe, [{ values: ['39', 'Noir'], quantity: 1 }])).toMatchObject({ ok: false, reason: expect.stringMatching(/épuisé/) });
  });
  it('ne modifie pas le produit d’origine', () => {
    const before = JSON.stringify(shoe);
    applyStockChange(shoe, [{ values: ['38', 'Noir'], quantity: 1 }]);
    expect(JSON.stringify(shoe)).toBe(before);
  });
  it('non suivi: aucune écriture', () => {
    expect(applyStockChange(newShoe(), [{ values: ['38', 'Noir'], quantity: 99 }])).toEqual({ ok: true, field: 'variantStock', table: null });
  });
});

describe('stock partagé par premier attribut (migration des chaussures)', () => {
  const shoe = newShoe({ stockScope: 'attribute1', variantStock: { [variantKey(['38'])]: 4 } });
  it('les deux couleurs partagent la pointure', () => {
    expect(availableStockFor(shoe, ['38', 'Noir'])).toBe(4);
    expect(availableStockFor(shoe, ['38', 'Beige'])).toBe(4);
    const r = applyStockChange(shoe, [{ values: ['38', 'Noir'], quantity: 3 }, { values: ['38', 'Beige'], quantity: 1 }]);
    expect(r).toMatchObject({ ok: true });
    expect((r as any).table[variantKey(['38'])]).toBe(0);
    expect(applyStockChange(shoe, [{ values: ['38', 'Noir'], quantity: 3 }, { values: ['38', 'Beige'], quantity: 2 }])).toMatchObject({ ok: false });
  });
  it('résumé: pas de double comptage entre couleurs', () => {
    expect(stockSummaryFor(shoe).total).toBe(4);
    expect(expectedStockKeys(shoe)).toHaveLength(2);
  });
});

describe('sac: aucun attribut, une quantité', () => {
  const bag = { ...base, options: [], variantStock: { _: 5 } } as any;
  it('quantité unique', () => {
    expect(availableStockFor(bag, [])).toBe(5);
    expect(applyStockChange(bag, [{ values: [], quantity: 5 }])).toMatchObject({ ok: true, table: { _: 0 } });
    expect(applyStockChange(bag, [{ values: [], quantity: 6 }])).toMatchObject({ ok: false, reason: expect.stringMatching(/ce produit/) });
    expect(validateProductAttributes(bag)).toBeNull();
  });
});

describe('bague (Taille de doigt + Matière)', () => {
  const ring = { ...base, options: [
    { attributeId: 'r1', name: 'Taille', kind: 'text', values: ['52', '54', '56'] },
    { attributeId: 'r2', name: 'Matière', kind: 'text', values: ['Doré', 'Argenté'] },
  ] } as any;
  it('tailles libres acceptées, valeurs avec accents', () => {
    expect(resolveSelection(ring, [{ name: 'Taille', value: '54' }, { name: 'matiere', value: 'dore' }])).toEqual({ ok: true, values: ['54', 'Doré'] });
    expect(validateProductAttributes(ring)).toBeNull();
  });
});

describe('validateAttribute', () => {
  const v = (labels: string[]) => labels.map((label) => ({ label }));
  it('valide', () => expect(validateAttribute({ name: 'Taille', kind: 'text', values: v(['S', 'M', 'L']) })).toBeNull());
  it('nom, type, valeurs', () => {
    expect(validateAttribute({ name: ' ', kind: 'text', values: v(['S']) })).toMatch(/nom/);
    expect(validateAttribute({ name: 'x'.repeat(41), kind: 'text', values: v(['S']) })).toMatch(/nom/);
    expect(validateAttribute({ name: 'T', kind: 'autre' as any, values: v(['S']) })).toMatch(/Type/);
    expect(validateAttribute({ name: 'T', kind: 'text', values: [] })).toMatch(/au moins une valeur/);
    expect(validateAttribute({ name: 'T', kind: 'text', values: v(Array.from({ length: 61 }, (_, i) => `v${i}`)) })).toMatch(/60/);
    expect(validateAttribute({ name: 'T', kind: 'text', values: v(['S', ' s ']) })).toMatch(/double/);
    expect(validateAttribute({ name: 'T', kind: 'text', values: v(['']) })).toMatch(/caractères/);
    expect(validateAttribute({ name: 'T', kind: 'text', values: v(['x'.repeat(31)]) })).toMatch(/caractères/);
  });
  it('couleur: palette ou code hexadécimal', () => {
    expect(validateAttribute({ name: 'Couleur', kind: 'color', values: v(['Noir']) })).toBeNull();
    expect(validateAttribute({ name: 'Couleur', kind: 'color', values: v(['Turquoise']) })).toMatch(/code couleur/);
    expect(validateAttribute({ name: 'Couleur', kind: 'color', values: [{ label: 'Turquoise', hex: '#40E0D0' }] })).toBeNull();
    expect(validateAttribute({ name: 'Couleur', kind: 'color', values: [{ label: 'Turquoise', hex: 'bleu' }] })).toMatch(/code couleur/);
  });
});

describe('validateProductAttributes', () => {
  it('produit ancien et produit sans stock: valides', () => {
    expect(validateProductAttributes({})).toBeNull();
    expect(validateProductAttributes({ options: [sizeOpt] })).toBeNull();
  });
  it('au plus 2 attributs, pas de doublon', () => {
    const third: ProductOption = { attributeId: 'a3', name: 'Matière', kind: 'text', values: ['cuir'] };
    expect(validateProductAttributes({ options: [sizeOpt, colorOpt, third] })).toMatch(/au plus 2/);
    expect(validateProductAttributes({ options: [sizeOpt, { ...sizeOpt }] })).toMatch(/deux fois/);
    expect(validateProductAttributes({ options: [sizeOpt, { ...colorOpt, name: 'pointure' }] })).toMatch(/deux fois/);
  });
  it('attribut sans valeur ou couleur inconnue', () => {
    expect(validateProductAttributes({ options: [{ ...sizeOpt, values: [] }] })).toMatch(/Pointure/);
    expect(validateProductAttributes({ options: [{ ...colorOpt, values: ['Turquoise'] }] })).toMatch(/Couleur/);
  });
  it('stock: clés connues, entiers 0 à 100000', () => {
    const ok = { options: [sizeOpt, colorOpt], variantStock: { [variantKey(['38', 'Noir'])]: 3 } };
    expect(validateProductAttributes(ok)).toBeNull();
    expect(validateProductAttributes({ ...ok, variantStock: { 'inconnue|x': 1 } })).toMatch(/n’existe pas/);
    for (const q of [-1, 1.5, 100001, NaN]) expect(validateProductAttributes({ ...ok, variantStock: { [variantKey(['38', 'Noir'])]: q } })).toMatch(/invalide/);
    expect(validateProductAttributes({ ...ok, stockScope: 'bizarre' as any })).toMatch(/inconnu/);
  });
  it('stock partagé: clés = valeurs du premier attribut', () => {
    expect(validateProductAttributes({ options: [sizeOpt, colorOpt], stockScope: 'attribute1', variantStock: { [variantKey(['38'])]: 2 } })).toBeNull();
    expect(validateProductAttributes({ options: [sizeOpt, colorOpt], stockScope: 'attribute1', variantStock: { [variantKey(['38', 'Noir'])]: 2 } })).toMatch(/n’existe pas/);
    expect(validateProductAttributes({ options: [], stockScope: 'attribute1', variantStock: {} })).toMatch(/au moins un attribut/);
  });
  it('couleur hors palette: acceptée avec son code, refusée sans', () => {
    const turq = (hexes?: Record<string, string>): ProductOption => ({ attributeId: 't', name: 'Teinte', kind: 'color', values: ['Turquoise'], ...(hexes ? { hexes } : {}) });
    expect(validateProductAttributes({ options: [turq({ Turquoise: '#40E0D0' })] })).toBeNull();
    expect(validateProductAttributes({ options: [turq()] })).toMatch(/code couleur/);
  });
  it('plafond de 100 combinaisons', () => {
    const many = (n: number, name: string, id: string): ProductOption => ({ attributeId: id, name, kind: 'text', values: Array.from({ length: n }, (_, i) => `v${i}`) });
    expect(validateProductAttributes({ options: [many(10, 'A', 'x'), many(10, 'B', 'y')], variantStock: {} })).toBeNull();
    expect(validateProductAttributes({ options: [many(11, 'A', 'x'), many(10, 'B', 'y')], variantStock: {} })).toMatch(/Trop de combinaisons/);
    expect(validateProductAttributes({ options: [many(11, 'A', 'x'), many(10, 'B', 'y')], stockScope: 'attribute1', variantStock: {} })).toBeNull();
  });
  it('stock sans attributs enregistrés', () => {
    expect(validateProductAttributes({ variantStock: {} })).toMatch(/attributs/);
    expect(validateProductAttributes({ options: [sizeOpt], stockScope: 'combination' })).toMatch(/sans quantités/);
  });
});

describe('aides d’affichage', () => {
  const shoe = newShoe({ stockScope: 'combination', variantStock: { [variantKey(['38', 'Noir'])]: 3, [variantKey(['38', 'Beige'])]: 0, [variantKey(['39', 'Noir'])]: 0, [variantKey(['39', 'Beige'])]: 0 } });

  it('valueSoldOut: épuisée seulement si toutes les combinaisons compatibles le sont', () => {
    expect(valueSoldOut(shoe, 0, '39', [null, null])).toBe(true);   // 39 n'a rien, quelle que soit la couleur
    expect(valueSoldOut(shoe, 0, '38', [null, null])).toBe(false);  // 38 Noir existe
    expect(valueSoldOut(shoe, 0, '38', [null, 'Beige'])).toBe(true); // 38 en Beige: plus rien
    expect(valueSoldOut(shoe, 1, 'Beige', ['38', null])).toBe(true);
    expect(valueSoldOut(shoe, 1, 'Noir', ['38', null])).toBe(false);
  });
  it('valueSoldOut: stock non suivi = jamais épuisé; ancien stock partagé par pointure', () => {
    expect(valueSoldOut(newShoe(), 0, '38', [null, null])).toBe(false);
    expect(valueSoldOut(oldShoe, 0, '40', [null, null])).toBe(true);   // table ancienne: 40 = 0
    expect(valueSoldOut(oldShoe, 0, '39', [null, null])).toBe(false);
  });
  it('shoeSizes / shoeColors: produit ancien et nouveau', () => {
    expect(shoeSizes(oldShoe)).toEqual([39, 40, 40.5]);
    expect(shoeSizes(newShoe({ options: [{ attributeId: 'x', name: 'Taille', kind: 'text', values: ['S'] }] }))).toEqual([]);
    expect(shoeColors(oldShoe).map((c) => [c.name, c.hex])).toEqual([['Noir', '#1C1B1A'], ['Beige', '#D9C4A3']]);
    const turq = newShoe({ options: [{ attributeId: 'c', name: 'Teinte', kind: 'color', values: ['Turquoise'], hexes: { Turquoise: '#40E0D0' } }] });
    expect(shoeColors(turq)).toEqual([{ name: 'Turquoise', hex: '#40E0D0' }]);
  });
  it('stockEntries: libellés par pointure (ancien, partagé) ou par combinaison; vide si non suivi', () => {
    expect(stockEntries(oldUntracked)).toEqual([]);
    expect(stockEntries(oldShoe).map((e) => [e.label, e.quantity])).toEqual([['Pointure 39', 2], ['Pointure 40', 0], ['Pointure 40.5', 4]]);
    expect(stockEntries(shoe).map((e) => [e.label, e.quantity])).toEqual([
      ['Pointure 38 · Couleur Noir', 3], ['Pointure 38 · Couleur Beige', 0], ['Pointure 39 · Couleur Noir', 0], ['Pointure 39 · Couleur Beige', 0],
    ]);
    const shared = newShoe({ stockScope: 'attribute1', variantStock: { [variantKey(['38'])]: 2 } });
    expect(stockEntries(shared).map((e) => [e.label, e.quantity])).toEqual([['Pointure 38', 2], ['Pointure 39', 0]]);
    expect(stockEntries({ ...base, options: [], variantStock: { _: 4 } } as any)).toEqual([{ key: '_', values: [], label: '', quantity: 4 }]);
  });
});
