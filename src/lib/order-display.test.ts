import { describe, it, expect } from 'vitest';
import { itemCount, orderLines, orderTotals, progressPercent, shortOrderNumber, statusStep, STATUS_DESCRIPTIONS } from './order-display';
import type { Order, OrderStatus } from './types';

const shoe = (id: string, price: number) => ({ id, name: `Modèle ${id}`, price, gridImage: { id: 'i', url: `https://img/${id}.jpg`, hint: '' } }) as any;
const order = (over: Partial<Order> = {}): Order => ({
  id: 'abc123def456', userId: 'u', customerName: 'Awa', customerPhone: '770000000', customerAddress: 'Dakar',
  date: '2026-01-01', status: 'En attente', validationCode: '123456', total: 0,
  items: [
    { id: 'a-38-Noir', product: shoe('a', 10000), quantity: 3, size: 38, color: 'Noir' },
    { id: 'b-40-Rouge', product: shoe('b', 5000), quantity: 1, size: 40, color: 'Rouge' },
  ],
  ...over,
});

describe('affichage des commandes', () => {
  it('numéro lisible, sans points de suspension', () => {
    expect(shortOrderNumber('abc123def456')).toBe('ABC123');
    expect(shortOrderNumber('ab')).toBe('AB');
  });

  it('étapes et barre de suivi', () => {
    const cases: Array<[OrderStatus, number | null, number]> = [['En attente', 1, 15], ['Prêt', 2, 50], ['Livré', 3, 100], ['Annulé', null, 0]];
    for (const [status, step, pct] of cases) {
      expect(statusStep(status), status).toBe(step);
      expect(progressPercent(status), status).toBe(pct);
    }
  });

  it('chaque état a une explication', () => {
    for (const s of ['En attente', 'Prêt', 'Livré', 'Annulé'] as OrderStatus[]) expect(STATUS_DESCRIPTIONS[s].length).toBeGreaterThan(10);
  });

  it('lignes: quantité, couleur et total par article (avant: ni quantité ni couleur)', () => {
    const lines = orderLines(order());
    expect(lines.map((l) => [l.name, l.quantity, l.options, l.total])).toEqual([['Modèle a', 3, 'Pointure 38 · Noir', 30000], ['Modèle b', 1, 'Pointure 40 · Rouge', 5000]]);
    expect(itemCount(order())).toBe(4);
  });

  it('totaux: valeurs enregistrées, ou recalcul pour une ancienne commande', () => {
    expect(orderTotals(order({ subtotal: 35000, discount: 3500, total: 31500 }))).toEqual({ subtotal: 35000, discount: 3500, total: 31500 });
    expect(orderTotals(order({ total: 35000 }))).toEqual({ subtotal: 35000, discount: 0, total: 35000 });
    expect(orderTotals(order({ total: 31500 }))).toEqual({ subtotal: 35000, discount: 3500, total: 31500 });
  });

  it('commande sans articles: pas d’erreur', () => {
    expect(orderLines(order({ items: undefined as any }))).toEqual([]);
    expect(itemCount(order({ items: undefined as any }))).toBe(0);
  });
});
