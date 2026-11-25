'use client';

import { Tag } from 'lucide-react';
import type { PromoCode } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';

type Props = {
  promoCodes: PromoCode[];
  onToggle: (promo: PromoCode) => void;
  onDelete: (id: string) => void;
};

/** Codes promo: une carte par code (lisible dès 320 px, sans tableau qui déborde). */
export function AdminPromoList({ promoCodes, onToggle, onDelete }: Props) {
  if (promoCodes.length === 0) {
    return <EmptyState icon={<Tag className="h-8 w-8" />} title="Aucun code promo" hint="Créez un code avec le formulaire." />;
  }
  return (
    <ul className="space-y-3">
      {promoCodes.map((promo) => (
        <li key={promo.id} className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-all text-base font-semibold">{promo.code}</p>
              <p className="text-sm">
                {promo.discountType === 'percentage' ? `${promo.value} %` : `${promo.value.toLocaleString('fr-FR')} XOF`} de remise
              </p>
            </div>
            <Badge variant={promo.isActive ? 'default' : 'secondary'} className="shrink-0">{promo.isActive ? 'Actif' : 'Inactif'}</Badge>
          </div>
          <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
            <li>Utilisé: {promo.usedCount ?? 0}{promo.maxUses ? ` / ${promo.maxUses}` : ''}</li>
            {promo.expiresAt && <li>Expire le {new Date(promo.expiresAt).toLocaleDateString('fr-FR')}</li>}
            {promo.minOrderAmount ? <li>Commande minimum: {promo.minOrderAmount.toLocaleString('fr-FR')} XOF</li> : null}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onToggle(promo)}>{promo.isActive ? 'Désactiver' : 'Activer'}</Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(promo.id)} aria-label={`Supprimer le code ${promo.code}`}>Supprimer</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
