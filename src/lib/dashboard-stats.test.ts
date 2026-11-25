import { describe, it, expect } from 'vitest';
import { ageLabel, comparePeriod, computeDashboard, dailyOrders, percentChange, promoStats, stockAlerts, topProducts } from './dashboard-stats';
import type { Order, OrderStatus, PromoCode, Shoe } from './types';

const NOW = new Date('2026-11-24T12:00:00Z');
const daysAgo = (n: number, hour = 10) => new Date(Date.UTC(2026, 10, 24 - n, hour)).toISOString();

const shoe = (id: string, over: Partial<Shoe> = {}): Shoe => ({
  id, name: `Modèle ${id}`, description: 'Un joli modèle', price: 10000, categoryId: 'c1', collectionIds: [],
  gridImage: { id: 'g', url: 'u', hint: '' }, detailImages: [{ id: 'd', url: 'u', hint: '' }],
  availableSizes: [38, 39, 40], availableColors: [{ name: 'Noir', hex: '#1C1B1A' }], ...over,
});
let seq = 0;
const order = (daysBack: number, total: number, status: OrderStatus = 'En attente', over: Partial<Order> = {}): Order => ({
  id: `o${++seq}`, userId: 'u1', customerName: 'A', customerPhone: '770000000', customerAddress: 'Dakar', date: daysAgo(daysBack),
  status, validationCode: '123456', total,
  items: [{ id: 'i', product: shoe('s1', { price: total }), quantity: 1, size: 38, color: 'Noir' }], ...over,
});

describe('variations', () => {
  it('pourcentage, et null quand il n’y avait rien avant', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(100, 100)).toBe(0);
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe('périodes', () => {
  const orders = [
    order(1, 10000, 'Livré'), order(3, 20000, 'En attente'), order(6, 30000, 'Prêt'), // dans les 7 derniers jours
    order(8, 5000, 'Livré'), order(13, 15000, 'En attente'),                            // les 7 jours d'avant
    order(2, 99999, 'Annulé'),                                                          // annulée: jamais comptée
    order(40, 7777, 'Livré'),                                                           // hors des deux périodes de 7 jours
  ];

  it('compte les commandes, le chiffre d’affaires et le panier moyen (hors annulées)', () => {
    const w = comparePeriod(orders, 7, NOW);
    expect(w.current).toEqual({ orders: 3, revenue: 60000, average: 20000, delivered: 1 });
    expect(w.previous).toEqual({ orders: 2, revenue: 20000, average: 10000, delivered: 1 });
    expect(w.ordersDelta).toBe(50);
    expect(w.revenueDelta).toBe(200);
  });

  it('période sans commande: moyenne à 0, variation inconnue', () => {
    const w = comparePeriod([], 7, NOW);
    expect(w.current).toEqual({ orders: 0, revenue: 0, average: 0, delivered: 0 });
    expect(w.ordersDelta).toBeNull();
  });

  it('bords: une commande à exactement 7 jours bascule dans la période précédente', () => {
    const edge = [order(7, 1000, 'Livré', { date: new Date(NOW.getTime() - 7 * 86400000).toISOString() })];
    const w = comparePeriod(edge, 7, NOW);
    expect(w.current.orders).toBe(0);
    expect(w.previous.orders).toBe(1);
  });

  it('30 jours', () => {
    const m = comparePeriod(orders, 30, NOW);
    expect(m.current.orders).toBe(5); // 3 + 2, annulée exclue; celle à 40 jours est dans la période précédente
    expect(m.previous.orders).toBe(1);
  });
});

describe('meilleures ventes', () => {
  const line = (id: string, name: string, price: number, quantity: number) => ({ id: `${id}-x`, product: shoe(id, { name, price }), quantity, size: 38, color: 'Noir' });
  const orders = [
    order(2, 0, 'Livré', { items: [line('a', 'Escarpin', 60000, 3), line('b', 'Mule', 40000, 1)] }),
    order(5, 0, 'En attente', { items: [line('a', 'Escarpin', 60000, 1)] }),
    order(50, 0, 'Livré', { items: [line('c', 'Ancien', 30000, 9)] }),
    order(1, 0, 'Annulé', { items: [line('b', 'Mule', 40000, 20)] }),
  ];

  it('cumule les quantités par produit sur 30 jours, sans les annulées', () => {
    expect(topProducts(orders, 30, NOW)).toEqual([
      { productId: 'a', name: 'Escarpin', quantity: 4, revenue: 240000 },
      { productId: 'b', name: 'Mule', quantity: 1, revenue: 40000 },
    ]);
  });

  it('depuis le début: inclut les anciennes commandes, trié par quantité', () => {
    expect(topProducts(orders, null, NOW).map((p) => [p.name, p.quantity])).toEqual([['Ancien', 9], ['Escarpin', 4], ['Mule', 1]]);
  });

  it('limite le nombre de lignes', () => {
    expect(topProducts(orders, null, NOW, 2)).toHaveLength(2);
  });
});

describe('courbe quotidienne', () => {
  it('14 jours, jours vides à zéro, annulées exclues, du plus ancien au plus récent', () => {
    const d = dailyOrders([order(0, 1), order(0, 1), order(3, 1), order(3, 1, 'Annulé'), order(30, 1)], 14, NOW);
    expect(d).toHaveLength(14);
    expect(d[13]).toEqual({ date: '2026-11-24', count: 2 });
    expect(d[10]).toEqual({ date: '2026-11-21', count: 1 });
    expect(d[0].date).toBe('2026-11-11');
    expect(d.reduce((n, x) => n + x.count, 0)).toBe(3);
  });
});

describe('ancienneté', () => {
  it('formules lisibles', () => {
    expect(ageLabel(daysAgo(0), NOW)).toBe("aujourd'hui");
    expect(ageLabel(daysAgo(1, 11), NOW)).toBe('hier');
    expect(ageLabel(daysAgo(4), NOW)).toBe('il y a 4 jours');
  });
});

describe('alertes de stock', () => {
  it('épuisé, pointures presque épuisées, stock non suivi', () => {
    const a = stockAlerts([
      shoe('rupture', { stock: { '38': 0, '39': 0 } }),
      shoe('bas', { name: 'Bas', stock: { '38': 2, '39': 10, '40': 1 } }),
      shoe('ok', { stock: { '38': 20, '39': 20, '40': 20 } }),
      shoe('libre'), // pas de stock suivi = illimité
    ]);
    expect(a.outOfStock.map((x) => x.id)).toEqual(['rupture']);
    expect(a.lowStock.map((x) => [x.name, x.label, x.quantity])).toEqual([['Bas', 'Pointure 40', 1], ['Bas', 'Pointure 38', 2]]);
    expect([a.tracked, a.untracked]).toEqual([3, 1]);
  });

  it('produits à attributs: combinaisons, quantité unique, stock partagé', () => {
    const a = stockAlerts([
      shoe('bague', { name: 'Bague', availableSizes: [], availableColors: [], options: [{ attributeId: 't', name: 'Taille', kind: 'text', values: ['52', '54'] }, { attributeId: 'm', name: 'Matière', kind: 'text', values: ['Doré'] }], stockScope: 'combination', variantStock: { '52|dore': 2, '54|dore': 9 } } as any),
      shoe('sac', { name: 'Sac', availableSizes: [], availableColors: [], options: [], variantStock: { _: 0 } } as any),
      shoe('sacok', { name: 'Sac ok', availableSizes: [], availableColors: [], options: [], variantStock: { _: 7 } } as any),
      shoe('libre2', { availableSizes: [], availableColors: [], options: [] } as any),
    ]);
    expect(a.outOfStock.map((x) => x.id)).toEqual(['sac']);
    expect(a.lowStock.map((x) => [x.name, x.label, x.quantity])).toEqual([['Bague', 'Taille 52 · Matière Doré', 2]]);
    expect([a.tracked, a.untracked]).toEqual([3, 1]);
  });

  it('une pointure absente de la table vaut 0', () => {
    expect(stockAlerts([shoe('x', { stock: { '38': 5 }, availableSizes: [38, 39] })]).outOfStock).toEqual([]); // 38 en stock
    expect(stockAlerts([shoe('y', { stock: {}, availableSizes: [38] })]).outOfStock.map((s) => s.id)).toEqual(['y']);
  });
});

describe('codes promo', () => {
  const promos: PromoCode[] = [
    { id: 'p1', code: 'PROMO10', discountType: 'percentage', value: 10, isActive: true, usedCount: 4, maxUses: 5, expiresAt: new Date(NOW.getTime() + 3 * 86400000).toISOString() },
    { id: 'p2', code: 'VIEUX', discountType: 'fixed', value: 500, isActive: true, usedCount: 1, expiresAt: '2025-01-01T00:00:00Z' },
    { id: 'p3', code: 'PLEIN', discountType: 'fixed', value: 500, isActive: true, usedCount: 5, maxUses: 5 },
    { id: 'p4', code: 'LIBRE', discountType: 'fixed', value: 500, isActive: false },
  ];
  const orders = [order(1, 0, 'Livré', { promoCodeId: 'p1', discount: 2000 }), order(2, 0, 'En attente', { promoCodeId: 'p1', discount: 500 }), order(3, 0, 'Annulé', { promoCodeId: 'p1', discount: 9999 })];

  it('utilisation, alertes d’expiration et de limite, remises accordées (hors annulées)', () => {
    const s = Object.fromEntries(promoStats(promos, orders, NOW).map((p) => [p.code, p]));
    expect(s.PROMO10).toMatchObject({ used: 4, expiresSoon: true, nearLimit: true, expired: false, ordersCount: 2, discountGiven: 2500 });
    expect(s.VIEUX).toMatchObject({ expired: true, expiresSoon: false });
    expect(s.PLEIN).toMatchObject({ nearLimit: false }); // limite atteinte: ce n'est plus « bientôt », c'est fini
    expect(s.LIBRE).toMatchObject({ used: 0, expired: false, nearLimit: false, ordersCount: 0 });
  });

  it('triés du plus utilisé au moins utilisé', () => {
    expect(promoStats(promos, orders, NOW).map((p) => p.code)).toEqual(['PLEIN', 'PROMO10', 'VIEUX', 'LIBRE']);
  });
});

describe('tableau de bord complet', () => {
  const shoes = [shoe('s1', { price: 10000 }), shoe('jamais', { name: 'Jamais vendu' }), shoe('sansdesc', { description: '' })];

  it('à traiter: les plus anciennes d’abord; messages de la semaine', () => {
    const d = computeDashboard({
      orders: [order(1, 1, 'En attente'), order(9, 1, 'En attente'), order(4, 1, 'Prêt'), order(2, 1, 'Livré')],
      shoes, categories: [{ id: 'c1', name: 'C', imageId: 'x' }], promoCodes: [], now: NOW,
      messages: [{ id: 'm1', name: 'A', email: 'a@x.fr', subject: 's', message: 'm', createdAt: daysAgo(2) }, { id: 'm2', name: 'B', email: 'b@x.fr', subject: 's', message: 'm', createdAt: daysAgo(20) }],
    });
    expect(d.toProcess.pending.map((o) => o.date)).toEqual([daysAgo(9), daysAgo(1)]);
    expect(d.toProcess.ready).toHaveLength(1);
    expect(d.toProcess.messagesThisWeek).toBe(1);
  });

  it('jamais commandés: seulement s’il y a eu des commandes', () => {
    const base = { shoes, categories: [], promoCodes: [], messages: [], now: NOW };
    expect(computeDashboard({ ...base, orders: [] }).neverOrdered).toEqual([]);
    expect(computeDashboard({ ...base, orders: [order(1, 1000, 'Annulé')] }).neverOrdered).toEqual([]); // annulée = aucune vente
    const d = computeDashboard({ ...base, orders: [order(1, 1000, 'Livré')] });
    expect(d.neverOrdered.map((s) => s.id)).toEqual(['jamais', 'sansdesc']);
  });

  it('canaux: invité (drapeau ou identifiant vide) contre compte, sur 30 jours, hors annulées', () => {
    const d = computeDashboard({
      orders: [order(1, 1, 'Livré', { guest: true, userId: '' }), order(2, 1, 'Livré', { userId: '' }), order(3, 1, 'Livré'), order(4, 1, 'Annulé', { guest: true, userId: '' }), order(45, 1, 'Livré', { guest: true, userId: '' })],
      shoes, categories: [], promoCodes: [], messages: [], now: NOW,
    });
    expect(d.channels).toEqual({ guest: 2, account: 1, total: 3, guestPercent: 67 });
  });

  it('catalogue: anomalies comptées', () => {
    const d = computeDashboard({ orders: [], shoes, categories: [{ id: 'c1', name: 'C', imageId: 'x' }], promoCodes: [], messages: [], now: NOW });
    expect(d.catalog).toEqual({ products: 3, categories: 1, issues: 1 }); // « sansdesc »
  });

  it('aucune donnée: tout à zéro, sans erreur', () => {
    const d = computeDashboard({ orders: [], shoes: [], categories: [], promoCodes: [], messages: [], now: NOW });
    expect(d.week.current.orders).toBe(0);
    expect(d.channels.guestPercent).toBeNull();
    expect(d.bestMonth).toEqual([]);
    expect(d.daily).toHaveLength(14);
  });
});
