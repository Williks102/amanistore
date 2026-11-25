export type AiErrorKind = 'model-unavailable' | 'quota' | 'key' | 'unknown';

/**
 * Classe une erreur de l'assistant IA pour les journaux (cause réelle) et le message montré aux visiteuses
 * (en français, sans détail technique ni clé).
 */
export function describeAiError(error: unknown): { kind: AiErrorKind; userMessage: string } {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  const status = (error as { status?: number } | null)?.status;
  let kind: AiErrorKind = 'unknown';
  if (status === 404 || /\b404\b|no longer available|not found/i.test(text)) kind = 'model-unavailable';
  else if (status === 429 || /\b429\b|quota|rate.?limit|too many/i.test(text)) kind = 'quota';
  else if (status === 401 || status === 403 || /\b40[13]\b|api key|permission|unauthenticated/i.test(text)) kind = 'key';
  const userMessage = kind === 'quota'
    ? 'Trop de demandes pour le moment. Réessayez dans quelques minutes.'
    : 'Le conseil de style est momentanément indisponible. Réessayez plus tard.';
  return { kind, userMessage };
}
