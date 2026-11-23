import type { PromoCode } from './types';

type PromoLike = Pick<PromoCode, 'discountType' | 'value' | 'isActive'> &
  Partial<Pick<PromoCode, 'expiresAt' | 'maxUses' | 'usedCount' | 'minOrderAmount'>>;

/** Retourne un message d'erreur si le code ne peut pas s'appliquer, sinon null. */
export function promoProblem(promo: PromoLike, subtotal?: number, now: Date = new Date()): string | null {
  if (!promo.isActive) return "Ce code promo n'est plus actif.";
  if (promo.expiresAt) {
    const exp = new Date(promo.expiresAt);
    if (!Number.isNaN(exp.getTime()) && now.getTime() > exp.getTime()) return 'Ce code promo a expiré.';
  }
  if (typeof promo.maxUses === 'number' && (promo.usedCount ?? 0) >= promo.maxUses) {
    return "Ce code promo a atteint sa limite d'utilisation.";
  }
  if (typeof promo.minOrderAmount === 'number' && promo.minOrderAmount > 0 && subtotal !== undefined && subtotal < promo.minOrderAmount) {
    return `Commande minimum de ${promo.minOrderAmount.toLocaleString('fr-FR')} XOF requise pour ce code.`;
  }
  return null;
}

/** Montant de la remise, plafonné au sous-total (jamais de total négatif). */
export function computeDiscount(promo: Pick<PromoCode, 'discountType' | 'value'>, subtotal: number): number {
  const raw = promo.discountType === 'percentage'
    ? subtotal * (Math.min(Math.max(promo.value, 0), 100) / 100)
    : Math.max(promo.value, 0);
  return Math.min(raw, subtotal);
}
