import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeFirestore } from '@/test/fake-firestore';

const h = vi.hoisted(() => ({ verify: vi.fn(), db: null as any, apps: [{}] as any[] }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: h.verify }) }));
vi.mock('firebase-admin/app', () => ({ getApps: () => h.apps }));
vi.mock('@/firebase/admin', () => ({ get adminDb() { return h.db; } }));

import { verifyToken, requireRole, requireUser, getRolesForUid, AuthError } from './server-auth';

const TOKEN = 'x'.repeat(100);

describe('server-auth', () => {
  let db: FakeFirestore;
  beforeEach(() => {
    db = new FakeFirestore();
    h.db = db;
    h.apps = [{}];
    h.verify.mockReset();
    h.verify.mockResolvedValue({ uid: 'u1' });
  });

  it('refuse un jeton absent, trop court ou non textuel', async () => {
    for (const bad of [undefined, null, 42, '', 'abc']) {
      await expect(verifyToken(bad)).rejects.toBeInstanceOf(AuthError);
    }
    expect(h.verify).not.toHaveBeenCalled();
  });

  it('refuse un jeton rejeté par Firebase', async () => {
    h.verify.mockRejectedValue(new Error('expired'));
    await expect(verifyToken(TOKEN)).rejects.toBeInstanceOf(AuthError);
  });

  it('refuse si le SDK Admin n’est pas initialisé', async () => {
    h.apps = [];
    await expect(verifyToken(TOKEN)).rejects.toBeInstanceOf(AuthError);
  });

  it('retourne l’UID du jeton vérifié', async () => {
    expect(await requireUser(TOKEN)).toBe('u1');
  });

  it('sans document roles/{uid}: aucun droit', async () => {
    expect(await getRolesForUid('u1')).toEqual({ admin: false, productManager: false, orderManager: false });
    await expect(requireRole(TOKEN, ['productManager'])).rejects.toBeInstanceOf(AuthError);
  });

  it('ignore users/{uid}.role, modifiable par l’utilisateur', async () => {
    db.seed('users', 'u1', { role: 'admin', admin: true });
    await expect(requireRole(TOKEN, [])).rejects.toBeInstanceOf(AuthError);
  });

  it('admin passe pour tous les rôles, y compris ceux réservés aux admins', async () => {
    db.seed('roles', 'u1', { admin: true });
    await expect(requireRole(TOKEN, [])).resolves.toBe('u1');
    await expect(requireRole(TOKEN, ['orderManager'])).resolves.toBe('u1');
  });

  it('productManager: produits oui, commandes et admin non', async () => {
    db.seed('roles', 'u1', { productManager: true });
    await expect(requireRole(TOKEN, ['productManager'])).resolves.toBe('u1');
    await expect(requireRole(TOKEN, ['orderManager'])).rejects.toBeInstanceOf(AuthError);
    await expect(requireRole(TOKEN, [])).rejects.toBeInstanceOf(AuthError);
  });

  it('exige un booléen true strict (pas "true" ni 1)', async () => {
    db.seed('roles', 'u1', { admin: 'true', orderManager: 1 });
    expect(await getRolesForUid('u1')).toEqual({ admin: false, productManager: false, orderManager: false });
  });
});
