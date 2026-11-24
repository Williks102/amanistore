import { describe, it, expect } from 'vitest';
import { sanitizeProfile, validateProfile, EMPTY_PROFILE } from './profile';

describe('profil client', () => {
  it('nettoie les espaces et plafonne les longueurs', () => {
    expect(sanitizeProfile({ name: '  Awa   Fall ', phone: ' 77 123 45 67 ', address: '  Cocody,  rue 12  ' })).toEqual({ name: 'Awa Fall', phone: '77 123 45 67', address: 'Cocody, rue 12' });
    const long = sanitizeProfile({ name: 'a'.repeat(300), phone: '1'.repeat(99), address: 'b'.repeat(900) });
    expect([long.name.length, long.phone.length, long.address.length]).toEqual([100, 30, 500]);
  });

  it('valeurs absentes ou de mauvais type => champs vides', () => {
    expect(sanitizeProfile(null)).toEqual(EMPTY_PROFILE);
    expect(sanitizeProfile({ name: 42 as any, phone: {} as any })).toEqual(EMPTY_PROFILE);
  });

  it('un profil vide est valide (tout est facultatif)', () => {
    expect(validateProfile(EMPTY_PROFILE)).toBeNull();
  });

  it('refuse un nom, un numéro ou une adresse trop courts ou mal formés', () => {
    expect(validateProfile({ ...EMPTY_PROFILE, name: 'A' })).toMatch(/nom/i);
    expect(validateProfile({ ...EMPTY_PROFILE, phone: '12345' })).toMatch(/téléphone/);
    expect(validateProfile({ ...EMPTY_PROFILE, phone: 'abc def ghi' })).toMatch(/téléphone/);
    expect(validateProfile({ ...EMPTY_PROFILE, phone: '+++ ((( )))' })).toMatch(/téléphone/); // pas assez de chiffres
    expect(validateProfile({ ...EMPTY_PROFILE, phone: '1'.repeat(16) })).toMatch(/téléphone/);
    expect(validateProfile({ ...EMPTY_PROFILE, address: 'Dakar' })).toMatch(/adresse/i);
  });

  it('accepte des numéros usuels', () => {
    for (const phone of ['77 123 45 67', '+221 77 123 45 67', '0172698282', '(225) 07-12-34-56-78']) {
      expect(validateProfile({ ...EMPTY_PROFILE, phone }), phone).toBeNull();
    }
  });
});
