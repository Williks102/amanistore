import type { Category, ContactMessage, Order, PromoCode, Shoe } from './types';
import { productIssues } from './product-validation';

/**
 * Indicateurs du tableau de bord de l'admin, calculés à partir des données déjà chargées (donc déjà filtrées par rôle).
 * Conventions: une commande annulée ne compte jamais; les périodes sont glissantes (7 et 30 jours, comparées aux
 * 7 et 30 jours précédents); les jours sont des jours UTC (identiques à l'heure locale en Côte d'Ivoire et au Sénégal).
 */
export type DashboardInput = {
  orders: Order[];
  shoes: Shoe[];
  categories: Category[];
  promoCodes: PromoCode[];
  messages: ContactMessage[];
  now?: Date;
};

export type PeriodStats = { orders: number; revenue: number; average: number; delivered: number };
export type PeriodComparison = { current: PeriodStats; previous: PeriodStats; ordersDelta: number | null; revenueDelta: number | null };
export type TopProduct = { productId: string; name: string; quantity: number; revenue: number };

const DAY = 24 * 60 * 60 * 1000;
const LOW_STOCK = 3;

const time = (o: Pick<Order, 'date'>) => new Date(o.date).getTime();
const counted = (o: Order) => o.status !== 'Annulé';
const isGuest = (o: Order) => o.guest === true || !o.userId;

/** Variation en % entre deux valeurs, ou null s'il n'y avait rien avant (on n'invente pas un « +∞ % »). */
export const percentChange = (current: number, previous: number): number | null =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 100);

function periodStats(orders: Order[], from: number, to: number): PeriodStats {
  const inRange = orders.filter((o) => counted(o) && time(o) >= from && time(o) < to);
  const revenue = inRange.reduce((sum, o) => sum + o.total, 0);
  return {
    orders: inRange.length,
    revenue,
    average: inRange.length ? Math.round(revenue / inRange.length) : 0,
    delivered: inRange.filter((o) => o.status === 'Livré').length,
  };
}

export function comparePeriod(orders: Order[], days: number, now: Date): PeriodComparison {
  const end = now.getTime() + 1; // inclut les commandes de la seconde courante
  const current = periodStats(orders, end - days * DAY, end);
  const previous = periodStats(orders, end - 2 * days * DAY, end - days * DAY);
  return { current, previous, ordersDelta: percentChange(current.orders, previous.orders), revenueDelta: percentChange(current.revenue, previous.revenue) };
}

/** Produits les plus commandés (quantités), sur les `days` derniers jours ou depuis toujours (`days = null`). */
export function topProducts(orders: Order[], days: number | null, now: Date, limit = 5): TopProduct[] {
  const from = days === null ? -Infinity : now.getTime() + 1 - days * DAY;
  const byProduct = new Map<string, TopProduct>();
  for (const order of orders) {
    if (!counted(order) || time(order) < from) continue;
    for (const item of order.items ?? []) {
      const entry = byProduct.get(item.product.id) ?? { productId: item.product.id, name: item.product.name, quantity: 0, revenue: 0 };
      entry.quantity += item.quantity;
      entry.revenue += item.product.price * item.quantity;
      byProduct.set(item.product.id, entry);
    }
  }
  return [...byProduct.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.name.localeCompare(b.name)).slice(0, limit);
}

/** Nombre de commandes par jour sur les `days` derniers jours (jours sans commande inclus, du plus ancien au plus récent). */
export function dailyOrders(orders: Order[], days: number, now: Date): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (!counted(o)) continue;
    const key = new Date(o.date).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now.getTime() - (days - 1 - i) * DAY).toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });
}

/** « aujourd'hui », « hier », « il y a 3 jours ». */
export function ageLabel(date: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(date).getTime()) / DAY);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  return `il y a ${days} jours`;
}

export type StockAlerts = {
  outOfStock: Array<{ id: string; name: string }>;
  lowSizes: Array<{ id: string; name: string; size: number; quantity: number }>;
  tracked: number;
  untracked: number;
};

/** Alertes de stock sur les produits dont le stock est suivi (les autres sont illimités). */
export function stockAlerts(shoes: Shoe[]): StockAlerts {
  const out: StockAlerts = { outOfStock: [], lowSizes: [], tracked: 0, untracked: 0 };
  for (const shoe of shoes) {
    if (!shoe.stock) { out.untracked += 1; continue; }
    out.tracked += 1;
    const quantities = (shoe.availableSizes ?? []).map((size) => ({ size, quantity: Math.max(0, Math.floor(shoe.stock?.[String(size)] ?? 0)) }));
    if (quantities.every((q) => q.quantity === 0)) out.outOfStock.push({ id: shoe.id, name: shoe.name });
    else for (const q of quantities) if (q.quantity > 0 && q.quantity <= LOW_STOCK) out.lowSizes.push({ id: shoe.id, name: shoe.name, size: q.size, quantity: q.quantity });
  }
  out.lowSizes.sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name) || a.size - b.size);
  return out;
}

export type PromoStat = {
  id: string; code: string; isActive: boolean; used: number; maxUses?: number; expiresAt?: string;
  expiresSoon: boolean; expired: boolean; nearLimit: boolean; ordersCount: number; discountGiven: number;
};

/** Utilisation de chaque code promo (compteur du code, remises réellement accordées d'après les commandes). */
export function promoStats(promoCodes: PromoCode[], orders: Order[], now: Date): PromoStat[] {
  return promoCodes.map((promo) => {
    const used = orders.filter((o) => counted(o) && o.promoCodeId === promo.id);
    const expiresAt = promo.expiresAt;
    const expiry = expiresAt ? new Date(expiresAt).getTime() : null;
    const expired = expiry !== null && !Number.isNaN(expiry) && expiry < now.getTime();
    const usedCount = promo.usedCount ?? 0;
    return {
      id: promo.id, code: promo.code, isActive: promo.isActive, used: usedCount, maxUses: promo.maxUses, expiresAt,
      expired, expiresSoon: expiry !== null && !expired && expiry - now.getTime() <= 7 * DAY,
      nearLimit: typeof promo.maxUses === 'number' && promo.maxUses > 0 && usedCount < promo.maxUses && usedCount / promo.maxUses >= 0.8,
      ordersCount: used.length, discountGiven: used.reduce((sum, o) => sum + (o.discount ?? 0), 0),
    };
  }).sort((a, b) => b.used - a.used || a.code.localeCompare(b.code));
}

export type DashboardStats = ReturnType<typeof computeDashboard>;

export function computeDashboard({ orders, shoes, categories, promoCodes, messages, now = new Date() }: DashboardInput) {
  const oldestFirst = (a: Order, b: Order) => time(a) - time(b);
  const monthStart = now.getTime() + 1 - 30 * DAY;
  const monthOrders = orders.filter((o) => counted(o) && time(o) >= monthStart);
  const guest = monthOrders.filter(isGuest).length;

  const everOrdered = new Set<string>();
  for (const o of orders) if (counted(o)) for (const item of o.items ?? []) everOrdered.add(item.product.id);

  const withIssues = shoes.filter((s) => productIssues(s, categories).length > 0);

  return {
    toProcess: {
      pending: orders.filter((o) => o.status === 'En attente').sort(oldestFirst),
      ready: orders.filter((o) => o.status === 'Prêt').sort(oldestFirst),
      messagesThisWeek: messages.filter((m) => new Date(m.createdAt).getTime() >= now.getTime() + 1 - 7 * DAY).length,
    },
    week: comparePeriod(orders, 7, now),
    month: comparePeriod(orders, 30, now),
    daily: dailyOrders(orders, 14, now),
    bestMonth: topProducts(orders, 30, now),
    bestAll: topProducts(orders, null, now),
    channels: { guest, account: monthOrders.length - guest, total: monthOrders.length, guestPercent: monthOrders.length ? Math.round((guest / monthOrders.length) * 100) : null },
    stock: stockAlerts(shoes),
    // « Jamais commandés » n'a de sens que s'il y a déjà eu des commandes.
    neverOrdered: orders.some(counted) ? shoes.filter((s) => !everOrdered.has(s.id)).map((s) => ({ id: s.id, name: s.name })) : [],
    catalog: { products: shoes.length, categories: categories.length, issues: withIssues.length },
    promos: promoStats(promoCodes, orders, now),
  };
}
