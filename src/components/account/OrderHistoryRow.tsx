import type { Order } from '@/lib/types';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { itemCount, orderLines, shortOrderNumber } from '@/lib/order-display';

/** Ligne de l'historique (commandes livrées ou annulées). */
export function OrderHistoryRow({ order }: { order: Order }) {
  const count = itemCount(order);
  const summary = orderLines(order).map((l) => `${l.quantity} × ${l.name}`).join(', ');
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border p-4">
      <div className="min-w-0">
        <p className="font-semibold">N° {shortOrderNumber(order.id)}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(order.date).toLocaleDateString('fr-FR')} · {count} article{count > 1 ? 's' : ''} · {`XOF ${order.total.toLocaleString('fr-FR')}`}
        </p>
        {summary && <p className="mt-1 truncate text-sm text-muted-foreground">{summary}</p>}
      </div>
      <OrderStatusBadge status={order.status} className="shrink-0" />
    </li>
  );
}
