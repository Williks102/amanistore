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
export type NotifyResult = { telegram: ChannelResult; email: ChannelResult };

const TOKEN_PATTERN = /^\d{5,}:[A-Za-z0-9_-]{20,}$/;
const CHAT_PATTERN = /^(-?\d{3,20}|@[A-Za-z0-9_]{4,})$/;
const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const DEFAULT_FROM = "Amani's <onboarding@resend.dev>";
const TIMEOUT_MS = 4000;

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
    telegram: TOKEN_PATTERN.test(env.TELEGRAM_BOT_TOKEN ?? '') && CHAT_PATTERN.test(env.TELEGRAM_CHAT_ID ?? ''),
    email: Boolean(env.RESEND_API_KEY) && EMAIL_PATTERN.test(env.NOTIFY_EMAIL_TO ?? ''),
  };
}

export async function sendNotification(notification: Notification, env: NotifyEnv = process.env, fetchImpl: typeof fetch = fetch): Promise<NotifyResult> {
  const channels = configuredChannels(env);
  const result: NotifyResult = { telegram: 'off', email: 'off' };

  const run = async (name: 'telegram' | 'email', send: () => Promise<Response>) => {
    try {
      const res = await send();
      result[name] = res.ok ? 'sent' : 'failed';
      if (!res.ok) console.error(`Notification ${name} refusée (HTTP ${res.status})`);
    } catch (error) {
      result[name] = 'failed'; // on ne journalise pas l'erreur brute: l'adresse Telegram contient le jeton
      console.error(`Notification ${name} impossible: ${error instanceof Error ? error.name : 'erreur'}`);
    }
  };

  await Promise.all([
    channels.telegram
      ? run('telegram', () => fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: notification.text, disable_web_page_preview: true }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }))
      : Promise.resolve(),
    channels.email
      ? run('email', () => fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
          body: JSON.stringify({ from: env.NOTIFY_EMAIL_FROM || DEFAULT_FROM, to: [env.NOTIFY_EMAIL_TO], subject: notification.subject, text: notification.text }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }))
      : Promise.resolve(),
  ]);
  return result;
}
