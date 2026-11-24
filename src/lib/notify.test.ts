import { describe, it, expect, vi } from 'vitest';
import { buildOrderNotification, cleanEnvValue, configuredChannels, diagnoseNotifications, explainChannelError, sendNotification } from './notify';

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
    expect(r).toMatchObject({ telegram: 'failed', email: 'sent' });
    expect(r.errors).toEqual({ telegram: 'HTTP 401' });
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

describe('valeurs collées dans Vercel', () => {
  it('cleanEnvValue retire espaces, retours à la ligne et guillemets autour', () => {
    expect(cleanEnvValue('  abc \n')).toBe('abc');
    expect(cleanEnvValue('"abc"')).toBe('abc');
    expect(cleanEnvValue(" 'abc' ")).toBe('abc');
    expect(cleanEnvValue('a"b"c')).toBe('a"b"c');
    expect(cleanEnvValue(undefined)).toBe('');
  });

  it('un jeton ou un identifiant collé avec un espace ou des guillemets reste accepté (cause probable de « mauvaise configuration »)', () => {
    expect(configuredChannels({ TELEGRAM_BOT_TOKEN: `${TOKEN}\n`, TELEGRAM_CHAT_ID: ' 987654321 ' }).telegram).toBe(true);
    expect(configuredChannels({ TELEGRAM_BOT_TOKEN: `"${TOKEN}"`, TELEGRAM_CHAT_ID: '"987654321"' }).telegram).toBe(true);
    expect(configuredChannels({ RESEND_API_KEY: ' re_x ', NOTIFY_EMAIL_TO: ' moi@example.com\n' }).email).toBe(true);
  });

  it('la requête utilise les valeurs nettoyées', async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    await sendNotification({ subject: 's', text: 't' }, { TELEGRAM_BOT_TOKEN: `"${TOKEN}" `, TELEGRAM_CHAT_ID: ' 987654321\n' }, f);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);
    expect(JSON.parse(init.body as string).chat_id).toBe('987654321');
  });
});

describe('diagnostic de configuration', () => {
  const GOOD = { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: '987654321' };

  it('rien de défini: consigne de redéployer', () => {
    const h = diagnoseNotifications({});
    expect(h).toHaveLength(1);
    expect(h[0]).toMatch(/Production/);
    expect(h[0]).toMatch(/redéployez/);
  });

  it('configuration correcte: aucune remarque', () => {
    expect(diagnoseNotifications(GOOD)).toEqual([]);
    expect(diagnoseNotifications({ RESEND_API_KEY: 're_x', NOTIFY_EMAIL_TO: 'moi@example.com' })).toEqual([]);
  });

  it('variable manquante: nomme celle qui manque', () => {
    expect(diagnoseNotifications({ TELEGRAM_CHAT_ID: '987654321' }).join(' ')).toMatch(/TELEGRAM_BOT_TOKEN est absent/);
    expect(diagnoseNotifications({ TELEGRAM_BOT_TOKEN: TOKEN }).join(' ')).toMatch(/TELEGRAM_CHAT_ID est absent/);
    expect(diagnoseNotifications({ NOTIFY_EMAIL_TO: 'moi@example.com' }).join(' ')).toMatch(/RESEND_API_KEY est absent/);
  });

  it('format invalide: explique l’attendu, sans reprendre la valeur', () => {
    const secret = 'valeur-secrete-12345';
    const h = diagnoseNotifications({ TELEGRAM_BOT_TOKEN: secret, TELEGRAM_CHAT_ID: 'Id: 555123456', RESEND_API_KEY: 're_x', NOTIFY_EMAIL_TO: 'a@b.fr, c@d.fr' });
    expect(h.join(' ')).toMatch(/TELEGRAM_BOT_TOKEN a un format inattendu/);
    expect(h.join(' ')).toMatch(/TELEGRAM_CHAT_ID doit être un nombre/);
    expect(h.join(' ')).toMatch(/NOTIFY_EMAIL_TO doit être une seule adresse/);
    expect(h.join(' ')).not.toContain(secret);
    expect(h.join(' ')).not.toContain('555123456');
  });
});

describe('refus des services', () => {
  const env = { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: '987654321' };
  const refuse = (status: number, body: unknown) => vi.fn(async () => ({ ok: false, status, json: async () => body }) as unknown as Response);

  it('garde la raison fournie par Telegram, sans le jeton', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await sendNotification({ subject: 's', text: 't' }, env, refuse(401, { ok: false, description: 'Unauthorized' }));
    expect(r.telegram).toBe('failed');
    expect(r.errors?.telegram).toBe('HTTP 401 Unauthorized');
    expect(JSON.stringify(spy.mock.calls)).not.toContain(TOKEN);
    spy.mockRestore();
  });

  it('délai dépassé et réseau coupé sont distingués', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const timeout = vi.fn(async () => { const e = new Error('x'); e.name = 'TimeoutError'; throw e; });
    expect((await sendNotification({ subject: 's', text: 't' }, env, timeout)).errors?.telegram).toBe('timeout');
    const down = vi.fn(async () => { throw new TypeError('fetch failed'); });
    expect((await sendNotification({ subject: 's', text: 't' }, env, down)).errors?.telegram).toBe('network');
    spy.mockRestore();
  });

  it('succès: pas de rubrique d’erreurs', async () => {
    const r = await sendNotification({ subject: 's', text: 't' }, env, vi.fn(async () => ({ ok: true, status: 200 }) as Response));
    expect(r.errors).toBeUndefined();
  });

  it('consignes en français selon la raison', () => {
    expect(explainChannelError('telegram', 'HTTP 401 Unauthorized')).toMatch(/TELEGRAM_BOT_TOKEN/);
    expect(explainChannelError('telegram', 'HTTP 400 Bad Request: chat not found')).toMatch(/TELEGRAM_CHAT_ID/);
    expect(explainChannelError('telegram', "HTTP 403 Forbidden: bot can't initiate conversation with a user")).toMatch(/Démarrer/);
    expect(explainChannelError('telegram', 'HTTP 429 Too Many Requests')).toMatch(/patientez/);
    expect(explainChannelError('telegram', 'timeout')).toMatch(/réessayez/);
    expect(explainChannelError('email', 'HTTP 401 API key is invalid')).toMatch(/RESEND_API_KEY/);
    expect(explainChannelError('email', 'HTTP 403 You can only send testing emails to your own email address')).toMatch(/adresse du compte Resend/);
    expect(explainChannelError('telegram', 'HTTP 500 bizarre')).toMatch(/refusé \(HTTP 500 bizarre\)/);
  });
});
