'use client';

import Image from 'next/image';
import { Copy, MessageCircle, Phone, Printer } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { useToast } from '@/hooks/use-toast';
import { customerWhatsappLink, telHref } from '@/lib/order-contact';
import { orderLines, orderTotals, shortOrderNumber } from '@/lib/order-display';

const STATUSES: OrderStatus[] = ['En attente', 'Prêt', 'Livré', 'Annulé'];
const xof = (n: number) => `XOF ${n.toLocaleString('fr-FR')}`;

type Props = {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
};

/**
 * Fiche d'une commande pour la préparer et la livrer: articles (pointure, couleur, quantité), cliente (téléphone,
 * adresse), totaux, changement de statut, appel, WhatsApp et impression. Le code de livraison n'y figure volontairement pas.
 */
export function OrderDetailDialog({ order, onClose, onStatusChange }: Props) {
  const { toast } = useToast();
  if (!order) return null;

  const lines = orderLines(order);
  const totals = orderTotals(order);
  const number = shortOrderNumber(order.id);
  const whatsapp = customerWhatsappLink(order.customerPhone, `Bonjour ${order.customerName}, c'est Amani's au sujet de votre commande n° ${number}.`);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copié` });
    } catch {
      toast({ title: 'Copie impossible', description: 'Recopiez à la main.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <div className="print-area space-y-5">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
              Commande n° {number}
              <OrderStatusBadge status={order.status} />
              {order.guest && <Badge variant="secondary">Invité</Badge>}
            </DialogTitle>
            <DialogDescription>Passée le {new Date(order.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</DialogDescription>
          </DialogHeader>

          <section aria-labelledby="od-customer" className="space-y-1 rounded-lg border p-3 text-sm">
            <h3 id="od-customer" className="mb-1 font-semibold">Cliente</h3>
            <p className="font-medium">{order.customerName}</p>
            <p><span className="text-muted-foreground">Téléphone: </span>{order.customerPhone}</p>
            {order.customerEmail && <p><span className="text-muted-foreground">E-mail: </span>{order.customerEmail}</p>}
            <p className="whitespace-pre-wrap break-words"><span className="text-muted-foreground">Livraison: </span>{order.customerAddress}</p>
            <div className="no-print flex flex-wrap gap-2 pt-2">
              <Button asChild variant="outline" size="sm"><a href={telHref(order.customerPhone)}><Phone className="h-4 w-4" aria-hidden="true" /> Appeler</a></Button>
              {whatsapp && <Button asChild variant="outline" size="sm"><a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp</a></Button>}
              <Button type="button" variant="outline" size="sm" onClick={() => copy(order.customerPhone, 'Numéro')}><Copy className="h-4 w-4" aria-hidden="true" /> Copier le numéro</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => copy(order.customerAddress, 'Adresse')}><Copy className="h-4 w-4" aria-hidden="true" /> Copier l&apos;adresse</Button>
            </div>
            {!whatsapp && <p className="no-print pt-1 text-xs text-muted-foreground">Le bouton WhatsApp apparaît quand le numéro commence par l&apos;indicatif du pays (+225, +221…).</p>}
          </section>

          <section aria-labelledby="od-items" className="space-y-3">
            <h3 id="od-items" className="font-semibold">Articles à préparer ({lines.reduce((n, l) => n + l.quantity, 0)})</h3>
            <ul className="space-y-3">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center gap-3 text-sm">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary">
                    {line.imageUrl ? <Image src={line.imageUrl} alt="" fill sizes="56px" className="object-cover" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{line.quantity} × {line.name}</span>
                    {line.options && <span className="block text-muted-foreground">{line.options}</span>}
                    <span className="block text-muted-foreground">{xof(line.unitPrice)} l&apos;unité</span>
                  </span>
                  <span className="shrink-0 font-semibold">{xof(line.total)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd>{xof(totals.subtotal)}</dd></div>
              {totals.discount > 0 && <div className="flex justify-between"><dt>Réduction{order.promoCode ? ` (${order.promoCode})` : ''}</dt><dd>− {xof(totals.discount)}</dd></div>}
              <div className="flex justify-between text-base font-bold"><dt>Total à encaisser</dt><dd>{xof(totals.total)}</dd></div>
            </dl>
          </section>
        </div>

        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" id="od-status-label">Statut</span>
            <Select value={order.status} onValueChange={(v) => onStatusChange(order.id, v as OrderStatus)}>
              <SelectTrigger className="w-[150px]" aria-labelledby="od-status-label"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Imprimer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
