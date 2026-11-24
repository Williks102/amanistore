import { RotateCcw } from 'lucide-react';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { itemCount, orderLines, shortOrderNumber } from '@/lib/order-display';

/** Ligne de l'historique (commandes livrées ou annulées). */
export function OrderHistoryRow({ order, onReorder }: { order: Order; onReorder?: (order: Order) => void }) {
  const count = itemCount(order);
  const summary = orderLines(order).map((l) => `${l.quantity} × ${l.name}`).join(', ');
  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold">N° {shortOrderNumber(order.id)}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(order.date).toLocaleDateString('fr-FR')} · {count} article{count > 1 ? 's' : ''} · {`XOF ${order.total.toLocaleString('fr-FR')}`}
        </p>
        {summary && <p className="mt-1 truncate text-sm text-muted-foreground">{summary}</p>}
      </div>
      <OrderStatusBadge status={order.status} className="shrink-0" />
      </div>
      {onReorder && (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onReorder(order)}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Recommander
        </Button>
      )}
    </li>
  );
}
