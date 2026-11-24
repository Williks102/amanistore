'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getNotificationStatus, sendTestNotification } from '@/app/actions';
import { getIdToken } from '@/lib/get-id-token';
import { useToast } from '@/hooks/use-toast';

export type NotificationStatus = { telegram: boolean; email: boolean; hints: string[] } | 'error' | null;
type Status = NotificationStatus;

/** Réservé aux admins: voir quels canaux préviennent d'une nouvelle commande, envoyer un test, et comment les activer. */
/** `initialStatus`: état déjà connu (aperçus et tests visuels); sinon l'état est demandé au serveur. */
export function NotificationCard({ initialStatus }: { initialStatus?: NotificationStatus } = {}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>(initialStatus ?? null);
  const [isTesting, setIsTesting] = useState(false);
  const [testHints, setTestHints] = useState<string[]>([]);

  useEffect(() => {
    if (initialStatus) return;
    (async () => {
      const result = await getNotificationStatus(await getIdToken());
      setStatus(result.error ? 'error' : { telegram: result.telegram, email: result.email, hints: result.hints });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configured = status && status !== 'error' ? status : { telegram: false, email: false };
  const anyChannel = configured.telegram || configured.email;

  const test = async () => {
    setIsTesting(true);
    const result = await sendTestNotification(await getIdToken());
    setIsTesting(false);
    setTestHints(result.hints ?? []);
    if (result.success) {
      const channels = [result.result?.telegram === 'sent' ? 'Telegram' : '', result.result?.email === 'sent' ? 'e-mail' : ''].filter(Boolean).join(' et ');
      toast({ title: 'Message de test envoyé', description: `Vérifiez ${channels}.` });
    } else {
      toast({ title: 'Test non envoyé', description: result.error ?? result.hints?.[0] ?? 'Le message a été refusé.', variant: 'destructive' });
    }
  };

  const channel = (label: string, on: boolean) => (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="font-medium">{label}</span>
      {status === null ? <Badge variant="secondary">Vérification…</Badge> : status === 'error' ? <Badge variant="secondary">État inconnu</Badge> : on ? <Badge>Activé</Badge> : <Badge variant="secondary">Non configuré</Badge>}
    </li>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Être prévenue d&apos;une nouvelle commande</CardTitle>
        <CardDescription>Le message ne contient ni téléphone, ni adresse, ni code de livraison: seulement le numéro, le nombre d&apos;articles, le total et le prénom. Les détails se lisent ici, dans « Commandes ».</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y divide-border">
          {channel('Telegram', configured.telegram)}
          {channel('E-mail', configured.email)}
        </ul>
        {(() => {
          const hints = [...(status && status !== 'error' ? status.hints : []), ...testHints.filter((h) => !(status && status !== 'error' && status.hints.includes(h)))];
          return hints.length > 0 ? (
            <div role="alert" className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-semibold">À corriger</p>
              <ul className="list-disc space-y-1 pl-5">{hints.map((h) => <li key={h}>{h}</li>)}</ul>
              <p className="text-xs text-muted-foreground">Vos valeurs ne sont jamais affichées ici. Après toute modification dans Vercel, redéployez.</p>
            </div>
          ) : null;
        })()}
        <Button variant="outline" size="sm" onClick={test} disabled={isTesting || !anyChannel}>
          {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Envoyer un message de test'}
        </Button>
        <details className="rounded-lg border p-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">Comment l&apos;activer</summary>
          <div className="space-y-4 pb-1 pt-2">
            <div>
              <p className="font-semibold">Telegram (gratuit)</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Dans Telegram, ouvrez <strong>@BotFather</strong>, envoyez <code>/newbot</code> et suivez les étapes: vous recevez un <strong>jeton</strong> (secret).</li>
                <li>Envoyez un message à votre nouveau bot, puis ouvrez <code>https://api.telegram.org/bot&lt;JETON&gt;/getUpdates</code> et repérez <code>&quot;chat&quot;:&#123;&quot;id&quot;: NOMBRE&#125;</code>.</li>
                <li>Dans Vercel → Settings → Environment Variables, ajoutez <code>TELEGRAM_BOT_TOKEN</code> (le jeton) et <code>TELEGRAM_CHAT_ID</code> (le nombre), puis redéployez.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold">E-mail (Resend, gratuit à petit volume)</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Créez un compte sur resend.com et une <strong>clé API</strong> (secrète).</li>
                <li>Dans Vercel, ajoutez <code>RESEND_API_KEY</code> et <code>NOTIFY_EMAIL_TO</code> (votre adresse). Avec l&apos;expéditeur de test, l&apos;envoi n&apos;est possible qu&apos;à l&apos;adresse du compte Resend; pour un autre expéditeur, vérifiez un domaine et ajoutez <code>NOTIFY_EMAIL_FROM</code>.</li>
              </ol>
            </div>
            <p className="text-muted-foreground">Ne partagez jamais ces valeurs dans une conversation: elles se saisissent uniquement dans Vercel.</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
