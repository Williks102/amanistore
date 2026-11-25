import { describeAiError } from '@/lib/ai-errors';

type Options = {
  /** Modèle de secours (nom complet « googleai/… »), s'il y en a un. */
  fallback?: string;
  /** Pause avant le deuxième essai sur le modèle principal (ms). */
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Appel de l'IA avec reprise: un modèle surchargé (503) est réessayé une fois après une courte pause;
 * s'il échoue encore (ou si le modèle est retiré, 404) et qu'un modèle de secours est configuré, on l'essaie.
 * Les autres erreurs (clé, quota, inconnues) remontent tout de suite: les réessayer ne servirait à rien.
 * `call(undefined)` = modèle principal.
 */
export async function runWithFallback<T>(call: (model?: string) => Promise<T>, options: Options = {}): Promise<T> {
  const { fallback, retryDelayMs = 1000, sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) } = options;
  try {
    return await call();
  } catch (first) {
    let last = first;
    let kind = describeAiError(first).kind;
    if (kind === 'overloaded') {
      await sleep(retryDelayMs);
      try {
        return await call();
      } catch (second) {
        last = second;
        kind = describeAiError(second).kind;
      }
    }
    if (fallback && (kind === 'overloaded' || kind === 'model-unavailable')) return await call(fallback);
    throw last;
  }
}
