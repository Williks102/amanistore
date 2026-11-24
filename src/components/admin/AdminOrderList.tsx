'use client';

import { Inbox } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { itemCount, shortOrderNumber } from '@/lib/order-display';

type Props = {
  orders: Order[];
  filter: OrderStatus | 'all';
  onOpen: (order: Order) => void;
};

/** Liste des commandes: une carte par commande (lisible sur téléphone), le bouton « Détails » ouvre la fiche. */
export function AdminOrderList({ orders, filter, onOpen }: Props) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-8 w-8" />}
        title={filter === 'all' ? 'Aucune commande pour le moment' : `Aucune commande « ${filter} »`}
        hint={filter === 'all' ? 'Les commandes passées sur la boutique apparaîtront ici.' : 'Changez le filtre pour voir les autres commandes.'}
      />
    );
  }
  return (
    <ul className="divide-y divide-border rounded-lg border">
      {orders.map((order) => {
        const count = itemCount(order);
        return (
          <li key={order.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">N° {shortOrderNumber(order.id)}</span>
                <OrderStatusBadge status={order.status} />
                {order.guest && <Badge variant="secondary">Invité</Badge>}
              </p>
              <p className="truncate text-sm font-medium">{order.customerName} <span className="font-normal text-muted-foreground">· {order.customerPhone}</span></p>
              <p className="text-sm text-muted-foreground">
                {new Date(order.date).toLocaleDateString('fr-FR')} · {count} article{count > 1 ? 's' : ''} · <span className="font-medium text-foreground">{`XOF ${order.total.toLocaleString('fr-FR')}`}</span>
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-center" onClick={() => onOpen(order)} aria-label={`Détails de la commande ${shortOrderNumber(order.id)} de ${order.customerName}`}>
              Détails
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
