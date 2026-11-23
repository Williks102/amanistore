import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeFirestore } from '@/test/fake-firestore';

const h = vi.hoisted(() => ({
  db: null as any,
  uid: 'client-uid' as string | null,
  roleOk: true,
  allowRate: true,
}));

vi.mock('@/firebase/admin', () => ({ get adminDb() { return h.db; } }));
vi.mock('firebase-admin/firestore', () => ({ FieldValue: { serverTimestamp: () => '__SERVER_TS__' } }));
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
  createProduct, deleteProduct, getOrders, getPromoCodes, validatePromoCode,
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
