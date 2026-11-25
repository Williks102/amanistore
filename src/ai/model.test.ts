import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL, resolveFallbackModelName, resolveModelName } from './model';

describe('resolveModelName', () => {
  it('modèle par défaut sans variable, vide ou invalide', () => {
    for (const raw of [undefined, '', '   ', 'a b', 'x', '../etc', 'modèle', 'gemini/3', 'a'.repeat(80)]) {
      expect(resolveModelName(raw)).toBe(`googleai/${DEFAULT_MODEL}`);
    }
  });
  it('variable acceptée, avec ou sans préfixe, espaces retirés', () => {
    expect(resolveModelName('gemini-4.0-flash')).toBe('googleai/gemini-4.0-flash');
    expect(resolveModelName('  googleai/gemini-4.0-flash ')).toBe('googleai/gemini-4.0-flash');
  });
});

describe('resolveFallbackModelName', () => {
  it('aucun secours sans variable ou avec un nom invalide', () => {
    for (const raw of [undefined, '', '  ', 'a b', '../x']) expect(resolveFallbackModelName(raw, 'googleai/principal')).toBeUndefined();
  });
  it('secours accepté, avec ou sans préfixe', () => {
    expect(resolveFallbackModelName('gemini-flash-latest', 'googleai/principal')).toBe('googleai/gemini-flash-latest');
    expect(resolveFallbackModelName('googleai/gemini-flash-latest', 'googleai/principal')).toBe('googleai/gemini-flash-latest');
  });
  it('secours identique au principal: ignoré (inutile de réessayer le même)', () => {
    expect(resolveFallbackModelName('gemini-4.0-flash', 'googleai/gemini-4.0-flash')).toBeUndefined();
  });
});
