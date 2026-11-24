import { describe, it, expect } from 'vitest';
import { fetchShoeById, fromFirestoreFields, fromFirestoreValue, ShoeUnavailableError } from './firestore-rest';
import { vi } from 'vitest';

describe('conversion des valeurs Firestore (REST)', () => {
  it('types simples', () => {
    expect(fromFirestoreValue({ stringValue: 'Escarpin' })).toBe('Escarpin');
    expect(fromFirestoreValue({ integerValue: '65000' })).toBe(65000);
    expect(fromFirestoreValue({ doubleValue: 37.5 })).toBe(37.5);
    expect(fromFirestoreValue({ booleanValue: true })).toBe(true);
    expect(fromFirestoreValue({ nullValue: null })).toBeNull();
    expect(fromFirestoreValue({ timestampValue: '2026-01-01T00:00:00Z' })).toBe('2026-01-01T00:00:00Z');
  });

  it('tableaux, objets imbriqués et tableaux vides', () => {
    const fields = {
      name: { stringValue: 'Ballerine' },
      price: { integerValue: '60000' },
      availableSizes: { arrayValue: { values: [{ integerValue: '38' }, { integerValue: '39' }] } },
      availableColors: { arrayValue: { values: [{ mapValue: { fields: { name: { stringValue: 'Noir' }, hex: { stringValue: '#000' } } } }] } },
      detailImages: { arrayValue: {} },
      stock: { mapValue: { fields: { '38': { integerValue: '2' } } } },
      featured: { booleanValue: false },
    };
    expect(fromFirestoreFields(fields)).toEqual({
      name: 'Ballerine',
      price: 60000,
      availableSizes: [38, 39],
      availableColors: [{ name: 'Noir', hex: '#000' }],
      detailImages: [],
      stock: { '38': 2 },
      featured: false,
    });
  });

  it('valeur inconnue => undefined', () => {
    expect(fromFirestoreValue({} as never)).toBeUndefined();
  });
});

describe('lecture d’un produit: panne ≠ introuvable', () => {
  const doc = { name: 'projects/p/databases/(default)/documents/shoes/abc', fields: { name: { stringValue: 'Escarpin' }, price: { integerValue: '65000' } } };
  const ok = () => ({ ok: true, status: 200, json: async () => doc }) as Response;
  const status = (code: number) => ({ ok: false, status: code, json: async () => ({}) }) as Response;

  it('produit trouvé', async () => {
    const f = vi.fn(async () => ok());
    expect(await fetchShoeById('abc', f as unknown as typeof fetch)).toMatchObject({ id: 'abc', name: 'Escarpin', price: 65000 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('404: introuvable (null), sans nouvelle tentative', async () => {
    const f = vi.fn(async () => status(404));
    expect(await fetchShoeById('abc', f as unknown as typeof fetch)).toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('identifiant invalide: null sans appel réseau', async () => {
    const f = vi.fn();
    expect(await fetchShoeById('../etc/passwd', f as unknown as typeof fetch)).toBeNull();
    expect(await fetchShoeById('', f as unknown as typeof fetch)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('coupure réseau passagère: une nouvelle tentative réussit (ECONNRESET constaté en production)', async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(ok());
    expect(await fetchShoeById('abc', f as unknown as typeof fetch)).toMatchObject({ id: 'abc' });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('panne persistante (réseau ou 5xx): erreur, jamais un faux « introuvable »', async () => {
    const down = vi.fn(async () => { throw new TypeError('fetch failed'); });
    await expect(fetchShoeById('abc', down as unknown as typeof fetch)).rejects.toBeInstanceOf(ShoeUnavailableError);
    expect(down).toHaveBeenCalledTimes(2);
    const server = vi.fn(async () => status(503));
    await expect(fetchShoeById('abc', server as unknown as typeof fetch)).rejects.toThrow(/HTTP 503/);
  });

  it('accès refusé (4xx autre que 404): erreur visible, sans insister', async () => {
    const f = vi.fn(async () => status(403));
    await expect(fetchShoeById('abc', f as unknown as typeof fetch)).rejects.toThrow(/HTTP 403/);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
