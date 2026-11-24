import { describe, it, expect } from 'vitest';
import { fromFirestoreFields, fromFirestoreValue } from './firestore-rest';

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
