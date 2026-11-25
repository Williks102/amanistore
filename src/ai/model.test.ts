import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL, resolveModelName } from './model';

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
