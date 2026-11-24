'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadError } from '@/components/LoadError';
import { EmptyState } from '@/components/EmptyState';
import { HomeButton, LogoutButton } from '@/components/DashboardActions';
import { OrderCard } from '@/components/account/OrderCard';
import { OrderHistoryRow } from '@/components/account/OrderHistoryRow';
import type { Category, Order } from '@/lib/types';
import { getOrdersForUser } from '@/app/actions';
import { getCategories } from '@/services/categoryService';
import { getIdToken } from '@/lib/get-id-token';
import { useUser } from '@/firebase';

const BuyerDashboard = () => {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    const { orders: fetched, error } = await getOrdersForUser(await getIdToken());
    if (error || !fetched) {
      setLoadError(true); // un vrai message d'erreur, plus de faux « aucune commande »
      setOrders([]);
    } else {
      setOrders(fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadOrders();
  }, [user, isUserLoading, router, loadOrders]);

  const currentOrders = useMemo(() => orders.filter((o) => o.status === 'En attente' || o.status === 'Prêt'), [orders]);
  const pastOrders = useMemo(() => orders.filter((o) => o.status === 'Livré' || o.status === 'Annulé'), [orders]);

  if (isUserLoading || (user && isLoading)) {
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

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header categories={categories} onToggleSidebar={() => router.push('/shop?search=1')} />
      <main className="container mx-auto flex-grow px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mon compte</h1>
            {user.email && <p className="mt-1 text-muted-foreground">{user.email}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/shop"><ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" /> Faire un autre achat</Link>
            </Button>
            <HomeButton variant="outline" />
            <LogoutButton variant="outline" />
          </div>
        </div>

        {loadError ? (
          <LoadError message="Impossible de charger vos commandes." onRetry={loadOrders} />
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
                    currentOrders.map((order) => <OrderCard key={order.id} order={order} />)
                  ) : (
                    <EmptyState icon={<ShoppingBag className="h-8 w-8" />} title="Aucune commande en cours" hint="Vos prochaines commandes apparaîtront ici." />
                  )}
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="history-title">
              <Card>
                <CardHeader>
                  <CardTitle id="history-title">Historique</CardTitle>
                  <CardDescription>Vos commandes livrées ou annulées.</CardDescription>
                </CardHeader>
                <CardContent>
                  {pastOrders.length > 0 ? (
                    <ul className="space-y-3">{pastOrders.map((order) => <OrderHistoryRow key={order.id} order={order} />)}</ul>
                  ) : (
                    <EmptyState title="Aucun historique" hint="Les commandes livrées ou annulées s'afficheront ici." />
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default BuyerDashboard;
