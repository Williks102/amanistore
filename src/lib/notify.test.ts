import { describe, it, expect, vi } from 'vitest';
import { buildOrderNotification, configuredChannels, sendNotification } from './notify';

// toLocaleString('fr-FR') sépare les milliers par une espace insécable fine: on compare avec des espaces ordinaires.
const plain = (text: string) => text.replace(/\s/g, ' ');
const TOKEN = '123456789:AAFakeTokenFakeTokenFakeToken_12';
const order = { id: 'abc123def456ghi789jk', customerName: 'Awa Fall', total: 130000, itemCount: 3, guest: true };

describe('message de notification', () => {
  it('contient l’essentiel et rien de personnel', () => {
    const n = buildOrderNotification(order, 'https://amanis.vercel.app');
    expect(plain(n.subject)).toBe('Nouvelle commande n° ABC123 — XOF 130 000');
    expect(n.text).toContain('n° ABC123');
    expect(n.text).toContain('3 articles');
    expect(n.text).toContain('De: Awa (sans compte)');
    expect(n.text).toContain('https://amanis.vercel.app/admin');
    // jamais d'adresse, de téléphone ni de code de livraison dans un service tiers
    expect(n.text).not.toMatch(/Fall|\d{6}|téléphone|adresse|Dakar/i);
  });

  it('un seul article, cliente avec compte, nom bizarre', () => {
    expect(buildOrderNotification({ ...order, itemCount: 1, guest: false }, 'https://x').text).toContain('1 article ·');
    expect(buildOrderNotification({ ...order, guest: false }, 'https://x').text).not.toContain('sans compte');
    expect(buildOrderNotification({ ...order, customerName: '  \n ' }, 'https://x').text).toContain('De: Cliente');
    expect(buildOrderNotification({ ...order, customerName: 'A'.repeat(200) + ' B' }, 'https://x').text.split('\n')[2].length).toBeLessThan(60);
  });
});

describe('canaux configurés', () => {
  it('détecte Telegram et l’e-mail, et refuse les valeurs mal formées', () => {
    expect(configuredChannels({})).toEqual({ telegram: false, email: false });
    expect(configuredChannels({ TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: '987654321' })).toEqual({ telegram: true, email: false });
    expect(configuredChannels({ TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: '-1001234567890' }).telegram).toBe(true);
    expect(configuredChannels({ TELEGRAM_BOT_TOKEN: 'pas-un-jeton', TELEGRAM_CHAT_ID: '987654321' }).telegram).toBe(false);
    expect(configuredChannels({ TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: '12' }).telegram).toBe(false);
    expect(configuredChannels({ RESEND_API_KEY: 're_x', NOTIFY_EMAIL_TO: 'moi@example.com' }).email).toBe(true);
    expect(configuredChannels({ RESEND_API_KEY: 're_x', NOTIFY_EMAIL_TO: 'a@b.fr, c@d.fr' }).email).toBe(false);
    expect(configuredChannels({ RESEND_API_KEY: '', NOTIFY_EMAIL_TO: 'moi@example.com' }).email).toBe(false);
  });
});

describe('envoi', () => {
  const n = { subject: 'Sujet', text: 'Texte' };
  const ok = () => vi.fn(async () => ({ ok: true, status: 200 }) as Response);

  it('aucun canal configuré: rien n’est appelé', async () => {
    const f = ok();
    expect(await sendNotification(n, {}, f)).toEqual({ telegram: 'off', email: 'off' });
    expect(f).not.toHaveBeenCalled();
  });

  it('Telegram: bon appel (adresse, corps, expiration)', async () => {
    const f = ok();
    const r = await sendNotification(n, { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: '987654321' }, f);
    expect(r).toEqual({ telegram: 'sent', email: 'off' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);
    expect(JSON.parse(init.body as string)).toEqual({ chat_id: '987654321', text: 'Texte', disable_web_page_preview: true });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('e-mail: clé en en-tête, expéditeur de test par défaut', async () => {
    const f = ok();
    const r = await sendNotification(n, { RESEND_API_KEY: 're_secret', NOTIFY_EMAIL_TO: 'moi@example.com' }, f);
    expect(r).toEqual({ telegram: 'off', email: 'sent' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_secret');
    expect(JSON.parse(init.body as string)).toMatchObject({ from: "Amani's <onboarding@resend.dev>", to: ['moi@example.com'], subject: 'Sujet', text: 'Texte' });
  });

  it('les deux canaux en parallèle; une panne n’empêche pas l’autre', async () => {
    const f = vi.fn(async (url: unknown) => (String(url).includes('telegram') ? ({ ok: false, status: 401 } as Response) : ({ ok: true, status: 200 } as Response)));
    const r = await sendNotification(n, { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: '987654321', RESEND_API_KEY: 're_x', NOTIFY_EMAIL_TO: 'moi@example.com' }, f);
    expect(r).toEqual({ telegram: 'failed', email: 'sent' });
  });

  it('réseau coupé ou délai dépassé: ne lève jamais, et ne journalise pas le jeton', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = vi.fn(async () => { throw new Error(`échec https://api.telegram.org/bot${TOKEN}/sendMessage`); });
    const r = await sendNotification(n, { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: '987654321' }, f);
    expect(r.telegram).toBe('failed');
    expect(JSON.stringify(spy.mock.calls)).not.toContain(TOKEN);
    spy.mockRestore();
  });
});
