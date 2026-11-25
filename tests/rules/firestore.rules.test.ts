import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, addDoc, query, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-amani-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'roles/admin1'), { admin: true });
    await setDoc(doc(db, 'roles/pm1'), { productManager: true });
    await setDoc(doc(db, 'roles/om1'), { orderManager: true });
    await setDoc(doc(db, 'shoes/s1'), { name: 'Sandale', price: 10000 });
    await setDoc(doc(db, 'attributes/at1'), { name: 'Pointure', kind: 'text', values: [{ label: '40' }] });
    await setDoc(doc(db, 'categories/c1'), { name: 'Sandales' });
    await setDoc(doc(db, 'collections/col1'), { name: 'Été' });
    await setDoc(doc(db, 'promoCodes/p1'), { code: 'PROMO10', value: 10, isActive: true });
    await setDoc(doc(db, 'users/alice'), { id: 'alice', email: 'alice@example.com' });
    await setDoc(doc(db, 'users/bob'), { id: 'bob', email: 'bob@example.com' });
    await setDoc(doc(db, 'orders/o-alice'), { userId: 'alice', total: 100, status: 'En attente', validationCode: '123456' });
    await setDoc(doc(db, 'orders/o-bob'), { userId: 'bob', total: 200, status: 'En attente', validationCode: '654321' });
    await setDoc(doc(db, 'contactMessages/m1'), { name: 'X', message: 'Salut' });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const as = (uid: string) => env.authenticatedContext(uid).firestore();

describe('attributs de produit', () => {
  it('ni lecture ni écriture pour les anonymes, clients et gestionnaires de commandes', async () => {
    for (const db of [anon(), as('alice'), as('om1')]) {
      await assertFails(getDoc(doc(db, 'attributes/at1')));
      await assertFails(getDocs(collection(db, 'attributes')));
      await assertFails(setDoc(doc(db, 'attributes/x'), { name: 'x' }));
      await assertFails(updateDoc(doc(db, 'attributes/at1'), { name: 'y' }));
      await assertFails(deleteDoc(doc(db, 'attributes/at1')));
    }
  });
  it('admin et productManager: lecture et écriture', async () => {
    await assertSucceeds(getDocs(collection(as('pm1'), 'attributes')));
    await assertSucceeds(setDoc(doc(as('pm1'), 'attributes/x'), { name: 'Taille' }));
    await assertSucceeds(updateDoc(doc(as('admin1'), 'attributes/at1'), { name: 'Pointure FR' }));
    await assertSucceeds(deleteDoc(doc(as('admin1'), 'attributes/x')));
  });
});

describe('catalogue (shoes, categories, collections)', () => {
  it('lecture publique', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'shoes/s1')));
    await assertSucceeds(getDocs(collection(anon(), 'shoes')));
    await assertSucceeds(getDocs(collection(anon(), 'categories')));
    await assertSucceeds(getDocs(collection(anon(), 'collections')));
  });
  it('écriture refusée aux anonymes et aux utilisateurs simples', async () => {
    await assertFails(setDoc(doc(anon(), 'shoes/x'), { name: 'x' }));
    await assertFails(setDoc(doc(as('alice'), 'shoes/x'), { name: 'x' }));
    await assertFails(updateDoc(doc(as('alice'), 'shoes/s1'), { price: 1 }));
    await assertFails(deleteDoc(doc(as('alice'), 'shoes/s1')));
  });
  it('productManager et admin peuvent écrire les produits', async () => {
    await assertSucceeds(setDoc(doc(as('pm1'), 'shoes/x'), { name: 'x' }));
    await assertSucceeds(updateDoc(doc(as('admin1'), 'shoes/s1'), { price: 5 }));
  });
  it('catégories et collections: admin uniquement', async () => {
    await assertFails(setDoc(doc(as('pm1'), 'categories/x'), { name: 'x' }));
    await assertFails(setDoc(doc(as('om1'), 'collections/x'), { name: 'x' }));
    await assertSucceeds(setDoc(doc(as('admin1'), 'categories/x'), { name: 'x' }));
    await assertSucceeds(setDoc(doc(as('admin1'), 'collections/x'), { name: 'x' }));
  });
});

describe('codes promo', () => {
  it('illisibles par le public et les utilisateurs simples', async () => {
    await assertFails(getDoc(doc(anon(), 'promoCodes/p1')));
    await assertFails(getDocs(collection(anon(), 'promoCodes')));
    await assertFails(getDocs(collection(as('alice'), 'promoCodes')));
    await assertFails(getDocs(collection(as('pm1'), 'promoCodes')));
  });
  it('admin: lecture et écriture', async () => {
    await assertSucceeds(getDocs(collection(as('admin1'), 'promoCodes')));
    await assertSucceeds(setDoc(doc(as('admin1'), 'promoCodes/p2'), { code: 'X', value: 5, isActive: true }));
  });
  it('écriture refusée aux utilisateurs simples', async () => {
    await assertFails(setDoc(doc(as('alice'), 'promoCodes/p2'), { code: 'GRATUIT', value: 100, isActive: true }));
    await assertFails(updateDoc(doc(as('alice'), 'promoCodes/p1'), { value: 100 }));
  });
});

describe('rôles', () => {
  it('un utilisateur ne peut pas lire ni écrire ses rôles', async () => {
    await assertFails(getDoc(doc(as('alice'), 'roles/alice')));
    await assertFails(setDoc(doc(as('alice'), 'roles/alice'), { admin: true }));
    await assertFails(setDoc(doc(as('pm1'), 'roles/pm1'), { admin: true }));
    await assertFails(setDoc(doc(anon(), 'roles/alice'), { admin: true }));
  });
  it('seul un admin gère les rôles', async () => {
    await assertSucceeds(setDoc(doc(as('admin1'), 'roles/alice'), { orderManager: true }));
    await assertSucceeds(getDocs(collection(as('admin1'), 'roles')));
  });
});

describe('profils utilisateurs', () => {
  it('lecture de son propre profil seulement', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice')));
    await assertFails(getDoc(doc(as('alice'), 'users/bob')));
    await assertFails(getDoc(doc(anon(), 'users/alice')));
    await assertFails(getDocs(collection(as('alice'), 'users')));
  });
  it('un admin peut lire un profil', async () => {
    await assertSucceeds(getDoc(doc(as('admin1'), 'users/alice')));
  });
  it('impossible de s’attribuer un rôle à la création', async () => {
    await assertFails(setDoc(doc(as('carol'), 'users/carol'), { id: 'carol', role: 'admin' }));
    await assertFails(setDoc(doc(as('carol'), 'users/carol'), { id: 'carol', admin: true }));
    await assertSucceeds(setDoc(doc(as('carol'), 'users/carol'), { id: 'carol', email: 'c@example.com' }));
  });
  it('impossible de s’attribuer un rôle par mise à jour', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { role: 'admin' }));
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { admin: true }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { email: 'new@example.com' }));
  });
  it('coordonnées du profil: types et longueurs bornés', async () => {
    const ok = { id: 'alice', name: 'Awa Fall', phone: '77 123 45 67', address: 'Cocody, rue 12, près du marché' };
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), ok, { merge: true }));
    await assertFails(setDoc(doc(as('alice'), 'users/alice'), { ...ok, name: 'a'.repeat(101) }, { merge: true }));
    await assertFails(setDoc(doc(as('alice'), 'users/alice'), { ...ok, phone: 'x'.repeat(31) }, { merge: true }));
    await assertFails(setDoc(doc(as('alice'), 'users/alice'), { ...ok, address: 'y'.repeat(501) }, { merge: true }));
    await assertFails(setDoc(doc(as('alice'), 'users/alice'), { ...ok, name: 12345 }, { merge: true }));
    await assertFails(setDoc(doc(as('alice'), 'users/alice'), { ...ok, phone: { n: 1 } }, { merge: true }));
    await assertFails(setDoc(doc(as('carol'), 'users/carol'), { id: 'carol', address: 'z'.repeat(600) })); // aussi à la création
  });

  it('enregistrer ses coordonnées ne permet toujours pas de s’attribuer un rôle', async () => {
    await assertFails(setDoc(doc(as('alice'), 'users/alice'), { name: 'Awa', role: 'admin' }, { merge: true }));
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { name: 'Awa', admin: true }));
  });

  it('impossible d’écrire le profil d’un autre', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/bob'), { email: 'x@example.com' }));
    await assertFails(setDoc(doc(as('alice'), 'users/bob'), { id: 'bob' }));
  });
  it('préférences: propriétaire uniquement', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice/preferences/p'), { theme: 'dark' }));
    await assertFails(getDoc(doc(as('bob'), 'users/alice/preferences/p')));
    await assertFails(setDoc(doc(as('bob'), 'users/alice/preferences/p'), { theme: 'x' }));
  });
});

describe('commandes', () => {
  it('aucune création côté client, même connecté', async () => {
    await assertFails(addDoc(collection(as('alice'), 'orders'), { userId: 'alice', total: 1, status: 'Livré' }));
    await assertFails(setDoc(doc(as('alice'), 'orders/new'), { userId: 'alice', total: 1 }));
    await assertFails(addDoc(collection(anon(), 'orders'), { userId: 'x', total: 1 }));
  });
  it('le client lit seulement ses commandes', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'orders/o-alice')));
    await assertFails(getDoc(doc(as('alice'), 'orders/o-bob')));
    await assertFails(getDoc(doc(anon(), 'orders/o-alice')));
    await assertSucceeds(getDocs(query(collection(as('alice'), 'orders'), where('userId', '==', 'alice'))));
    await assertFails(getDocs(collection(as('alice'), 'orders')));
  });
  it('le client ne peut ni modifier ni supprimer sa commande', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'orders/o-alice'), { status: 'Livré' }));
    await assertFails(updateDoc(doc(as('alice'), 'orders/o-alice'), { total: 1 }));
    await assertFails(deleteDoc(doc(as('alice'), 'orders/o-alice')));
  });
  it('orderManager et admin gèrent les commandes', async () => {
    await assertSucceeds(getDocs(collection(as('om1'), 'orders')));
    await assertSucceeds(updateDoc(doc(as('om1'), 'orders/o-bob'), { status: 'Prêt' }));
    await assertSucceeds(getDoc(doc(as('admin1'), 'orders/o-alice')));
  });
  it('productManager n’a aucun accès aux commandes', async () => {
    await assertFails(getDoc(doc(as('pm1'), 'orders/o-alice')));
    await assertFails(getDocs(collection(as('pm1'), 'orders')));
    await assertFails(updateDoc(doc(as('pm1'), 'orders/o-alice'), { status: 'Livré' }));
  });
});

describe('collections non déclarées (refus par défaut)', () => {
  it('messages de contact: aucun accès client, même admin (lecture via serveur uniquement)', async () => {
    await assertFails(getDoc(doc(as('alice'), 'contactMessages/m1')));
    await assertFails(getDocs(collection(anon(), 'contactMessages')));
    await assertFails(addDoc(collection(anon(), 'contactMessages'), { name: 'spam' }));
    await assertFails(getDoc(doc(as('admin1'), 'contactMessages/m1')));
  });
});
