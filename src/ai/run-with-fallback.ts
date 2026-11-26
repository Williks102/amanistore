import { describeAiError } from '@/lib/ai-errors';

type Options = {
  /** Modèle de secours (nom complet « googleai/… »), s'il y en a un. */
  fallback?: string;
  /** Pause avant le deuxième essai sur le modèle principal (ms). */
  retryDelayMs?: number;
  /** Durée maximale d'un appel (ms): un appel qui n'a pas répondu est abandonné et traité comme une surcharge. */
  callTimeoutMs?: number;
  /** Durée totale à ne pas dépasser (ms): on ne lance un nouvel essai que s'il peut finir dans ce délai. */
  budgetMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

/** Erreur d'un appel sans réponse dans le délai: classée comme une surcharge (503). */
const timeoutError = (ms: number) => Object.assign(new Error(`Pas de réponse de l'IA après ${Math.round(ms / 1000)} s (high demand?)`), { status: 503 });

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(timeoutError(ms)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Appel de l'IA avec reprise: un modèle surchargé (503) ou muet est réessayé une fois après une courte pause;
 * s'il échoue encore (ou si le modèle est retiré, 404) et qu'un modèle de secours est configuré, on l'essaie.
 * Chaque appel a un délai maximal et l'ensemble un budget: la réponse arrive avant la limite de durée de la fonction
 * (sinon la cliente verrait une page d'erreur au lieu d'un message). Les autres erreurs (clé, quota, inconnues)
 * remontent tout de suite: les réessayer ne servirait à rien. `call(undefined)` = modèle principal.
 */
export async function runWithFallback<T>(call: (model?: string) => Promise<T>, options: Options = {}): Promise<T> {
  const {
    fallback,
    retryDelayMs = 1000,
    callTimeoutMs = 10_000,
    budgetMs = 27_000,
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
    now = Date.now,
  } = options;
  const started = now();
  const canAfford = (pauseMs: number) => now() - started + pauseMs + callTimeoutMs <= budgetMs;
  const attempt = (model?: string) => withTimeout(call(model), callTimeoutMs);

  try {
    return await attempt();
  } catch (first) {
    let last = first;
    let kind = describeAiError(first).kind;
    if (kind === 'overloaded' && canAfford(retryDelayMs)) {
      await sleep(retryDelayMs);
      try {
        return await attempt();
      } catch (second) {
        last = second;
        kind = describeAiError(second).kind;
      }
    }
    if (fallback && (kind === 'overloaded' || kind === 'model-unavailable') && canAfford(0)) return await attempt(fallback);
    throw last;
  }
}
