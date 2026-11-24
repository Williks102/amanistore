import { describe, it, expect, vi, afterEach } from 'vitest';
import sitemap from './sitemap';
import robots from './robots';

const doc = (id: string, price: number) => ({
  name: `projects/p/databases/(default)/documents/shoes/${id}`,
  fields: { name: { stringValue: id }, price: { integerValue: String(price) }, createdAt: { stringValue: '2026-05-01T10:00:00.000Z' } },
});

afterEach(() => vi.unstubAllGlobals());

describe('sitemap et robots', () => {
  it('liste les pages et les produits affichables seulement (prix valide)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ documents: [doc('bon1', 65000), doc('absurde', 7000022), doc('bon2', 55000)] }) })));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain('https://amanis.vercel.app');
    expect(urls).toContain('https://amanis.vercel.app/shop');
    expect(urls).toContain('https://amanis.vercel.app/produit/bon1');
    expect(urls).toContain('https://amanis.vercel.app/produit/bon2');
    expect(urls).not.toContain('https://amanis.vercel.app/produit/absurde');
  });

  it('si Firestore ne répond pas, les pages principales restent publiées', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('réseau'); }));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toEqual(['https://amanis.vercel.app', 'https://amanis.vercel.app/shop', 'https://amanis.vercel.app/contact']);
  });

  it('robots: interdit les pages privées et annonce le sitemap', () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.disallow).toEqual(expect.arrayContaining(['/admin', '/dashboard', '/order-confirmation', '/validate-delivery']));
    expect(r.sitemap).toBe('https://amanis.vercel.app/sitemap.xml');
  });
});
