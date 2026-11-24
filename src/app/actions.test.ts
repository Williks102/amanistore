import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeFirestore } from '@/test/fake-firestore';

const h = vi.hoisted(() => ({
  db: null as any,
  uid: 'client-uid' as string | null,
  roleOk: true,
  allowRate: true,
  rateActions: [] as string[],
}));

vi.mock('@/firebase/admin', () => ({ get adminDb() { return h.db; } }));
vi.mock('firebase-admin/firestore', () => ({ FieldValue: { serverTimestamp: () => '__SERVER_TS__', delete: () => '__DELETE__' } }));
vi.mock('@/ai/flows/shoe-style-recommendation', () => ({ getShoeRecommendations: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: async (action: string) => { h.rateActions.push(action); return h.allowRate; } }));
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
  createProduct, updateProduct, deleteProduct, getOrders, getPromoCodes, validatePromoCode, getOrderByCodeForValidation,
  createPromoCode, getContactMessages, deleteContactMessage, getGuestOrder, claimGuestOrders,
  previewColorNormalization, applyColorNormalization,
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
  h.rateActions = [];
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
  it('refuse un jeton invalide (jamais traité comme un invité) et n’écrit rien', async () => {
    h.uid = null;
    const r = await createOrder('jeton-invalide', { ...customer, items: [line()] });
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

describe('validation des produits (serveur)', () => {
  beforeEach(() => { h.roleOk = true; });

  it('createProduct refuse prix absurde, pointure invalide, couleur inconnue', async () => {
    expect((await createProduct('tok', { ...shoe, price: 7000022 } as any)).success).toBe(false);
    expect((await createProduct('tok', { ...shoe, availableSizes: [36, 3637] } as any)).error).toMatch(/3637/);
    expect((await createProduct('tok', { ...shoe, availableColors: [{ name: 'Turquoise', hex: '#0ff' }] } as any)).error).toMatch(/Turquoise/);
    expect(db.all('shoes').filter(([id]) => id.startsWith('shoes-'))).toHaveLength(0);
  });

  it('createProduct normalise les couleurs connues', async () => {
    const r = await createProduct('tok', { ...shoe, availableColors: [{ name: 'noire', hex: '#000000' }, { name: 'Maron', hex: '#f59105' }] } as any);
    expect(r.success).toBe(true);
    const created = db.all('shoes').find(([id]) => id.startsWith('shoes-'))![1];
    expect(created.availableColors).toEqual([{ name: 'Noir', hex: '#1C1B1A' }, { name: 'Marron', hex: '#6B4423' }]);
  });

  it('updateProduct valide seulement les champs envoyés', async () => {
    expect((await updateProduct('tok', 'shoe1', { description: 'Nouvelle description' })).success).toBe(true);
    expect((await updateProduct('tok', 'shoe1', { price: 5 })).success).toBe(false);
    expect(db.get('shoes', 'shoe1')!.price).toBe(10000);
    expect((await updateProduct('tok', 'shoe1', { availableColors: [{ name: 'Bleue- nuit', hex: '#000' }] })).success).toBe(true);
    expect(db.get('shoes', 'shoe1')!.availableColors).toEqual([{ name: 'Bleu nuit', hex: '#14213D' }]);
  });
});

describe('normalisation des couleurs du catalogue', () => {
  beforeEach(() => {
    h.roleOk = true;
    db.seed('shoes', 'messy', { ...shoe, name: 'Sale', availableColors: [{ name: 'noir', hex: '#000' }, { name: 'Noire', hex: '#262626' }] });
    db.seed('shoes', 'unknown', { ...shoe, name: 'Inconnue', availableColors: [{ name: 'Turquoise', hex: '#0ff' }, { name: 'maron', hex: '#f59105' }] });
  });

  it('aperçu: liste les changements sans rien écrire', async () => {
    const before = db.writes.length;
    const r = await previewColorNormalization('tok');
    expect(db.writes.length).toBe(before);
    const messy = r.items.find((i) => i.id === 'messy')!;
    expect(messy.before).toEqual(['noir', 'Noire']);
    expect(messy.after).toEqual(['Noir']);
    expect(r.items.find((i) => i.id === 'unknown')!.unmapped).toEqual(['Turquoise']);
    // « Noir » avec un code différent de la palette (#000 au lieu de #1C1B1A): nom correct mais code à normaliser aussi
    expect(r.items.some((i) => i.id === 'shoe1')).toBe(true);
  });

  it('application: corrige les produits sûrs, saute ceux avec une couleur inconnue', async () => {
    const r = await applyColorNormalization('tok');
    expect(r.success).toBe(true);
    expect(r.skipped.map((s) => s.id)).toEqual(['unknown']);
    expect(db.get('shoes', 'messy')!.availableColors).toEqual([{ name: 'Noir', hex: '#1C1B1A' }]);
    expect(db.get('shoes', 'unknown')!.availableColors[0].name).toBe('Turquoise'); // intact
    expect(db.get('shoes', 'unknown')!.availableColors[1].name).toBe('maron');
  });

  it('refusées sans le rôle produit', async () => {
    h.roleOk = false;
    expect((await previewColorNormalization('tok')).items).toEqual([]);
    const r = await applyColorNormalization('tok');
    expect(r.success).toBe(false);
    expect(db.get('shoes', 'messy')!.availableColors[0].name).toBe('noir');
  });
});

describe('createOrder: prix invalide et couleurs historiques', () => {
  it('refuse un produit au prix absurde', async () => {
    db.seed('shoes', 'bad', { ...shoe, price: 7000022 });
    const r = await createOrder('tok', { ...customer, items: [line({ productId: 'bad' })] });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/indisponible/);
    expect(db.all('orders')).toHaveLength(0);
  });

  it('accepte un panier ancien dont la couleur a été normalisée depuis', async () => {
    db.seed('shoes', 'norm', { ...shoe, availableColors: [{ name: 'Noir', hex: '#1C1B1A' }] });
    const r = await createOrder('tok', { ...customer, items: [line({ productId: 'norm', color: 'noire' })] });
    expect(r.success).toBe(true);
  });
});

describe('commande sans compte (invité)', () => {
  beforeEach(() => { h.uid = null; });
  const guestOrder = (over: Record<string, any> = {}) => createOrder(null, { ...customer, items: [line()], ...over });

  it('accepte un invité: userId vide, marqué invité, secret renvoyé et stocké', async () => {
    const r = await guestOrder();
    expect(r.success).toBe(true);
    expect(r.guestSecret).toMatch(/^[a-f0-9]{32}$/);
    const o = lastOrder();
    expect(o.userId).toBe('');
    expect(o.guest).toBe(true);
    expect(o.guestSecret).toBe(r.guestSecret);
    expect(o.status).toBe('En attente');
    expect(o.total).toBe(20000); // prix lus en base, comme pour un compte
  });

  it('un jeton vide est aussi un invité', async () => {
    expect((await createOrder('', { ...customer, items: [line()] })).success).toBe(true);
  });

  it('un client connecté n’a ni secret ni marque d’invité', async () => {
    h.uid = 'client-uid';
    const r = await createOrder('tok', { ...customer, items: [line()] });
    expect(r.guestSecret).toBeUndefined();
    expect(lastOrder()).not.toHaveProperty('guest');
    expect(lastOrder().userId).toBe('client-uid');
  });

  it('limite de débit plus stricte et séparée de celle des comptes', async () => {
    await guestOrder();
    expect(h.rateActions).toContain('create-order-guest');
    expect(h.rateActions).not.toContain('create-order');
    h.allowRate = false;
    const blocked = await guestOrder();
    expect(blocked.success).toBe(false);
  });

  it('piège anti-robot: un champ invisible rempli = refus, rien d’écrit', async () => {
    const r = await guestOrder({ website: 'http://spam.example' });
    expect(r.success).toBe(false);
    expect(db.all('orders')).toHaveLength(0);
  });

  it('refuse au-delà de 3 commandes en attente avec le même numéro', async () => {
    for (let i = 0; i < 3; i++) db.seed('orders', `old${i}`, { customerPhone: customer.phone, status: 'En attente', userId: '' });
    db.seed('orders', 'done', { customerPhone: customer.phone, status: 'Livré', userId: '' }); // ne compte pas
    const r = await guestOrder();
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/en attente/);
    expect(db.all('orders')).toHaveLength(4);
  });

  it('accepte tant qu’il reste de la place (2 en attente)', async () => {
    for (let i = 0; i < 2; i++) db.seed('orders', `old${i}`, { customerPhone: customer.phone, status: 'En attente', userId: '' });
    expect((await guestOrder()).success).toBe(true);
  });

  it('applique les mêmes contrôles de stock et de promo', async () => {
    db.seed('shoes', 'rare', { ...shoe, stock: { '39': 1 } });
    const r = await guestOrder({ items: [line({ productId: 'rare', size: 39, quantity: 2 })] });
    expect(r.success).toBe(false);
    expect(db.all('orders')).toHaveLength(0);
  });
});

describe('getGuestOrder', () => {
  const SECRET = 'a'.repeat(32);
  beforeEach(() => {
    db.seed('orders', 'guestOrder1', { userId: '', guest: true, guestSecret: SECRET, validationCode: '123456', total: 5, status: 'En attente', customerName: 'Awa' });
    db.seed('orders', 'normalOrder1', { userId: 'u1', validationCode: '654321', total: 9, status: 'En attente' });
  });

  it('renvoie la commande avec le bon secret, sans jamais exposer le secret', async () => {
    const r = await getGuestOrder('guestOrder1', SECRET);
    expect(r.order?.validationCode).toBe('123456');
    expect(r.order).not.toHaveProperty('guestSecret');
  });

  it('refuse un mauvais secret, un secret mal formé, un identifiant inconnu', async () => {
    for (const [id, secret] of [['guestOrder1', 'b'.repeat(32)], ['guestOrder1', 'court'], ['guestOrder1', SECRET.toUpperCase()], ['inconnu123', SECRET]]) {
      const r = await getGuestOrder(id, secret);
      expect(r.order, `${id}/${secret}`).toBeNull();
    }
  });

  it('ne donne pas accès à la commande d’un client connecté (pas de secret stocké)', async () => {
    const r = await getGuestOrder('normalOrder1', SECRET);
    expect(r.order).toBeNull();
  });

  it('respecte la limite de débit', async () => {
    h.allowRate = false;
    expect((await getGuestOrder('guestOrder1', SECRET)).order).toBeNull();
  });
});

describe('le secret des commandes d’invité ne fuit pas', () => {
  beforeEach(() => {
    db.seed('orders', 'g1', { userId: '', guest: true, guestSecret: 'c'.repeat(32), validationCode: '111111', total: 5, status: 'Prêt', date: '2026-01-01T00:00:00Z' });
  });

  it('getOrders (admin) et la recherche par code de livraison', async () => {
    h.roleOk = true;
    const all = await getOrders('tok');
    expect(all.find((o) => o.id === 'g1')).toBeTruthy();
    expect(all.every((o) => !('guestSecret' in o))).toBe(true);
    const byCode = await getOrderByCodeForValidation('tok', '111111');
    expect(byCode.order?.id).toBe('g1');
    expect(byCode.order).not.toHaveProperty('guestSecret');
  });
});

describe('rattachement des commandes d’invité au compte', () => {
  const SECRET = 'd'.repeat(32);
  const claim = (claims: unknown) => claimGuestOrders('tok', claims);
  beforeEach(() => {
    db.seed('orders', 'guest0001', { userId: '', guest: true, guestSecret: SECRET, validationCode: '111111', total: 5, status: 'En attente', date: '2026-01-01T00:00:00Z' });
    db.seed('orders', 'other0001', { userId: 'quelquun-d-autre', validationCode: '222222', total: 9, status: 'En attente', date: '2026-01-02T00:00:00Z' });
    db.seed('orders', 'mine00001', { userId: 'client-uid', validationCode: '333333', total: 7, status: 'En attente', date: '2026-01-03T00:00:00Z' });
  });

  it('avec le bon secret: la commande passe au compte, le secret est supprimé', async () => {
    const r = await claim([{ orderId: 'guest0001', secret: SECRET }]);
    expect(r).toMatchObject({ success: true, claimed: ['guest0001'], failed: 0 });
    const o = db.get('orders', 'guest0001')!;
    expect(o.userId).toBe('client-uid');
    expect(o.guestSecret).toBe('__DELETE__');
    expect(o.guest).toBe('__DELETE__');
    const mine = await getOrdersForUser('tok');
    expect(mine.orders?.map((x) => x.id).sort()).toEqual(['guest0001', 'mine00001']);
  });

  it('mauvais secret ou secret mal formé: refus, commande intacte', async () => {
    const r = await claim([{ orderId: 'guest0001', secret: 'e'.repeat(32) }]);
    expect(r).toMatchObject({ success: true, claimed: [], failed: 1 });
    expect((await claim([{ orderId: 'guest0001', secret: 'court' }])).success).toBe(false);
    expect(db.get('orders', 'guest0001')!.userId).toBe('');
    expect(db.get('orders', 'guest0001')!.guestSecret).toBe(SECRET);
  });

  it('la commande d’une autre personne ne peut pas être réclamée, même avec un secret inventé', async () => {
    const r = await claim([{ orderId: 'other0001', secret: SECRET }]);
    expect(r.claimed).toEqual([]);
    expect(r.failed).toBe(1);
    expect(db.get('orders', 'other0001')!.userId).toBe('quelquun-d-autre');
  });

  it('une commande déjà rattachée à la même cliente est confirmée (idempotent); inconnue = échec', async () => {
    const r = await claim([{ orderId: 'mine00001', secret: SECRET }, { orderId: 'inconnue01', secret: SECRET }]);
    expect(r.claimed).toEqual(['mine00001']);
    expect(r.failed).toBe(1);
  });

  it('deuxième réclamation par quelqu’un d’autre après rattachement: impossible', async () => {
    await claim([{ orderId: 'guest0001', secret: SECRET }]);
    h.uid = 'autre-compte';
    const r = await claim([{ orderId: 'guest0001', secret: SECRET }]);
    expect(r.claimed).toEqual([]);
    expect(db.get('orders', 'guest0001')!.userId).toBe('client-uid');
  });

  it('exige un jeton valide et respecte la limite de débit', async () => {
    h.uid = null;
    expect((await claim([{ orderId: 'guest0001', secret: SECRET }])).success).toBe(false);
    expect(db.get('orders', 'guest0001')!.userId).toBe('');
    h.uid = 'client-uid';
    h.allowRate = false;
    expect((await claim([{ orderId: 'guest0001', secret: SECRET }])).success).toBe(false);
  });

  it('plus de 10 réclamations d’un coup ou format invalide: refusé', async () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ orderId: `order${String(i).padStart(4, '0')}`, secret: SECRET }));
    expect((await claim(many)).success).toBe(false);
    expect((await claim('pas un tableau')).success).toBe(false);
  });
});
