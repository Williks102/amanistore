'use client';

import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { Category, ContactMessage, Order, PromoCode, Shoe } from '@/lib/types';
import type { Roles } from '@/lib/server-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { NotificationCard } from '@/components/admin/NotificationCard';
import { ageLabel, computeDashboard, type PeriodComparison } from '@/lib/dashboard-stats';
import { shortOrderNumber } from '@/lib/order-display';
import { cn } from '@/lib/utils';

export type DashboardTarget = 'orders' | 'products' | 'messages' | 'quality' | 'promotions';

type Props = {
  orders: Order[];
  shoes: Shoe[];
  categories: Category[];
  promoCodes: PromoCode[];
  messages: ContactMessage[];
  roles: Roles | null;
  onNavigate: (view: DashboardTarget) => void;
  now?: Date;
};

const xof = (n: number) => `XOF ${n.toLocaleString('fr-FR')}`;
const SECTION = 'space-y-3';

/** Variation en texte (signe et mots): la couleur ne porte jamais seule l'information. */
function Delta({ value, days }: { value: number | null; days: number }) {
  if (value === null) return <span className="text-xs text-muted-foreground">Pas de comparaison possible</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const tone = value > 0 ? 'text-green-700' : value < 0 ? 'text-red-700' : 'text-muted-foreground';
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', tone)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {value > 0 ? '+' : ''}{value} % <span className="font-normal text-muted-foreground">vs {days} jours précédents</span>
    </span>
  );
}

function PeriodCard({ title, days, data }: { title: string; days: number; data: PeriodComparison }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-muted-foreground">Commandes</dt><dd className="text-2xl font-bold">{data.current.orders}</dd><Delta value={data.ordersDelta} days={days} /></div>
          <div><dt className="text-sm text-muted-foreground">Chiffre d&apos;affaires</dt><dd className="whitespace-nowrap text-2xl font-bold">{xof(data.current.revenue)}</dd><Delta value={data.revenueDelta} days={days} /></div>
          <div><dt className="text-sm text-muted-foreground">Panier moyen</dt><dd className="whitespace-nowrap text-lg font-semibold">{xof(data.current.average)}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Livrées</dt><dd className="text-lg font-semibold">{data.current.delivered}</dd></div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function DashboardView({ orders, shoes, categories, promoCodes, messages, roles, onNavigate, now }: Props) {
  const stats = useMemo(
    () => computeDashboard({ orders, shoes, categories, promoCodes, messages, now: now ?? new Date() }),
    [orders, shoes, categories, promoCodes, messages, now]
  );
  const [bestWindow, setBestWindow] = useState<'month' | 'all'>('month');
  const clock = now ?? new Date();

  const canOrders = !!roles && (roles.admin || roles.orderManager);
  const canProducts = !!roles && (roles.admin || roles.productManager);
  const isAdmin = !!roles?.admin;

  const best = bestWindow === 'month' ? stats.bestMonth : stats.bestAll;
  const featuredIds = useMemo(() => new Set(shoes.filter((s) => s.featured).map((s) => s.id)), [shoes]);
  const maxDay = Math.max(1, ...stats.daily.map((d) => d.count));
  const totalDays = stats.daily.reduce((n, d) => n + d.count, 0);

  const orderList = (list: Order[], empty: string) =>
    list.length === 0 ? (
      <p className="text-sm text-muted-foreground">{empty}</p>
    ) : (
      <ul className="space-y-2 text-sm">
        {list.slice(0, 5).map((o) => (
          <li key={o.id} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">N° {shortOrderNumber(o.id)} · {o.customerName}</span>
            <span className="shrink-0 text-muted-foreground">{ageLabel(o.date, clock)}</span>
          </li>
        ))}
        {list.length > 5 && <li className="text-muted-foreground">et {list.length - 5} autre{list.length - 5 > 1 ? 's' : ''}…</li>}
      </ul>
    );

  return (
    <div className="space-y-10">
      {canOrders && (
        <section aria-labelledby="dash-todo" className={SECTION}>
          <h2 id="dash-todo" className="text-xl font-semibold">À traiter</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardDescription>Commandes en attente</CardDescription><CardTitle className="text-4xl">{stats.toProcess.pending.length}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {orderList(stats.toProcess.pending, 'Rien en attente.')}
                <Button variant="outline" size="sm" onClick={() => onNavigate('orders')}>Voir les commandes</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Prêtes à livrer</CardDescription><CardTitle className="text-4xl">{stats.toProcess.ready.length}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {orderList(stats.toProcess.ready, 'Aucune commande prête.')}
                <Button variant="outline" size="sm" onClick={() => onNavigate('orders')}>Voir les commandes</Button>
              </CardContent>
            </Card>
            {isAdmin && (
              <Card>
                <CardHeader className="pb-2"><CardDescription>Messages reçus (7 jours)</CardDescription><CardTitle className="text-4xl">{stats.toProcess.messagesThisWeek}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{messages.length} message{messages.length > 1 ? 's' : ''} au total.</p>
                  <Button variant="outline" size="sm" onClick={() => onNavigate('messages')}>Lire les messages</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {canOrders && (
        <section aria-labelledby="dash-activity" className={SECTION}>
          <h2 id="dash-activity" className="text-xl font-semibold">Activité</h2>
          <p className="text-sm text-muted-foreground">Commandes annulées exclues. Périodes glissantes, comparées à la période précédente de même durée.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <PeriodCard title="7 derniers jours" days={7} data={stats.week} />
            <PeriodCard title="30 derniers jours" days={30} data={stats.month} />
          </div>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg">Commandes par jour</CardTitle><CardDescription>14 derniers jours: {totalDays} commande{totalDays > 1 ? 's' : ''}</CardDescription></CardHeader>
            <CardContent>
              <div role="img" aria-label={`Commandes par jour sur 14 jours: ${stats.daily.map((d) => `${d.date.slice(8)}/${d.date.slice(5, 7)}: ${d.count}`).join(', ')}`} className="flex h-32 items-end gap-1">
                {stats.daily.map((d) => (
                  <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.date.slice(8)}/${d.date.slice(5, 7)}: ${d.count} commande${d.count > 1 ? 's' : ''}`}>
                    <span className="mb-0.5 text-center text-[10px] leading-none text-muted-foreground">{d.count > 0 ? d.count : ''}</span>
                    <div className={cn('w-full rounded-t', d.count > 0 ? 'bg-primary' : 'bg-border')} style={{ height: `${Math.max(d.count > 0 ? 8 : 2, (d.count / maxDay) * 100)}%`, maxHeight: '85%' }} />
                  </div>
                ))}
              </div>
              <div aria-hidden="true" className="mt-1 flex gap-1">
                {stats.daily.map((d, i) => <span key={d.date} className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground">{i % 2 === 0 ? d.date.slice(8) : ''}</span>)}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {canOrders && (
        <section aria-labelledby="dash-sales" className={SECTION}>
          <h2 id="dash-sales" className="text-xl font-semibold">Ventes</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">Meilleures ventes</CardTitle>
                  <div className="flex gap-2" role="group" aria-label="Période des meilleures ventes">
                    <Button size="sm" variant={bestWindow === 'month' ? 'secondary' : 'outline'} aria-pressed={bestWindow === 'month'} onClick={() => setBestWindow('month')}>30 jours</Button>
                    <Button size="sm" variant={bestWindow === 'all' ? 'secondary' : 'outline'} aria-pressed={bestWindow === 'all'} onClick={() => setBestWindow('all')}>Depuis le début</Button>
                  </div>
                </div>
                <CardDescription>Par nombre de paires commandées.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {best.length === 0 ? (
                  <EmptyState title="Pas encore de vente sur cette période" hint="Les produits les plus commandés apparaîtront ici." />
                ) : (
                  <ol className="space-y-3">
                    {best.map((p, i) => (
                      <li key={p.productId} className="flex items-baseline gap-3">
                        <span className="w-6 shrink-0 text-lg font-bold text-primary">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-medium">{p.name}{featuredIds.has(p.productId) && <Badge variant="secondary" className="ml-2">Coup de cœur</Badge>}</span>
                        <span className="shrink-0 text-right text-sm"><strong>{p.quantity}</strong> vendu{p.quantity > 1 ? 's' : ''}<span className="block text-xs text-muted-foreground">{xof(p.revenue)}</span></span>
                      </li>
                    ))}
                  </ol>
                )}
                {canProducts && <Button variant="outline" size="sm" onClick={() => onNavigate('products')}>Choisir les coups de cœur</Button>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg">Avec ou sans compte</CardTitle><CardDescription>30 derniers jours</CardDescription></CardHeader>
              <CardContent>
                {stats.channels.total === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune commande sur la période.</p>
                ) : (
                  <div className="space-y-3">
                    <div role="img" aria-label={`Sans compte: ${stats.channels.guest} commandes, avec compte: ${stats.channels.account} commandes`} className="flex h-4 overflow-hidden rounded-full bg-border">
                      <div className="bg-primary" style={{ width: `${stats.channels.guestPercent ?? 0}%` }} />
                    </div>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between"><dt>Sans compte</dt><dd className="font-semibold">{stats.channels.guest} ({stats.channels.guestPercent} %)</dd></div>
                      <div className="flex justify-between"><dt>Avec compte</dt><dd className="font-semibold">{stats.channels.account} ({100 - (stats.channels.guestPercent ?? 0)} %)</dd></div>
                    </dl>
                    <p className="text-xs text-muted-foreground">Une commande rattachée à un compte compte comme « avec compte ».</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {canProducts && (
        <section aria-labelledby="dash-stock" className={SECTION}>
          <h2 id="dash-stock" className="text-xl font-semibold">Stock et catalogue</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg">Alertes de stock</CardTitle><CardDescription>{stats.stock.tracked} produit{stats.stock.tracked > 1 ? 's' : ''} suivi{stats.stock.tracked > 1 ? 's' : ''}, {stats.stock.untracked} sans suivi (illimité)</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {stats.stock.tracked === 0 ? (
                  <p className="text-sm text-muted-foreground">Le stock n&apos;est suivi pour aucun produit. Renseignez-le dans « Modifier » (ex. 38:5, 39:3) pour recevoir des alertes ici.</p>
                ) : stats.stock.outOfStock.length === 0 && stats.stock.lowSizes.length === 0 ? (
                  <p className="text-sm">Aucune alerte: les produits suivis ont du stock.</p>
                ) : (
                  <>
                    {stats.stock.outOfStock.length > 0 && (
                      <div><p className="mb-1 text-sm font-semibold">Épuisés ({stats.stock.outOfStock.length})</p><ul className="space-y-1 text-sm">{stats.stock.outOfStock.slice(0, 6).map((s) => <li key={s.id} className="truncate">{s.name}</li>)}</ul></div>
                    )}
                    {stats.stock.lowSizes.length > 0 && (
                      <div><p className="mb-1 text-sm font-semibold">Presque épuisées ({stats.stock.lowSizes.length})</p><ul className="space-y-1 text-sm">{stats.stock.lowSizes.slice(0, 8).map((s) => <li key={`${s.id}-${s.size}`} className="flex justify-between gap-3"><span className="min-w-0 truncate">{s.name} · pointure {s.size}</span><span className="shrink-0 text-amber-800">{s.quantity} restante{s.quantity > 1 ? 's' : ''}</span></li>)}</ul></div>
                    )}
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => onNavigate('products')}>Voir les produits</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg">Catalogue</CardTitle><CardDescription>{stats.catalog.products} produits, {stats.catalog.categories} catégories</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  {stats.catalog.issues === 0 ? 'Aucune anomalie dans le catalogue.' : <><strong>{stats.catalog.issues} produit{stats.catalog.issues > 1 ? 's' : ''}</strong> à vérifier (prix, pointures, couleurs, photos, description).</>}
                </p>
                {stats.neverOrdered.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-semibold">Jamais commandés ({stats.neverOrdered.length})</p>
                    <p className="truncate text-sm text-muted-foreground">{stats.neverOrdered.slice(0, 4).map((s) => s.name).join(', ')}{stats.neverOrdered.length > 4 ? '…' : ''}</p>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => onNavigate('quality')}>Qualité du catalogue</Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {isAdmin && (
        <section aria-labelledby="dash-promos" className={SECTION}>
          <h2 id="dash-promos" className="text-xl font-semibold">Codes promo</h2>
          <Card>
            <CardContent className="pt-6">
              {stats.promos.length === 0 ? (
                <EmptyState title="Aucun code promo" hint="Créez un code dans « Promotions »." />
              ) : (
                <ul className="divide-y divide-border">
                  {stats.promos.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{p.code}</p>
                        <p className="text-sm text-muted-foreground">
                          Utilisé {p.used}{p.maxUses ? ` sur ${p.maxUses}` : ''} · {xof(p.discountGiven)} de remises
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {!p.isActive && <Badge variant="secondary">Inactif</Badge>}
                        {p.expired && <Badge variant="secondary">Expiré</Badge>}
                        {p.expiresSoon && <Badge variant="secondary">Expire bientôt</Badge>}
                        {p.nearLimit && <Badge variant="secondary">Presque épuisé</Badge>}
                        {p.maxUses && p.used >= p.maxUses && <Badge variant="secondary">Limite atteinte</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="outline" size="sm" className="mt-4" onClick={() => onNavigate('promotions')}>Gérer les promotions</Button>
            </CardContent>
          </Card>
        </section>
      )}

      {isAdmin && (
        <section aria-labelledby="dash-notif" className={SECTION}>
          <h2 id="dash-notif" className="text-xl font-semibold">Notifications</h2>
          <NotificationCard />
        </section>
      )}

      {!canOrders && !canProducts && <EmptyState title="Aucun indicateur pour votre rôle" />}
    </div>
  );
}
