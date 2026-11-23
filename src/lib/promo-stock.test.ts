import { describe, it, expect } from 'vitest';
import { promoProblem, computeDiscount } from './promo';
import { availableStock, parseStockInput, formatStockInput, stockSummary, firstAvailableSize } from './stock';

const base = { discountType: 'percentage' as const, value: 10, isActive: true };
const now = new Date('2026-06-15T12:00:00Z');

describe('promoProblem', () => {
  it('code valide', () => expect(promoProblem(base, 1000, now)).toBeNull());
  it('inactif', () => expect(promoProblem({ ...base, isActive: false }, 1000, now)).toMatch(/plus actif/));
  it('expiré / pas encore expiré', () => {
    expect(promoProblem({ ...base, expiresAt: '2026-06-01T00:00:00Z' }, 1000, now)).toMatch(/expiré/);
    expect(promoProblem({ ...base, expiresAt: '2026-07-01T00:00:00Z' }, 1000, now)).toBeNull();
  });
  it('date invalide: ignorée (pas de blocage silencieux inverse)', () => {
    expect(promoProblem({ ...base, expiresAt: 'n’importe quoi' }, 1000, now)).toBeNull();
  });
  it('limite d’utilisation', () => {
    expect(promoProblem({ ...base, maxUses: 5, usedCount: 5 }, 1000, now)).toMatch(/limite/);
    expect(promoProblem({ ...base, maxUses: 5, usedCount: 4 }, 1000, now)).toBeNull();
    expect(promoProblem({ ...base, maxUses: 5 }, 1000, now)).toBeNull();
    expect(promoProblem({ ...base, maxUses: 0 }, 1000, now)).toMatch(/limite/);
  });
  it('montant minimum', () => {
    expect(promoProblem({ ...base, minOrderAmount: 5000 }, 4999, now)).toMatch(/minimum/);
    expect(promoProblem({ ...base, minOrderAmount: 5000 }, 5000, now)).toBeNull();
    expect(promoProblem({ ...base, minOrderAmount: 5000 }, undefined, now)).toBeNull();
  });
});

describe('computeDiscount', () => {
  it('pourcentage, fixe, plafonnement', () => {
    expect(computeDiscount({ discountType: 'percentage', value: 10 }, 20000)).toBe(2000);
    expect(computeDiscount({ discountType: 'fixed', value: 500 }, 20000)).toBe(500);
    expect(computeDiscount({ discountType: 'fixed', value: 99999 }, 20000)).toBe(20000);
    expect(computeDiscount({ discountType: 'percentage', value: 250 }, 20000)).toBe(20000);
    expect(computeDiscount({ discountType: 'percentage', value: -5 }, 20000)).toBe(0);
  });
});

describe('stock', () => {
  it('non suivi = illimité', () => expect(availableStock({}, 40)).toBeNull());
  it('suivi: pointure absente = 0', () => {
    expect(availableStock({ stock: { '39': 5 } }, 39)).toBe(5);
    expect(availableStock({ stock: { '39': 5 } }, 40)).toBe(0);
    expect(availableStock({ stock: { '39': -3 } }, 39)).toBe(0);
  });
  it('parseStockInput', () => {
    expect(parseStockInput('')).toEqual({ stock: undefined });
    expect(parseStockInput('38:5, 39:3')).toEqual({ stock: { '38': 5, '39': 3 } });
    expect(parseStockInput('40:0').stock).toEqual({ '40': 0 });
    for (const bad of ['38', '38:', 'a:3', '38:-1', '38:1.5', '38:3:4', '0:5', '38:999999']) {
      expect(parseStockInput(bad).error, bad).toBeTruthy();
    }
  });
  it('formatStockInput (aller-retour)', () => {
    expect(formatStockInput({ '40': 1, '38': 5 })).toBe('38:5, 40:1');
    expect(formatStockInput(undefined)).toBe('');
    expect(parseStockInput(formatStockInput({ '38': 5, '40': 1 })).stock).toEqual({ '38': 5, '40': 1 });
  });
});

describe('stockSummary / firstAvailableSize', () => {
  const sizes = [38, 39, 40];
  it('stock non suivi: pas de badge, première pointure', () => {
    expect(stockSummary({ availableSizes: sizes })).toEqual({ tracked: false, total: 0, soldOut: false });
    expect(firstAvailableSize({ availableSizes: sizes })).toBe(38);
  });
  it('total suivi et épuisement', () => {
    expect(stockSummary({ availableSizes: sizes, stock: { '38': 1, '40': 2 } })).toEqual({ tracked: true, total: 3, soldOut: false });
    expect(stockSummary({ availableSizes: sizes, stock: { '38': 0 } })).toEqual({ tracked: true, total: 0, soldOut: true });
    expect(stockSummary({ availableSizes: sizes, stock: {} }).soldOut).toBe(true);
  });
  it('saute les pointures épuisées', () => {
    expect(firstAvailableSize({ availableSizes: sizes, stock: { '38': 0, '39': 0, '40': 4 } })).toBe(40);
    expect(firstAvailableSize({ availableSizes: sizes, stock: { '38': 0 } })).toBeNull();
  });
});
