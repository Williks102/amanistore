import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { planReorder } from './reorder';
import { listGuestOrders, removeGuestOrders, saveGuestOrder, getGuestSecret } from './guest-orders';
import type { CartItem, Shoe } from './types';

const shoe = (over: Partial<Shoe> = {}): Shoe => ({
  id: 's1', name: 'Escarpin', description: 'd', price: 65000, categoryId: 'c', collectionIds: [],
  gridImage: { id: 'i', url: 'u', hint: '' }, detailImages: [], availableSizes: [37, 38, 39],
  availableColors: [{ name: 'Noir', hex: '#1C1B1A' }], ...over,
});
const item = (over: Partial<CartItem> = {}, product: Shoe = shoe()): CartItem => ({ id: 'x', product, quantity: 2, size: 38, color: 'Noir', ...over });

describe('recommander', () => {
  it('article toujours disponible: ajouté tel quel, avec le produit à jour', () => {
    const fresh = shoe({ price: 70000 });
    const plan = planReorder([item()], [fresh]);
    expect(plan.skipped).toEqual([]);
    expect(plan.toAdd).toEqual([{ product: fresh, quantity: 2, selection: [{ name: 'Pointure', value: '38' }, { name: 'Couleur', value: 'Noir' }] }]);
  });

  it('modèle disparu ou au prix invalide: ignoré avec la raison', () => {
    expect(planReorder([item()], []).skipped[0].reason).toMatch(/plus disponible/);
    expect(planReorder([item()], [shoe({ price: 7000022 })]).skipped[0].reason).toMatch(/plus disponible/);
  });

  it('pointure ou couleur retirées: ignoré', () => {
    expect(planReorder([item({ size: 41 })], [shoe()]).skipped[0].reason).toMatch(/Pointure 41/);
    expect(planReorder([item({ color: 'Rouge' })], [shoe()]).skipped[0].reason).toMatch(/Couleur Rouge/);
  });

  it('ancienne écriture de la couleur reconnue (« noire » = « Noir »)', () => {
    const plan = planReorder([item({ color: 'noire' })], [shoe()]);
    expect(plan.toAdd[0].selection[1]).toEqual({ name: 'Couleur', value: 'Noir' });
  });

  it('stock: épuisé = ignoré, insuffisant = quantité réduite et signalée', () => {
    expect(planReorder([item()], [shoe({ stock: { '38': 0 } })]).skipped[0].reason).toMatch(/Pointure 38.*épuisé/);
    const plan = planReorder([item({ quantity: 5 })], [shoe({ stock: { '38': 2 } })]);
    expect(plan.toAdd[0].quantity).toBe(2);
    expect(plan.reduced).toEqual(['Escarpin']);
  });

  it('plafonne à 20 par ligne; mélange d’articles', () => {
    const other = shoe({ id: 's2', name: 'Mule' });
    const plan = planReorder([item({ quantity: 50 }), item({ id: 'y' }, other)], [shoe(), shoe({ id: 's9' })]);
    expect(plan.toAdd.map((a) => [a.product.id, a.quantity])).toEqual([['s1', 20]]);
    expect(plan.skipped.map((s) => s.name)).toEqual(['Mule']);
  });
});

describe('recommander avec attributs', () => {
  const opt = (name: string, values: string[], kind: 'text' | 'color' = 'text') => ({ attributeId: name, name, kind, values });
  const ring = (over: Partial<Shoe> = {}): Shoe => shoe({ id: 'r1', name: 'Bague', availableSizes: [], availableColors: [], options: [opt('Taille', ['52', '54']), opt('Matière', ['Doré', 'Argenté'])], ...over });
  const line = (selection: Array<{ name: string; value: string }>, over: Partial<CartItem> = {}): CartItem => ({ id: 'l', product: ring(), quantity: 1, selection, ...over });

  it('commande à attributs: remise au panier avec les valeurs du produit à jour', () => {
    const plan = planReorder([line([{ name: 'Taille', value: '54' }, { name: 'Matière', value: 'doré' }])], [ring()]);
    expect(plan.toAdd[0].selection).toEqual([{ name: 'Taille', value: '54' }, { name: 'Matière', value: 'Doré' }]);
  });
  it('valeur retirée: ignoré avec le nom de l’attribut', () => {
    const plan = planReorder([line([{ name: 'Taille', value: '56' }, { name: 'Matière', value: 'Doré' }])], [ring()]);
    expect(plan.skipped[0].reason).toMatch(/Taille 56/);
  });
  it('stock par combinaison: épuisé ignoré, insuffisant réduit', () => {
    const stocked = ring({ stockScope: 'combination', variantStock: { '54|dore': 2, '52|dore': 0 } });
    const sel = (t: string) => [{ name: 'Taille', value: t }, { name: 'Matière', value: 'Doré' }];
    expect(planReorder([line(sel('52'))], [stocked]).skipped[0].reason).toMatch(/Taille 52.*épuisé/);
    const plan = planReorder([line(sel('54'), { quantity: 5 })], [stocked]);
    expect(plan.toAdd[0].quantity).toBe(2);
    expect(plan.reduced).toEqual(['Bague']);
  });
  it('sac sans attribut', () => {
    const bag = shoe({ id: 'b1', name: 'Sac', availableSizes: [], availableColors: [], options: [], variantStock: { _: 1 } });
    const plan = planReorder([{ id: 'x', product: bag, quantity: 3, selection: [] }], [bag]);
    expect(plan.toAdd[0]).toMatchObject({ quantity: 1, selection: [] });
  });
});

describe('mémoire locale des commandes sans compte', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('enregistre, liste, oublie', () => {
    saveGuestOrder('o1', 'a'.repeat(32));
    saveGuestOrder('o2', 'b'.repeat(32));
    expect(listGuestOrders().map((o) => o.orderId)).toEqual(['o1', 'o2']);
    expect(getGuestSecret('o1')).toBe('a'.repeat(32));
    removeGuestOrders(['o1']);
    expect(listGuestOrders().map((o) => o.orderId)).toEqual(['o2']);
    expect(getGuestSecret('o1')).toBeNull();
  });

  it('garde les 10 plus récentes seulement', () => {
    for (let i = 0; i < 13; i++) saveGuestOrder(`o${i}`, 'c'.repeat(32));
    const ids = listGuestOrders().map((o) => o.orderId);
    expect(ids).toHaveLength(10);
    expect(ids[0]).toBe('o3');
    expect(ids[9]).toBe('o12');
  });

  it('stockage corrompu ou indisponible: pas d’erreur', () => {
    store.set('amani:guest-orders', '{pas du json');
    expect(listGuestOrders()).toEqual([]);
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('bloqué'); }, setItem: () => { throw new Error('bloqué'); } });
    expect(() => saveGuestOrder('x', 'd'.repeat(32))).not.toThrow();
    expect(listGuestOrders()).toEqual([]);
  });
});
