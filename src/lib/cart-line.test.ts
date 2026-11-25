import { describe, expect, it } from 'vitest';
import type { CartItem, Shoe } from './types';
import { lineKey, lineLabel, lineStockLeft, orderPayloadLine } from './cart-line';

const base = { id: 's', name: 'X', description: '', price: 10000, categoryId: 'c', collectionIds: [], gridImage: { id: 'i', url: 'u', hint: '' }, detailImages: [] };
const oldShoe = { ...base, availableSizes: [38, 40], availableColors: [{ name: 'Noir', hex: '#000' }], stock: { '38': 3, '40': 0 } } as Shoe;
const ring = { ...base, id: 'r', availableSizes: [], availableColors: [], options: [
  { attributeId: 'a', name: 'Taille', kind: 'text', values: ['52', '54'] },
  { attributeId: 'b', name: 'Matière', kind: 'color', values: ['Doré'] },
], stockScope: 'combination', variantStock: { '54|dore': 2 } } as Shoe;
const bag = { ...base, id: 'b', availableSizes: [], availableColors: [], options: [] } as Shoe;
const line = (product: Shoe, over: Partial<CartItem> = {}): CartItem => ({ id: 'l', product, quantity: 1, ...over });

describe('lineLabel', () => {
  it('ancienne ligne: Pointure puis couleur seule', () => {
    expect(lineLabel(line(oldShoe, { size: 38, color: 'Noir' }))).toBe('Pointure 38 · Noir');
  });
  it('ancienne ligne dont la copie du produit n’a plus ses attributs: affichée quand même', () => {
    expect(lineLabel(line({ ...base } as unknown as Shoe, { size: 40, color: 'Rouge' }))).toBe('Pointure 40 · Rouge');
  });
  it('nouveau format: la valeur d’un attribut couleur s’écrit seule', () => {
    expect(lineLabel(line(ring, { selection: [{ name: 'Taille', value: '54' }, { name: 'Matière', value: 'Doré' }] }))).toBe('Taille 54 · Doré');
  });
  it('produit sans attribut: vide', () => {
    expect(lineLabel(line(bag, { selection: [], size: 0, color: '' }))).toBe('');
  });
});

describe('lineKey: même choix = même ligne', () => {
  it('ancien et nouveau format se rejoignent, casse et accents ignorés', () => {
    const a = line(oldShoe, { size: 38, color: 'Noir' });
    const b = line(oldShoe, { selection: [{ name: 'pointure', value: '38' }, { name: 'Couleur', value: 'noir' }] });
    expect(lineKey(a)).toBe(lineKey(b));
    expect(lineKey(a)).not.toBe(lineKey(line(oldShoe, { size: 40, color: 'Noir' })));
  });
});

describe('lineStockLeft', () => {
  it('produit ancien, nouveau, non suivi, choix disparu', () => {
    expect(lineStockLeft(line(oldShoe, { size: 38, color: 'Noir' }))).toBe(3);
    expect(lineStockLeft(line(oldShoe, { size: 40, color: 'Noir' }))).toBe(0);
    expect(lineStockLeft(line(ring, { selection: [{ name: 'Taille', value: '54' }, { name: 'Matière', value: 'Doré' }] }))).toBe(2);
    expect(lineStockLeft(line(bag, { selection: [] }))).toBeNull();
    expect(lineStockLeft(line(oldShoe, { size: 99, color: 'Noir' }))).toBeNull();
  });
});

describe('orderPayloadLine', () => {
  it('envoie le choix s’il existe, sinon l’ancien format', () => {
    expect(orderPayloadLine(line(ring, { quantity: 2, selection: [{ name: 'Taille', value: '52' }] }))).toEqual({ productId: 'r', quantity: 2, selection: [{ name: 'Taille', value: '52' }] });
    expect(orderPayloadLine(line(oldShoe, { size: 38, color: 'Noir' }))).toEqual({ productId: 's', quantity: 1, size: 38, color: 'Noir' });
  });
});
