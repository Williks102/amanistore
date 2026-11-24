import { describe, it, expect } from 'vitest';
import { PALETTE, canonicalColor, canonicalColorName, normalizeColors } from './colors';
import { isListable, isPriceValid, isSizeValid, productIssues, validateProductFields, duplicateNames } from './product-validation';
import type { Shoe } from './types';

describe('palette et couleurs historiques', () => {
  it('reconnaît les écritures observées dans la boutique', () => {
    const cases: Array<[string, string]> = [
      ['noir', 'Noir'], ['Noire', 'Noir'], ['Noir matte', 'Noir'], ['noir verni', 'Noir'],
      ['Maron', 'Marron'], ['marron', 'Marron'], ['Blanche', 'Blanc'], ['blanc cassé', 'Blanc cassé'],
      ['Bleue- nuit', 'Bleu nuit'], ['bleue nuit', 'Bleu nuit'], ['Bleu nuit', 'Bleu nuit'], ['Blue', 'Bleu'], ['Bleue', 'Bleu'],
      ['Rouge Bordeau', 'Bordeaux'], ['dore', 'Doré'], ['Dorée', 'Doré'], ['or', 'Doré'], ['argente', 'Argenté'], ['Argenté', 'Argenté'],
      ['Gris métallisé', 'Gris'], ['violet', 'Violet'], ['Bleu ciel', 'Bleu ciel'], ['beige', 'Beige'], ['kaki', 'Kaki'],
    ];
    for (const [raw, expected] of cases) expect(canonicalColor(raw)?.name, raw).toBe(expected);
  });

  it('inconnu => null, et canonicalColorName garde le texte', () => {
    expect(canonicalColor('Turquoise')).toBeNull();
    expect(canonicalColorName('  Turquoise ')).toBe('Turquoise');
    expect(canonicalColorName('noire')).toBe('Noir');
  });

  it('la palette n’a pas de doublon et chaque nom se retrouve lui-même', () => {
    expect(new Set(PALETTE.map((c) => c.name)).size).toBe(PALETTE.length);
    for (const c of PALETTE) expect(canonicalColor(c.name)).toEqual(c);
  });

  it('normalizeColors corrige noms et codes, supprime les doublons, liste les inconnus', () => {
    const r = normalizeColors([
      { name: 'noir', hex: '#000000' }, { name: 'Noire', hex: '#262626' }, { name: 'rouge', hex: '#000000' }, { name: 'Turquoise', hex: '#00ffff' },
    ]);
    expect(r.colors.map((c) => c.name)).toEqual(['Noir', 'Rouge', 'Turquoise']);
    expect(r.colors.find((c) => c.name === 'Rouge')!.hex).toBe('#C21F1F'); // plus de « Rouge » en noir
    expect(r.unmapped).toEqual(['Turquoise']);
    expect(r.changed).toBe(true);
  });

  it('normalizeColors: déjà propre => inchangé', () => {
    const clean = [{ name: 'Noir', hex: '#1C1B1A' }, { name: 'Marron', hex: '#6B4423' }];
    expect(normalizeColors(clean)).toEqual({ colors: clean, unmapped: [], changed: false });
  });
});

describe('validation des produits', () => {
  it('prix: bornes', () => {
    expect([999, 1000, 65000, 1_000_000, 1_000_001, 7_000_022, 0, -5, NaN].map(isPriceValid)).toEqual([false, true, true, true, false, false, false, false, false]);
    expect(isListable({ price: 7000022 })).toBe(false);
    expect(isListable({ price: 55000 })).toBe(true);
  });

  it('pointures: 16 à 50, demi-pointures permises', () => {
    expect([3, 15, 16, 36, 37.5, 50, 51, 3637, 36.3].map(isSizeValid)).toEqual([false, false, true, true, true, true, false, false, false]);
  });

  it('validateProductFields: ne vérifie que les champs fournis', () => {
    expect(validateProductFields({})).toBeNull();
    expect(validateProductFields({ price: 65000 })).toBeNull();
    expect(validateProductFields({ price: 7000022 })).toMatch(/prix/i);
    expect(validateProductFields({ availableSizes: [36, 37, 3637] })).toMatch(/3637/);
    expect(validateProductFields({ availableSizes: [] })).toMatch(/pointure/i);
    expect(validateProductFields({ availableColors: [{ name: 'Turquoise', hex: '#0ff' }] })).toMatch(/Turquoise/);
    expect(validateProductFields({ availableColors: [{ name: 'noire', hex: '#000' }] })).toBeNull();
    expect(validateProductFields({ name: 'A' })).toMatch(/nom/i);
  });

  const shoe = (over: Partial<Shoe> = {}): Shoe => ({
    id: 's', name: 'Escarpin', description: 'Joli escarpin', price: 65000, categoryId: 'c1', collectionIds: [],
    gridImage: { id: 'i', url: 'u', hint: '' }, detailImages: [{ id: 'd', url: 'u', hint: '' }],
    availableSizes: [38, 39], availableColors: [{ name: 'Noir', hex: '#1C1B1A' }], ...over,
  });

  it('productIssues: produit propre = aucune anomalie', () => {
    expect(productIssues(shoe(), [{ id: 'c1' }])).toEqual([]);
  });

  it('productIssues: repère les anomalies réelles de la boutique', () => {
    const codes = (s: Shoe) => productIssues(s, [{ id: 'c1' }]).map((i) => i.code);
    expect(codes(shoe({ price: 7000022 }))).toContain('price');
    expect(codes(shoe({ availableSizes: [3] }))).toContain('size');
    expect(codes(shoe({ availableSizes: [34, 3637] }))).toContain('size');
    expect(codes(shoe({ availableColors: [{ name: 'Maron', hex: '#000' }, { name: 'Turquoise', hex: '#0ff' }] }))).toEqual(['color']); // « Maron » est reconnu, « Turquoise » non
    expect(codes(shoe({ detailImages: [] }))).toContain('images');
    expect(codes(shoe({ description: '' }))).toContain('description');
    expect(codes(shoe({ categoryId: 'zzz' }))).toContain('category');
  });

  it('duplicateNames: insensible à la casse et aux espaces de bord', () => {
    expect(duplicateNames([{ name: 'Escarpin' }, { name: 'escarpin ' }, { name: 'Mule' }])).toEqual([{ name: 'escarpin', count: 2 }]);
  });
});
