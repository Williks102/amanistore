'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Copy, KeyRound } from 'lucide-react';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { STATUS_DESCRIPTIONS, STATUS_STEPS, orderLines, orderTotals, progressPercent, shortOrderNumber, statusStep } from '@/lib/order-display';

const xof = (n: number) => `XOF ${n.toLocaleString('fr-FR')}`;

/** Carte d'une commande en cours: avancement, code de livraison, articles (quantité, couleur, total) et totaux. */
export function OrderCard({ order }: { order: Order }) {
  const { toast } = useToast();
  const step = statusStep(order.status);
  const lines = orderLines(order);
  const totals = orderTotals(order);
  const showCode = order.status !== 'Livré' && order.status !== 'Annulé';

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(order.validationCode);
      toast({ title: 'Code copié', description: 'Donnez-le au livreur à la réception.' });
    } catch {
      toast({ title: 'Copie impossible', description: 'Recopiez le code à la main.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-xl">Commande n° {shortOrderNumber(order.id)}</CardTitle>
          <CardDescription>
            Passée le {new Date(order.date).toLocaleDateString('fr-FR')} · Total {xof(order.total)}
          </CardDescription>
        </div>
        <OrderStatusBadge status={order.status} className="shrink-0 text-sm" />
      </CardHeader>
      <CardContent>
        {step !== null && (
          <div className="mb-4 space-y-2">
            <ol className="flex items-center justify-between text-sm font-medium">
              {STATUS_STEPS.map((label, i) => (
                <li key={label} aria-current={i + 1 === step ? 'step' : undefined} className={cn('text-center', i + 1 === step ? 'font-bold text-primary' : 'text-muted-foreground')}>
                  {label}
                </li>
              ))}
            </ol>
            <div
              role="progressbar"
              aria-label="Avancement de la commande"
              aria-valuemin={1}
              aria-valuemax={STATUS_STEPS.length}
              aria-valuenow={step}
              aria-valuetext={`Étape ${step} sur ${STATUS_STEPS.length} : ${order.status}`}
              className="relative h-2 w-full rounded-full bg-muted"
            >
              <div className="absolute left-0 top-0 h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPercent(order.status)}%` }} />
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground">{STATUS_DESCRIPTIONS[order.status]}</p>
        <Separator className="my-5" />

        {showCode && (
          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <KeyRound className="mr-2 h-5 w-5 text-primary" aria-hidden="true" />
              <h4 className="font-semibold">Votre code de livraison</h4>
            </div>
            <p className="text-2xl font-bold tracking-widest text-primary">{order.validationCode}</p>
            <p className="mt-1 text-xs text-muted-foreground">À donner au livreur à la réception, à personne d&apos;autre.</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={copyCode}>
              <Copy className="h-4 w-4" aria-hidden="true" /> Copier le code
            </Button>
          </div>
        )}

        <h4 className="mb-3 font-semibold">Articles</h4>
        <ul className="space-y-4">
          {lines.map((line) => (
            <li key={line.id} className="flex items-center gap-3 text-sm">
              <Link href={`/produit/${line.productId}`} aria-label={`Voir ${line.name}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary">
                {line.imageUrl ? <Image src={line.imageUrl} alt="" fill sizes="56px" className="object-cover" /> : null}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{line.name}</p>
                <p className="text-muted-foreground">Pointure {line.size} · {line.color}</p>
                <p className="text-muted-foreground">{line.quantity} × {xof(line.unitPrice)}</p>
              </div>
              <p className="shrink-0 font-semibold">{xof(line.total)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd>{xof(totals.subtotal)}</dd></div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-green-700"><dt>Réduction{order.promoCode ? ` (${order.promoCode})` : ''}</dt><dd>− {xof(totals.discount)}</dd></div>
          )}
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{xof(totals.total)}</dd></div>
        </dl>
      </CardContent>
    </Card>
  );
}
