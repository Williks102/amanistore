import { shortOrderNumber } from './order-display';

/**
 * Notification de nouvelle commande pour la boutique (Telegram et/ou e-mail), sans service payant.
 * Le message est volontairement minimal: numéro, nombre d'articles, total, prénom. Jamais le téléphone, l'adresse
 * ni le code de livraison (ces canaux sont des services tiers): les détails se lisent dans l'admin.
 * Aucune fonction ne lève d'erreur: une notification ratée ne doit jamais faire échouer une commande.
 */
export type Notification = { subject: string; text: string };

/** Variables lues: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, RESEND_API_KEY, NOTIFY_EMAIL_TO, NOTIFY_EMAIL_FROM (facultative). */
export type NotifyEnv = Record<string, string | undefined>;
export type ChannelResult = 'sent' | 'failed' | 'off';
export type NotifyResult = { telegram: ChannelResult; email: ChannelResult; /** Raison du refus, sans secret (« Unauthorized », « chat not found »…). */ errors?: { telegram?: string; email?: string } };

/** Valeur d'une variable d'environnement sans espaces, retours à la ligne ni guillemets autour (fréquents quand on colle une valeur). */
export function cleanEnvValue(value: string | undefined): string {
  return (value ?? '').trim().replace(/^(["'`])([\s\S]*)\1$/, '$2').trim();
}

const TOKEN_PATTERN = /^\d{5,}:[A-Za-z0-9_-]{20,}$/;
const CHAT_PATTERN = /^(-?\d{3,20}|@[A-Za-z0-9_]{4,})$/;
const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const DEFAULT_FROM = "Amani's <onboarding@resend.dev>";
const TIMEOUT_MS = 8000; // 4 s était trop court: des délais dépassés vers Telegram ont été relevés dans les journaux de production

const xof = (n: number) => `XOF ${n.toLocaleString('fr-FR')}`;

export function buildOrderNotification(order: { id: string; customerName: string; total: number; itemCount: number; guest: boolean }, siteUrl: string): Notification {
  const number = shortOrderNumber(order.id);
  const firstName = order.customerName.replace(/[\r\n]+/g, ' ').trim().split(/\s+/)[0]?.slice(0, 30) || 'Cliente';
  return {
    subject: `Nouvelle commande n° ${number} — ${xof(order.total)}`,
    text: `Nouvelle commande n° ${number}\n${order.itemCount} article${order.itemCount > 1 ? 's' : ''} · ${xof(order.total)}\nDe: ${firstName}${order.guest ? ' (sans compte)' : ''}\n\nDétails: ${siteUrl}/admin`,
  };
}

/** Canaux réellement utilisables d'après les variables d'environnement (valeurs jamais renvoyées). */
export function configuredChannels(env: NotifyEnv = process.env): { telegram: boolean; email: boolean } {
  return {
    telegram: TOKEN_PATTERN.test(cleanEnvValue(env.TELEGRAM_BOT_TOKEN)) && CHAT_PATTERN.test(cleanEnvValue(env.TELEGRAM_CHAT_ID)),
    email: Boolean(cleanEnvValue(env.RESEND_API_KEY)) && EMAIL_PATTERN.test(cleanEnvValue(env.NOTIFY_EMAIL_TO)),
  };
}

/**
 * Explications en français de ce qui empêche un canal de fonctionner, d'après les NOMS des variables et leur FORMAT.
 * Les valeurs ne sont jamais reprises dans les messages (ni entièrement, ni en partie).
 */
export function diagnoseNotifications(env: NotifyEnv = process.env): string[] {
  const has = (name: string) => cleanEnvValue(env[name]).length > 0;
  const hints: string[] = [];

  const tg = { token: has('TELEGRAM_BOT_TOKEN'), chat: has('TELEGRAM_CHAT_ID'), mail: has('RESEND_API_KEY'), to: has('NOTIFY_EMAIL_TO') };
  if (tg.token || tg.chat) {
    if (!tg.token) hints.push('TELEGRAM_CHAT_ID est défini mais TELEGRAM_BOT_TOKEN est absent: ajoutez-le, ou vérifiez l’orthographe exacte du nom.');
    else if (!TOKEN_PATTERN.test(cleanEnvValue(env.TELEGRAM_BOT_TOKEN))) hints.push('TELEGRAM_BOT_TOKEN a un format inattendu: il doit ressembler à 123456789:AAF… (chiffres, deux-points, puis lettres et chiffres). Recopiez-le en entier depuis @BotFather.');
    if (!tg.chat) hints.push('TELEGRAM_BOT_TOKEN est défini mais TELEGRAM_CHAT_ID est absent: ajoutez-le, ou vérifiez l’orthographe exacte du nom.');
    else if (!CHAT_PATTERN.test(cleanEnvValue(env.TELEGRAM_CHAT_ID))) hints.push('TELEGRAM_CHAT_ID doit être un nombre, par exemple 987654321 (négatif pour un groupe: -1001234567890). Ne recopiez pas « Id: » ni de texte autour.');
  }
  if (tg.mail || tg.to) {
    if (!tg.mail) hints.push('NOTIFY_EMAIL_TO est défini mais RESEND_API_KEY est absent.');
    if (!tg.to) hints.push('RESEND_API_KEY est défini mais NOTIFY_EMAIL_TO est absent.');
    else if (!EMAIL_PATTERN.test(cleanEnvValue(env.NOTIFY_EMAIL_TO))) hints.push('NOTIFY_EMAIL_TO doit être une seule adresse e-mail valide (sans virgule ni espace).');
  }
  if (hints.length === 0 && !tg.token && !tg.chat && !tg.mail && !tg.to) {
    hints.push('Aucune variable de notification détectée. Dans Vercel, ajoutez-les pour l’environnement « Production », puis redéployez: une variable ajoutée ne s’applique qu’aux déploiements suivants.');
  }
  return hints;
}

/** Traduit un refus de Telegram, de Resend ou du réseau en consigne claire (le texte reçu ne contient jamais le jeton). */
export function explainChannelError(channel: 'telegram' | 'email', detail: string | undefined): string {
  const d = (detail ?? '').toLowerCase();
  if (channel === 'telegram') {
    if (d.includes('unauthorized') || d.includes('401')) return 'Telegram refuse le jeton: vérifiez TELEGRAM_BOT_TOKEN (recopiez-le en entier depuis @BotFather).';
    if (d.includes('chat not found')) return 'Telegram ne trouve pas ce chat: vérifiez TELEGRAM_CHAT_ID.';
    if (d.includes('initiate conversation') || d.includes('blocked') || d.includes('forbidden') || d.includes('403')) return 'Votre bot ne peut pas vous écrire: ouvrez-le dans Telegram et appuyez sur « Démarrer » (ou débloquez-le), puis réessayez.';
    if (d.includes('too many') || d.includes('429')) {
      const seconds = /retry after (\d+)/i.exec(detail ?? '')?.[1];
      return `Telegram limite les envois: patientez ${seconds ? `${seconds} secondes` : 'une minute'} sans relancer le test, puis réessayez (chaque relance prolonge l’attente).`;
    }
  } else {
    if (d.includes('401') || d.includes('api key') || d.includes('unauthorized')) return 'Resend refuse la clé: vérifiez RESEND_API_KEY.';
    if (d.includes('403') || d.includes('verify') || d.includes('domain') || d.includes('own email')) return 'Resend refuse cette adresse: avec l’expéditeur de test, l’envoi n’est possible qu’à l’adresse du compte Resend (sinon, vérifiez un domaine).';
  }
  if (d.includes('timeout') || d.includes('abort') || d.includes('fetch')) return 'Le service n’a pas répondu à temps: réessayez dans un instant.';
  return `Le message a été refusé (${detail ?? 'raison inconnue'}).`;
}

export async function sendNotification(notification: Notification, env: NotifyEnv = process.env, fetchImpl: typeof fetch = fetch): Promise<NotifyResult> {
  const channels = configuredChannels(env);
  const result: NotifyResult = { telegram: 'off', email: 'off' };
  const errors: NonNullable<NotifyResult['errors']> = {};
  const token = cleanEnvValue(env.TELEGRAM_BOT_TOKEN);
  const chatId = cleanEnvValue(env.TELEGRAM_CHAT_ID);
  const resendKey = cleanEnvValue(env.RESEND_API_KEY);
  const emailTo = cleanEnvValue(env.NOTIFY_EMAIL_TO);
  const emailFrom = cleanEnvValue(env.NOTIFY_EMAIL_FROM);

  /** Raison lisible d'un refus: le champ `description` (Telegram) ou `message` (Resend), jamais l'adresse appelée. */
  const reason = async (res: Response): Promise<string> => {
    try {
      const body = (await res.json()) as { description?: string; message?: string };
      return `HTTP ${res.status} ${body.description ?? body.message ?? ''}`.trim();
    } catch {
      return `HTTP ${res.status}`;
    }
  };

  const run = async (name: 'telegram' | 'email', send: () => Promise<Response>) => {
    try {
      const res = await send();
      result[name] = res.ok ? 'sent' : 'failed';
      if (!res.ok) {
        errors[name] = await reason(res);
        console.error(`Notification ${name} refusée (${errors[name]})`);
      }
    } catch (error) {
      result[name] = 'failed'; // on ne journalise pas l'erreur brute: l'adresse Telegram contient le jeton
      errors[name] = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network';
      console.error(`Notification ${name} impossible: ${errors[name]}`);
    }
  };

  await Promise.all([
    channels.telegram
      ? run('telegram', () => fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: notification.text, disable_web_page_preview: true }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }))
      : Promise.resolve(),
    channels.email
      ? run('email', () => fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({ from: emailFrom || DEFAULT_FROM, to: [emailTo], subject: notification.subject, text: notification.text }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }))
      : Promise.resolve(),
  ]);
  if (errors.telegram || errors.email) result.errors = errors;
  return result;
}
