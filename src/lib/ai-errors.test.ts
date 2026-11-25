import { describe, expect, it } from 'vitest';
import { describeAiError } from './ai-errors';

const err = (message: string, status?: number) => Object.assign(new Error(message), status ? { status } : {});

describe('describeAiError', () => {
  it('modèle retiré (cas de production du 25/11): 404 et texte de Google', () => {
    expect(describeAiError(err('[404 Not Found] This model models/gemini-2.5-flash is no longer available to new users.', 404)).kind).toBe('model-unavailable');
    expect(describeAiError(err('models/x is no longer available')).kind).toBe('model-unavailable');
  });
  it('modèle surchargé (cas de production du 25/11, 503 « high demand »)', () => {
    const e = err('[503 Service Unavailable] This model is currently experiencing high demand. Spikes in demand are usually temporary.', 503);
    expect(describeAiError(e).kind).toBe('overloaded');
    expect(describeAiError(err('This model is currently experiencing high demand')).kind).toBe('overloaded');
    expect(describeAiError(err('x', 500)).kind).toBe('overloaded');
    expect(describeAiError(e).userMessage).toMatch(/très sollicité/);
  });
  it('quota, clé, inconnu', () => {
    expect(describeAiError(err('x', 429)).kind).toBe('quota');
    expect(describeAiError(err('Resource exhausted: quota exceeded')).kind).toBe('quota');
    expect(describeAiError(err('x', 403)).kind).toBe('key');
    expect(describeAiError(err('API key not valid. Please pass a valid API key.')).kind).toBe('key');
    expect(describeAiError(err('réseau coupé')).kind).toBe('unknown');
    expect(describeAiError('chaîne').kind).toBe('unknown');
    expect(describeAiError(null).kind).toBe('unknown');
  });
  it('message visiteuse: en français, jamais de détail technique ni de nom de modèle', () => {
    for (const e of [err('[404] models/gemini-2.5-flash AIzaSyFAKEKEY', 404), err('x', 429), err('x', 403), err('x', 503), err('boom')]) {
      const { userMessage } = describeAiError(e);
      expect(userMessage).toMatch(/Réessayez/);
      expect(userMessage).not.toMatch(/gemini|AIza|404|models\//i);
    }
  });
});
