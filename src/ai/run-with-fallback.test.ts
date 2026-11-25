import { describe, expect, it } from 'vitest';
import { runWithFallback } from './run-with-fallback';

const err = (message: string, status?: number) => Object.assign(new Error(message), status ? { status } : {});
const overloaded = () => err('[503 Service Unavailable] This model is currently experiencing high demand.', 503);
const gone = () => err('[404 Not Found] models/x is no longer available', 404);
const noSleep = async () => {};

/** Appels enregistrés; chaque entrée de `script` est la réponse de l'appel correspondant. */
function scripted(script: Array<'ok' | Error>) {
  const calls: Array<string | undefined> = [];
  const call = async (model?: string) => {
    calls.push(model);
    const next = script[calls.length - 1];
    if (next instanceof Error) throw next;
    return `réponse-${model ?? 'principal'}`;
  };
  return { call, calls };
}

describe('runWithFallback', () => {
  it('succès direct: un seul appel', async () => {
    const s = scripted(['ok']);
    expect(await runWithFallback(s.call, { sleep: noSleep })).toBe('réponse-principal');
    expect(s.calls).toEqual([undefined]);
  });
  it('503 passager: deuxième essai sur le modèle principal, après une pause', async () => {
    const s = scripted([overloaded(), 'ok']);
    const pauses: number[] = [];
    expect(await runWithFallback(s.call, { sleep: async (ms) => { pauses.push(ms); } })).toBe('réponse-principal');
    expect(s.calls).toEqual([undefined, undefined]);
    expect(pauses).toEqual([1000]);
  });
  it('503 persistant avec modèle de secours: le secours répond', async () => {
    const s = scripted([overloaded(), overloaded(), 'ok']);
    expect(await runWithFallback(s.call, { fallback: 'googleai/autre', sleep: noSleep })).toBe('réponse-googleai/autre');
    expect(s.calls).toEqual([undefined, undefined, 'googleai/autre']);
  });
  it('503 persistant sans secours: l’erreur remonte après 2 essais', async () => {
    const s = scripted([overloaded(), overloaded(), 'ok']);
    await expect(runWithFallback(s.call, { sleep: noSleep })).rejects.toThrow(/high demand/);
    expect(s.calls).toHaveLength(2);
  });
  it('modèle retiré (404): pas de nouvel essai inutile, secours direct', async () => {
    const s = scripted([gone(), 'ok']);
    expect(await runWithFallback(s.call, { fallback: 'googleai/autre', sleep: noSleep })).toBe('réponse-googleai/autre');
    expect(s.calls).toEqual([undefined, 'googleai/autre']);
    const t = scripted([gone(), 'ok']);
    await expect(runWithFallback(t.call, { sleep: noSleep })).rejects.toThrow(/no longer available/);
    expect(t.calls).toHaveLength(1);
  });
  it('clé refusée, quota ou erreur inconnue: aucun réessai, aucun secours', async () => {
    for (const e of [err('API key not valid', 403), err('quota', 429), err('réseau coupé')]) {
      const s = scripted([e, 'ok']);
      await expect(runWithFallback(s.call, { fallback: 'googleai/autre', sleep: noSleep })).rejects.toBe(e);
      expect(s.calls).toHaveLength(1);
    }
  });
  it('le secours qui échoue à son tour: son erreur remonte', async () => {
    const s = scripted([overloaded(), overloaded(), err('secours aussi en panne', 500)]);
    await expect(runWithFallback(s.call, { fallback: 'googleai/autre', sleep: noSleep })).rejects.toThrow(/secours aussi/);
    expect(s.calls).toHaveLength(3);
  });
});
