import type { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const TONES: Record<OrderStatus, { box: string; dot: string }> = {
  'En attente': { box: 'bg-amber-50 text-amber-900 border-amber-200', dot: 'bg-amber-500' },
  'Prêt': { box: 'bg-primary/10 text-foreground border-primary/30', dot: 'bg-primary' },
  'Livré': { box: 'bg-emerald-50 text-emerald-900 border-emerald-200', dot: 'bg-emerald-600' },
  'Annulé': { box: 'bg-secondary text-secondary-foreground border-border', dot: 'bg-muted-foreground' },
};

/**
 * Pastille d'état de commande. Le texte porte toujours l'information;
 * la couleur et le point ne font que la renforcer (jamais la couleur seule).
 */
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = TONES[status] ?? TONES['Annulé'];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium', tone.box, className)}>
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {status}
    </span>
  );
}
