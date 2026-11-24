import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeFirestore } from '@/test/fake-firestore';

const h = vi.hoisted(() => ({
  db: null as any,
  uid: 'client-uid' as string | null,
  roleOk: true,
  allowRate: true,
}));

vi.mock('@/firebase/admin', () => ({ get adminDb() { return h.db; } }));
vi.mock('firebase-admin/firestore', () => ({ FieldValue: { serverTimestamp: () => '__SERVER_TS__', delete: () => '__DELETE__' } }));
vi.mock('@/ai/flows/shoe-style-recommendation', () => ({ getShoeRecommendations: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: async () => h.allowRate }));
vi.mock('@/lib/server-auth', async () => {
  class AuthError extends Error {
    constructor(message = 'Accès refusé.') { super(message); this.name = 'AuthError'; }
  }
  return {
    AuthError,
    verifyToken: async () => { if (!h.uid) throw new AuthError('Authentification requise.'); return h.uid; },
    requireUser: async () => { if (!h.uid) throw new AuthError('Authentification requise.'); return h.uid; },
    requireRole: async () => { if (!h.uid || !h.roleOk) throw new AuthError('Accès refusé.'); return h.uid; },
    getRolesForUid: async () => ({ admin: false, productManager: false, orderManager: false }),
  };
});

import {
  createOrder, getOrdersForUser, validateOrderDelivery, updateOrderStatus,
  createProduct, updateProduct, deleteProduct, getOrders, getPromoCodes, validatePromoCode,
  createPromoCode, getContactMessages, deleteContactMessage,
} from './actions';

const shoe = {
  name: 'Sandale Awa', description: 'd', price: 10000, categoryId: 'c1', collectionIds: [],
  gridImage: { id: 'i', url: 'u', hint: 'h' }, availableSizes: [38, 39, 40],
  availableColors: [{ name: 'Noir', hex: '#000' }], detailImages: [],
};
const customer = { name: 'Awa Fall', phone: '770000000', email: 'awa@example.com', address: '12 rue de la Paix, Dakar' };
const line = (over: Record<string, any> = {}) => ({ productId: 'shoe1', quantity: 2, size: 39, color: 'Noir', ...over });

let db: FakeFirestore;
beforeEach(() => {
  db = new FakeFirestore();
  h.db = db;
  h.uid = 'client-uid';
  h.roleOk = true;
  h.allowRate = true;
  db.seed('shoes', 'shoe1', { ...shoe });
  db.seed('shoes', 'shoe2', { ...shoe, price: 5000 });
  db.seed('promoCodes', 'p10', { code: 'PROMO10', discountType: 'percentage', value: 10, isActive: true });
  db.seed('promoCodes', 'pfix', { code: 'FIXE500', discountType: 'fixed', value: 500, isActive: true });
  db.seed('promoCodes', 'pbig', { code: 'GROS', discountType: 'fixed', value: 999999, isActive: true });
  db.seed('promoCodes', 'p200', { code: 'DEUXCENT', discountType: 'percentage', value: 200, isActive: true });
  db.seed('promoCodes', 'poff', { code: 'OFF', discountType: 'percentage', value: 50, isActive: false });
});

const lastOrder = () => db.all('orders').at(-1)![1];

describe('createOrder', () => {
  it('refuse un utilisateur non connecté et n’écrit rien', async () => {
    h.uid = null;
    const r = await createOrder('', { ...customer, items: [line()] });
    expect(r.success).toBe(false);
    expect(db.all('orders')).toHaveLength(0);
  });

  it('calcule les prix depuis la base, jamais depuis le client', async () => {
    const tampered: any = {
      ...customer,
      items: [{ ...line(), price: 1, product: { price: 1 } }],
      total: 1, subtotal: 1, discount: 99999, status: 'Livré', validationCode: '000000', userId: 'someone-else',
    };
    const r = await createOrder('tok', tampered);
    expect(r.success).toBe(true);
    const o = lastOrder();
    expect(o.subtotal).toBe(20000);
    expect(o.total).toBe(20000);
    expect(o.discount).toBe(0);
    expect(o.status).toBe('En attente');
    expect(o.userId).toBe('client-uid');
    expect(o.validationCode).not.toBe('000000');
    expect(o.items[0].product.price).toBe(10000);
    expect(o.date).toBe('__SERVER_TS__');
  });

  it('additionne plusieurs produits', async () => {
    await createOrder('tok', { ...customer, items: [line(), line({ productId: 'shoe2', quantity: 3 })] });
    expect(lastOrder().total).toBe(10000 * 2 + 5000 * 3);
  });

  it('génère un code de livraison à 6 chiffres et le retourne', async () => {
    const r = await createOrder('tok', { ...customer, items: [line()] });
    expect(r.validationCode).toMatch(/^\d{6}$/);
    expect(lastOrder().validationCode).toBe(r.validationCode);
  });

  it('applique un code promo en pourcentage (insensible à la casse)', async () => {
    await createOrder('tok', { ...customer, promoCode: 'promo10', items: [line()] });
    expect(lastOrder().discount).toBe(2000);
    expect(lastOrder().total).toBe(18000);
  });

  it('applique un code promo à montant fixe', async () => {
    await createOrder('tok', { ...customer, promoCode: 'FIXE500', items: [line()] });
    expect(lastOrder().total).toBe(19500);
  });

  it('plafonne la remise: jamais de total négatif', async () => {
    await createOrder('tok', { ...customer, promoCode: 'GROS', items: [line()] });
    expect(lastOrder().total).toBe(0);
    expect(lastOrder().discount).toBe(20000);
  });

  it('borne un pourcentage à 100', async () => {
    await createOrder('tok', { ...customer, promoCode: 'DEUXCENT', items: [line()] });
    expect(lastOrder().total).toBe(0);
  });

  it('refuse un code promo inactif ou inconnu', async () => {
    for (const code of ['OFF', 'INCONNU']) {
      const r = await createOrder('tok', { ...customer, promoCode: code, items: [line()] });
      expect(r.success).toBe(false);
    }
    expect(db.all('orders')).toHaveLength(0);
  });

  it('refuse produit inexistant, taille ou couleur indisponibles', async () => {
    for (const bad of [line({ productId: 'nope' }), line({ size: 99 }), line({ color: 'Rose' })]) {
      const r = await createOrder('tok', { ...customer, items: [bad] });
      expect(r.success).toBe(false);
    }
    expect(db.all('orders')).toHaveLength(0);
  });

  it('refuse quantités invalides et panier vide', async () => {
    for (const items of [[line({ quantity: 0 })], [line({ quantity: 21 })], [line({ quantity: 1.5 })], [line({ quantity: -1 })], []]) {
      const r = await createOrder('tok', { ...customer, items });
      expect(r.success).toBe(false);
    }
  });

  it('refuse des coordonnées invalides', async () => {
    for (const bad of [{ name: 'A' }, { phone: '123' }, { address: 'court' }, { email: 'pas-un-email' }]) {
      const r = await createOrder('tok', { ...customer, ...bad, items: [line()] });
      expect(r.success).toBe(false);
    }
  });

  it('respecte la limite de débit', async () => {
    h.allowRate = false;
    const r = await createOrder('tok', { ...customer, items: [line()] });
    expect(r.success).toBe(false);
    expect(db.all('orders')).toHaveLength(0);
  });
});

describe('getOrdersForUser', () => {
  it('ne retourne que les commandes de l’UID du jeton (pas d’IDOR)', async () => {
    db.seed('orders', 'o1', { userId: 'client-uid', total: 1 });
    db.seed('orders', 'o2', { userId: 'victime', total: 2 });
    const r = await getOrdersForUser('tok');
    expect(r.orders?.map((o) => o.id)).toEqual(['o1']);
  });

  it('refuse sans jeton valide', async () => {
    h.uid = null;
    const r = await getOrdersForUser('');
    expect(r.orders).toBeNull();
    expect(r.error).toBeTruthy();
  });
});

describe('actions réservées au personnel', () => {
  beforeEach(() => {
    h.roleOk = false; // utilisateur connecté mais sans le rôle requis
    db.seed('orders', 'o1', { userId: 'x', status: 'Prêt', total: 5, validationCode: '123456' });
  });

  it('refusent sans le rôle et n’écrivent rien', async () => {
    const before = db.writes.length;
    expect((await createProduct('tok', shoe as any)).success).toBe(false);
    expect((await deleteProduct('tok', 'shoe1')).success).toBe(false);
    expect((await updateOrderStatus('tok', 'o1', 'Livré')).success).toBe(false);
    expect((await validateOrderDelivery('tok', 'o1')).success).toBe(false);
    expect(db.writes.length).toBe(before);
    expect(db.all('shoes')).toHaveLength(2);
    expect(db.data.get('orders')!.get('o1')!.status).toBe('Prêt');
  });

  it('getOrders et getPromoCodes ne divulguent rien sans le rôle', async () => {
    expect(await getOrders('tok')).toEqual([]);
    expect(await getPromoCodes('tok')).toEqual([]);
  });

  it('avec le rôle: la livraison est validée une seule fois', async () => {
    h.roleOk = true;
    expect((await validateOrderDelivery('tok', 'o1')).success).toBe(true);
    expect(db.data.get('orders')!.get('o1')!.status).toBe('Livré');
    expect((await validateOrderDelivery('tok', 'o1')).success).toBe(false);
  });

  it('refuse un statut de commande inconnu', async () => {
    h.roleOk = true;
    const r = await updateOrderStatus('tok', 'o1', 'Hacked' as any);
    expect(r.success).toBe(false);
  });
});

describe('validatePromoCode (public)', () => {
  it('valide un code actif et refuse inactif / inconnu', async () => {
    expect((await validatePromoCode('promo10')).success).toBe(true);
    expect((await validatePromoCode('OFF')).success).toBe(false);
    expect((await validatePromoCode('XXX')).success).toBe(false);
  });

  it('refuse des entrées invalides ou au-delà de la limite de débit', async () => {
    expect((await validatePromoCode('')).success).toBe(false);
    expect((await validatePromoCode('A'.repeat(51))).success).toBe(false);
    h.allowRate = false;
    expect((await validatePromoCode('PROMO10')).success).toBe(false);
  });
});

describe('codes promo avancés (createOrder)', () => {
  const place = (promoCode: string, items = [line()]) => createOrder('tok', { ...customer, promoCode, items });

  it('refuse un code expiré, mais accepte un code qui expire plus tard', async () => {
    db.seed('promoCodes', 'pexp', { code: 'EXPIRE', discountType: 'percentage', value: 10, isActive: true, expiresAt: '2020-01-01T00:00:00Z' });
    db.seed('promoCodes', 'pfut', { code: 'FUTUR', discountType: 'percentage', value: 10, isActive: true, expiresAt: '2999-01-01T00:00:00Z' });
    const expired = await place('EXPIRE');
    expect(expired.success).toBe(false);
    expect(expired.error).toMatch(/expiré/);
    expect((await place('FUTUR')).success).toBe(true);
  });

  it('respecte la limite d’utilisation et incrémente le compteur', async () => {
    db.seed('promoCodes', 'p2x', { code: 'DEUXFOIS', discountType: 'fixed', value: 100, isActive: true, maxUses: 2, usedCount: 0 });
    expect((await place('DEUXFOIS')).success).toBe(true);
    expect(db.get('promoCodes', 'p2x')!.usedCount).toBe(1);
    expect((await place('DEUXFOIS')).success).toBe(true);
    const third = await place('DEUXFOIS');
    expect(third.success).toBe(false);
    expect(third.error).toMatch(/limite/);
    expect(db.get('promoCodes', 'p2x')!.usedCount).toBe(2);
    expect(db.all('orders')).toHaveLength(2);
  });

  it('exige le montant minimum (sous-total avant remise)', async () => {
    db.seed('promoCodes', 'pmin', { code: 'GROSPANIER', discountType: 'fixed', value: 1000, isActive: true, minOrderAmount: 30000 });
    const r = await place('GROSPANIER'); // sous-total 20000
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/minimum/);
    expect((await place('GROSPANIER', [line({ quantity: 3 })])).success).toBe(true); // 30000
  });

  it('mémorise le code utilisé dans la commande', async () => {
    await place('PROMO10');
    expect(lastOrder().promoCode).toBe('PROMO10');
    expect(lastOrder().promoCodeId).toBe('p10');
  });
});

describe('stock', () => {
  beforeEach(() => {
    db.seed('shoes', 'tracked', { ...shoe, price: 8000, stock: { '38': 3, '39': 1, '40': 0 } });
  });
  const buy = (items: any[]) => createOrder('tok', { ...customer, items });
  const stockOf = () => db.get('shoes', 'tracked')!.stock;

  it('décrémente le stock de la pointure commandée', async () => {
    expect((await buy([line({ productId: 'tracked', size: 38, quantity: 2 })])).success).toBe(true);
    expect(stockOf()).toEqual({ '38': 1, '39': 1, '40': 0 });
  });

  it('refuse une pointure épuisée ou absente de la table', async () => {
    const soldOut = await buy([line({ productId: 'tracked', size: 40 })]);
    expect(soldOut.success).toBe(false);
    expect(soldOut.error).toMatch(/épuisé/);
    db.seed('shoes', 'tracked', { ...shoe, stock: { '38': 3 } }); // 39 absent => 0
    expect((await buy([line({ productId: 'tracked', size: 39 })])).success).toBe(false);
  });

  it('refuse une quantité supérieure au stock et n’écrit rien', async () => {
    const r = await buy([line({ productId: 'tracked', size: 38, quantity: 4 })]);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/3 restant/);
    expect(stockOf()).toEqual({ '38': 3, '39': 1, '40': 0 });
    expect(db.all('orders')).toHaveLength(0);
  });

  it('additionne les lignes de même pointure (couleurs différentes)', async () => {
    db.seed('shoes', 'tracked', { ...shoe, stock: { '38': 3 }, availableColors: [{ name: 'Noir', hex: '#000' }, { name: 'Blanc', hex: '#fff' }] });
    const r = await buy([
      line({ productId: 'tracked', size: 38, quantity: 2, color: 'Noir' }),
      line({ productId: 'tracked', size: 38, quantity: 2, color: 'Blanc' }),
    ]);
    expect(r.success).toBe(false); // 4 demandés pour 3 en stock
    expect(db.all('orders')).toHaveLength(0);
  });

  it('ne touche pas aux produits sans suivi de stock', async () => {
    await buy([line({ productId: 'shoe1', quantity: 5 })]);
    expect(db.get('shoes', 'shoe1')!.stock).toBeUndefined();
  });

  it('rien n’est écrit si une ligne échoue (commande multi-produits)', async () => {
    const r = await buy([line({ productId: 'tracked', size: 38 }), line({ productId: 'tracked', size: 40 })]);
    expect(r.success).toBe(false);
    expect(stockOf()).toEqual({ '38': 3, '39': 1, '40': 0 });
    expect(db.writes.filter((w) => w.collection === 'shoes')).toHaveLength(0);
  });

  it('annulation: le stock et le code promo sont restitués, une seule fois', async () => {
    db.seed('promoCodes', 'p3', { code: 'TROIS', discountType: 'fixed', value: 100, isActive: true, maxUses: 3, usedCount: 0 });
    const r = await createOrder('tok', { ...customer, promoCode: 'TROIS', items: [line({ productId: 'tracked', size: 38, quantity: 2 })] });
    expect(stockOf()['38']).toBe(1);
    expect(db.get('promoCodes', 'p3')!.usedCount).toBe(1);

    h.roleOk = true;
    expect((await updateOrderStatus('tok', r.orderId!, 'Annulé')).success).toBe(true);
    expect(stockOf()['38']).toBe(3);
    expect(db.get('promoCodes', 'p3')!.usedCount).toBe(0);
    expect(db.get('orders', r.orderId!)!.status).toBe('Annulé');

    // Idempotent: ré-annuler ne restitue pas deux fois
    await updateOrderStatus('tok', r.orderId!, 'Annulé');
    expect(stockOf()['38']).toBe(3);
  });

  it('une commande annulée ne peut pas être rouverte', async () => {
    const r = await buy([line({ productId: 'tracked', size: 38 })]);
    h.roleOk = true;
    await updateOrderStatus('tok', r.orderId!, 'Annulé');
    const reopen = await updateOrderStatus('tok', r.orderId!, 'Prêt');
    expect(reopen.success).toBe(false);
    expect(db.get('orders', r.orderId!)!.status).toBe('Annulé');
  });

  it('les autres changements de statut ne touchent pas au stock', async () => {
    const r = await buy([line({ productId: 'tracked', size: 38 })]);
    h.roleOk = true;
    await updateOrderStatus('tok', r.orderId!, 'Prêt');
    expect(stockOf()['38']).toBe(1); // 3 en stock - 2 commandés, inchangé par le statut
  });

  it('updateProduct: stock null supprime le suivi, un stock est nettoyé', async () => {
    h.roleOk = true;
    await updateProduct('tok', 'tracked', { stock: null });
    expect(db.get('shoes', 'tracked')!.stock).toBe('__DELETE__');
    await updateProduct('tok', 'shoe1', { stock: { '39': 4, '40': -2, '41': 1.5, abc: 3 } as any });
    expect(db.get('shoes', 'shoe1')!.stock).toEqual({ '39': 4 });
  });
});

describe('coup de cœur (featured)', () => {
  it('createProduct ne garde que des booléens', async () => {
    h.roleOk = true;
    await createProduct('tok', { ...shoe, featured: true } as any);
    await createProduct('tok', { ...shoe, featured: 'oui' } as any);
    const rows = db.all('shoes').filter(([id]) => id.startsWith('shoes-'));
    expect(rows[0][1].featured).toBe(true);
    expect(rows[1][1]).not.toHaveProperty('featured');
  });

  it('updateProduct active et désactive, ignore les valeurs non booléennes', async () => {
    h.roleOk = true;
    await updateProduct('tok', 'shoe1', { featured: true });
    expect(db.get('shoes', 'shoe1')!.featured).toBe(true);
    await updateProduct('tok', 'shoe1', { featured: 'x' as any, name: 'Nouveau nom' });
    expect(db.get('shoes', 'shoe1')!.featured).toBe(true); // inchangé
    await updateProduct('tok', 'shoe1', { featured: false });
    expect(db.get('shoes', 'shoe1')!.featured).toBe(false);
  });

  it('refusé sans rôle produit', async () => {
    h.roleOk = false;
    const r = await updateProduct('tok', 'shoe1', { featured: true });
    expect(r.success).toBe(false);
    expect(db.get('shoes', 'shoe1')!.featured).toBeUndefined();
  });
});

describe('createPromoCode (admin)', () => {
  const promo = { code: 'nouveau', discountType: 'percentage' as const, value: 15, isActive: true };

  it('crée un code en majuscules avec compteur à 0', async () => {
    h.roleOk = true;
    const r = await createPromoCode('tok', { ...promo, maxUses: 10, minOrderAmount: 5000, expiresAt: '2030-01-01T00:00:00Z' } as any);
    expect(r.success).toBe(true);
    const created = db.all('promoCodes').find(([, d]) => d.code === 'NOUVEAU')![1];
    expect(created).toMatchObject({ usedCount: 0, maxUses: 10, minOrderAmount: 5000 });
  });

  it('refuse sans rôle admin et les valeurs incohérentes', async () => {
    h.roleOk = false;
    expect((await createPromoCode('tok', promo as any)).success).toBe(false);
    h.roleOk = true;
    for (const bad of [{ value: 150 }, { value: 0 }, { maxUses: 0 }, { expiresAt: 'demain' }, { code: 'A' }, { minOrderAmount: -1 }]) {
      expect((await createPromoCode('tok', { ...promo, ...bad } as any)).success, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('validatePromoCode avec règles avancées', () => {
  it('refuse expiré / épuisé / sous le minimum et ne divulgue pas usedCount', async () => {
    db.seed('promoCodes', 'pe', { code: 'VIEUX', discountType: 'fixed', value: 1, isActive: true, expiresAt: '2020-01-01T00:00:00Z' });
    db.seed('promoCodes', 'pu', { code: 'PLUS', discountType: 'fixed', value: 1, isActive: true, maxUses: 1, usedCount: 1 });
    db.seed('promoCodes', 'pm', { code: 'MIN', discountType: 'fixed', value: 1, isActive: true, minOrderAmount: 10000, usedCount: 4 });
    expect((await validatePromoCode('VIEUX')).success).toBe(false);
    expect((await validatePromoCode('PLUS')).success).toBe(false);
    expect((await validatePromoCode('MIN', 5000)).success).toBe(false);
    const ok = await validatePromoCode('MIN', 20000);
    expect(ok.success).toBe(true);
    expect(ok.promoCode).not.toHaveProperty('usedCount');
  });
});

describe('messages de contact (admin)', () => {
  beforeEach(() => {
    db.seed('contactMessages', 'm1', { name: 'A', email: 'a@x.com', subject: 's', message: 'ancien', createdAt: '2026-01-01T00:00:00Z' });
    db.seed('contactMessages', 'm2', { name: 'B', email: 'b@x.com', subject: 's', message: 'récent', createdAt: '2026-02-01T00:00:00Z' });
  });

  it('refusés sans le rôle admin', async () => {
    h.roleOk = false;
    expect(await getContactMessages('tok')).toEqual([]);
    expect((await deleteContactMessage('tok', 'm1')).success).toBe(false);
    expect(db.all('contactMessages')).toHaveLength(2);
  });

  it('admin: liste du plus récent au plus ancien, suppression', async () => {
    h.roleOk = true;
    expect((await getContactMessages('tok')).map((m) => m.id)).toEqual(['m2', 'm1']);
    expect((await deleteContactMessage('tok', 'm1')).success).toBe(true);
    expect(db.all('contactMessages')).toHaveLength(1);
  });
});
