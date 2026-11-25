'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, UserPlus } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadError } from '@/components/LoadError';
import { EmptyState } from '@/components/EmptyState';
import { HomeButton, LogoutButton } from '@/components/DashboardActions';
import { OrderCard } from '@/components/account/OrderCard';
import { OrderHistoryRow } from '@/components/account/OrderHistoryRow';
import { ProfileCard } from '@/components/account/ProfileCard';
import type { Category, Order } from '@/lib/types';
import { claimGuestOrders, getGuestOrder, getOrdersForUser } from '@/app/actions';
import { getCategories } from '@/services/categoryService';
import { getProducts } from '@/services/productService';
import { getIdToken } from '@/lib/get-id-token';
import { listGuestOrders, removeGuestOrders } from '@/lib/guest-orders';
import { planReorder } from '@/lib/reorder';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

const byDateDesc = (a: Order, b: Order) => new Date(b.date).getTime() - new Date(a.date).getTime();

/**
 * « Mon compte ». Connectée: commandes du compte (celles passées sans compte sur cet appareil y sont rattachées
 * automatiquement) et coordonnées. Pas connectée: les commandes passées sans compte sur cet appareil.
 */
const BuyerDashboard = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { addItem, onOpen } = useCart();
  const { user, isUserLoading } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const loadAccountOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    const token = await getIdToken();
    // Rattachement des commandes passées sans compte sur cet appareil (preuve: leur secret, gardé ici).
    const local = listGuestOrders();
    if (local.length > 0) {
      const claim = await claimGuestOrders(token, local);
      if (claim.success && claim.claimed.length > 0) {
        removeGuestOrders(claim.claimed);
        const n = claim.claimed.length;
        toast({ title: 'Commandes rattachées à votre compte', description: `${n} commande${n > 1 ? 's' : ''} passée${n > 1 ? 's' : ''} sans compte ${n > 1 ? 'sont' : 'est'} maintenant dans votre compte.` });
      }
    }
    const { orders: fetched, error } = await getOrdersForUser(token);
    if (error || !fetched) {
      setLoadError(true); // un vrai message d'erreur, plus de faux « aucune commande »
      setOrders([]);
    } else {
      setOrders(fetched.sort(byDateDesc));
    }
    setIsLoading(false);
  }, [toast]);

  const loadGuestOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    const local = listGuestOrders();
    const results = await Promise.all(local.map(({ orderId, secret }) => getGuestOrder(orderId, secret)));
    const found = results.flatMap((r) => (r.order ? [r.order] : []));
    const technicalFailure = results.some((r) => !r.order && r.error && r.error !== 'Commande introuvable.');
    setLoadError(found.length === 0 && technicalFailure);
    setOrders(found.sort(byDateDesc));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isUserLoading) return;
    if (user) loadAccountOrders();
    else loadGuestOrders();
  }, [user, isUserLoading, loadAccountOrders, loadGuestOrders]);

  const handleReorder = useCallback(async (order: Order) => {
    try {
      const plan = planReorder(order.items, await getProducts());
      if (plan.toAdd.length === 0) {
        toast({ title: 'Impossible de recommander', description: plan.skipped.map((s) => `${s.name}: ${s.reason}`).join(' · ') || 'Aucun article disponible.', variant: 'destructive' });
        return;
      }
      plan.toAdd.forEach((line) => addItem(line.product, line.quantity, line.selection));
      const notes = [
        plan.skipped.length ? `Non ajouté: ${plan.skipped.map((s) => `${s.name} (${s.reason})`).join(', ')}.` : '',
        plan.reduced.length ? `Quantité réduite (stock): ${plan.reduced.join(', ')}.` : '',
      ].filter(Boolean).join(' ');
      toast({ title: `${plan.toAdd.length} article${plan.toAdd.length > 1 ? 's' : ''} ajouté${plan.toAdd.length > 1 ? 's' : ''} au panier`, description: notes || 'Vérifiez votre panier avant de commander.' });
      onOpen();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de recommander pour le moment.', variant: 'destructive' });
    }
  }, [addItem, onOpen, toast]);

  const currentOrders = useMemo(() => orders.filter((o) => o.status === 'En attente' || o.status === 'Prêt'), [orders]);
  const pastOrders = useMemo(() => orders.filter((o) => o.status === 'Livré' || o.status === 'Annulé'), [orders]);
  const isGuestView = !isUserLoading && !user;

  if (isUserLoading || isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header categories={categories} onToggleSidebar={() => router.push('/shop?search=1')} />
        <main aria-busy="true" className="container mx-auto flex-grow px-4 py-8">
          <Skeleton className="mb-8 h-9 w-48" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
            <div className="space-y-4 lg:col-span-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header categories={categories} onToggleSidebar={() => router.push('/shop?search=1')} />
      <main className="container mx-auto flex-grow px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{isGuestView ? 'Mes commandes' : 'Mon compte'}</h1>
            <p className="mt-1 text-muted-foreground">{isGuestView ? 'Commandes passées sans compte sur cet appareil.' : user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/shop"><ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" /> Faire un autre achat</Link>
            </Button>
            <HomeButton variant="outline" />
            {!isGuestView && <LogoutButton variant="outline" />}
          </div>
        </div>

        {isGuestView && (
          <Card className="mb-8 border-primary/30 bg-primary/10">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                <strong>Créez un compte pour retrouver vos commandes partout.</strong> Celles passées sur cet appareil seront rattachées automatiquement à votre compte.
              </p>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button asChild><Link href="/signup"><UserPlus className="mr-2 h-4 w-4" aria-hidden="true" /> Créer un compte</Link></Button>
                <Button asChild variant="outline"><Link href="/login">Se connecter</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loadError ? (
          <LoadError message="Impossible de charger vos commandes." onRetry={isGuestView ? loadGuestOrders : loadAccountOrders} />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
            <section aria-labelledby="current-title" className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle id="current-title">Suivi de commande</CardTitle>
                  <CardDescription>L&apos;avancement de vos commandes en cours.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentOrders.length > 0 ? (
                    currentOrders.map((order) => <OrderCard key={order.id} order={order} onReorder={handleReorder} />)
                  ) : (
                    <EmptyState
                      icon={<ShoppingBag className="h-8 w-8" />}
                      title={isGuestView ? 'Aucune commande sur cet appareil' : 'Aucune commande en cours'}
                      hint={isGuestView ? 'Passée depuis un autre appareil ? Connectez-vous pour la retrouver.' : 'Vos prochaines commandes apparaîtront ici.'}
                    />
                  )}
                </CardContent>
              </Card>
            </section>

            <div className="space-y-8">
              <section aria-labelledby="history-title">
                <Card>
                  <CardHeader>
                    <CardTitle id="history-title">Historique</CardTitle>
                    <CardDescription>Vos commandes livrées ou annulées.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pastOrders.length > 0 ? (
                      <ul className="space-y-3">{pastOrders.map((order) => <OrderHistoryRow key={order.id} order={order} onReorder={handleReorder} />)}</ul>
                    ) : (
                      <EmptyState title="Aucun historique" hint="Les commandes livrées ou annulées s'afficheront ici." />
                    )}
                  </CardContent>
                </Card>
              </section>
              {!isGuestView && <ProfileCard />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BuyerDashboard;
