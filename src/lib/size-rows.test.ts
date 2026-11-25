import { describe, expect, it } from 'vitest';
import { newSizeRow, parseSizeRows, rowsFromShoe } from './size-rows';

const r = (size: string, qty = '') => newSizeRow(size, qty);

describe('parseSizeRows', () => {
  it('construit pointures triées et stock', () => {
    expect(parseSizeRows([r('41', '3'), r('40', '5')], true)).toEqual({ sizes: [40, 41], stock: { '40': 5, '41': 3 } });
  });
  it('sans suivi: pas de stock, quantités ignorées', () => {
    expect(parseSizeRows([r('40', 'abc'), r('41')], false)).toEqual({ sizes: [40, 41] });
  });
  it('ignore les lignes vides, refuse si tout est vide', () => {
    expect(parseSizeRows([r('40', '2'), r(''), r('', '')], true).sizes).toEqual([40]);
    expect(parseSizeRows([r(''), r('')], true).error).toMatch(/au moins une pointure/);
  });
  it('accepte demi-pointure et virgule décimale', () => {
    expect(parseSizeRows([r('40,5', '1')], true).sizes).toEqual([40.5]);
  });
  it('refuse pointure hors bornes, non numérique ou doublon', () => {
    expect(parseSizeRows([r('3', '1')], true).error).toMatch(/invalide/);
    expect(parseSizeRows([r('abc', '1')], true).error).toMatch(/invalide/);
    expect(parseSizeRows([r('40.3', '1')], true).error).toMatch(/invalide/);
    expect(parseSizeRows([r('40', '1'), r('40', '2')], true).error).toMatch(/deux fois/);
  });
  it('refuse stock vide, négatif, décimal quand suivi', () => {
    for (const q of ['', '-1', '1.5', 'x']) expect(parseSizeRows([r('40', q)], true).error).toMatch(/Stock invalide/);
    expect(parseSizeRows([r('40', '0')], true).stock).toEqual({ '40': 0 });
  });
  it('une quantité sans pointure est refusée', () => {
    expect(parseSizeRows([r('', '4')], true).error).toMatch(/invalide/);
  });
});

describe('rowsFromShoe', () => {
  it('stock suivi: une ligne par pointure, absente = 0', () => {
    const { rows, tracked } = rowsFromShoe({ availableSizes: [41, 40], stock: { '40': 5 } });
    expect(tracked).toBe(true);
    expect(rows.map((x) => [x.size, x.qty])).toEqual([['40', '5'], ['41', '0']]);
  });
  it('stock non suivi', () => {
    const { rows, tracked } = rowsFromShoe({ availableSizes: [40] });
    expect(tracked).toBe(false);
    expect(rows[0].qty).toBe('');
  });
  it('produit sans pointure: une ligne vide', () => {
    expect(rowsFromShoe({ availableSizes: [] }).rows).toHaveLength(1);
  });
});
