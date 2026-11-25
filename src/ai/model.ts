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
