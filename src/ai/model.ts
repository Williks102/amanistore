/**
 * Modèle Gemini de l'assistant de style. Google retire régulièrement d'anciens modèles (gemini-2.5-flash répond 404
 * aux nouveaux comptes): le nom se change donc par la variable GEMINI_MODEL dans Vercel, sans toucher au code.
 */
export const DEFAULT_MODEL = 'gemini-3.8-flash';

/** Nom de modèle propre (lettres, chiffres, points, tirets), avec ou sans le préfixe « googleai/ ». Sinon, le modèle par défaut. */
export function resolveModelName(raw: string | undefined = process.env.GEMINI_MODEL): string {
  const name = (raw ?? '').trim().replace(/^googleai\//i, '');
  return `googleai/${/^[a-z0-9][a-z0-9.-]{2,60}$/i.test(name) ? name : DEFAULT_MODEL}`;
}

/**
 * Modèle de secours (variable GEMINI_FALLBACK_MODEL, facultative): utilisé quand le principal est surchargé (503) ou retiré (404).
 * Absent, invalide ou identique au principal: pas de secours.
 */
export function resolveFallbackModelName(
  raw: string | undefined = process.env.GEMINI_FALLBACK_MODEL,
  primary: string = resolveModelName()
): string | undefined {
  const name = (raw ?? '').trim().replace(/^googleai\//i, '');
  if (!/^[a-z0-9][a-z0-9.-]{2,60}$/i.test(name)) return undefined;
  const full = `googleai/${name}`;
  return full === primary ? undefined : full;
}
