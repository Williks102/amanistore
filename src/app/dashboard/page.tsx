
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Order, OrderStatus } from '@/lib/types';
import { ShoppingBag, KeyRound } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getOrdersForUser } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

const getStatusVariant = (status: OrderStatus) => {
  switch (status) {
    case 'Prêt':
      return 'default';
    case 'Livré':
      return 'secondary';
    case 'Annulé':
      return 'destructive';
    case 'En attente':
    default:
      return 'outline';
  }
};

const OrderTracker = ({ orders }: { orders: Order[] }) => {
  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle className="text-xl">Commande #{order.id.substring(0, 6)}...</CardTitle>
              <CardDescription>
                Passée le {new Date(order.date).toLocaleDateString('fr-FR')} - Total: {`XOF ${order.total.toLocaleString('fr-FR')}`}
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(order.status)} className="text-sm">
              {order.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm font-medium mb-4">
              <div className={cn("text-center", order.status === 'En attente' ? 'text-primary font-bold' : 'text-muted-foreground')}>En attente</div>
              <div className={cn("text-center", order.status === 'Prêt' ? 'text-primary font-bold' : 'text-muted-foreground')}>Prêt</div>
              <div className={cn("text-center", order.status === 'Livré' ? 'text-primary font-bold' : 'text-muted-foreground')}>Livré</div>
            </div>
            <div className="relative w-full h-2 bg-muted rounded-full">
              <div
                className="absolute top-0 left-0 h-2 bg-primary rounded-full transition-all duration-500"
                style={{
                  width:
                    order.status === 'En attente'
                      ? '15%'
                      : order.status === 'Prêt'
                      ? '50%'
                      : order.status === 'Livré'
                      ? '100%'
                      : '0%',
                }}
              />
            </div>
            <Separator className="my-6" />

            {order.status !== 'Livré' && order.status !== 'Annulé' && (
                <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <KeyRound className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300">Votre code de livraison</h3>
                    </div>
                    <p className="text-2xl font-bold tracking-widest text-blue-700 dark:text-blue-400">{order.validationCode}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">À fournir au livreur pour confirmer la réception.</p>
                </div>
            )}
            
            <p className="font-semibold mb-3">Articles de votre commande :</p>
            <div className="space-y-4">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center gap-4 text-sm">
                    <Image src={item.product.gridImage.url} alt={item.product.name} width={60} height={60} className="rounded-md object-cover" />
                    <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-muted-foreground">Taille: {item.size} | {`XOF ${item.product.price.toLocaleString('fr-FR')}`}</p>
                    </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const OrderHistory = ({ orders }: { orders: Order[] }) => {
  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="border rounded-lg p-4 flex justify-between items-center">
          <div>
            <p className="font-semibold">#{order.id.substring(0,6)}...</p>
            <p className="text-sm text-muted-foreground">
              {new Date(order.date).toLocaleDateString('fr-FR')} - {`XOF ${order.total.toLocaleString('fr-FR')}`}
            </p>
          </div>
          <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
        </div>
      ))}
    </div>
  );
};

const BuyerDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const fetchOrders = async () => {
        setIsLoading(true);
        const { orders: fetchedOrders, error } = await getOrdersForUser(user.uid);
        
        if (error) {
          console.error("Failed to fetch orders:", error);
          toast({
            title: 'Erreur',
            description: 'Impossible de charger vos commandes.',
            variant: 'destructive'
          })
          setOrders([]);
        } else if (fetchedOrders) {
          setOrders(fetchedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }

        setIsLoading(false);
      };
      fetchOrders();
    }
  }, [user, isUserLoading, router, toast]);

  const currentOrders = orders.filter(o => o.status === 'En attente' || o.status === 'Prêt');
  const pastOrders = orders.filter(o => o.status === 'Livré' || o.status === 'Annulé');

  if (isUserLoading || isLoading) {
    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-10 w-44" />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Mon Compte</h1>
        <Button asChild>
          <Link href="/">
            <ShoppingBag className="mr-2 h-4 w-4" /> Faire un autre achat
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Suivi de commande</CardTitle>
              <CardDescription>Suivez en temps réel l'avancement de vos commandes en cours.</CardDescription>
            </CardHeader>
            <CardContent>
                {currentOrders.length > 0 ? (
                    <OrderTracker orders={currentOrders} />
                ) : (
                    <p className="text-muted-foreground text-center py-8">Vous n'avez aucune commande en cours.</p>
                )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Historique des commandes</CardTitle>
              <CardDescription>Consultez vos commandes terminées ou annulées.</CardDescription>
            </CardHeader>
            <CardContent>
              {pastOrders.length > 0 ? (
                <OrderHistory orders={pastOrders} />
              ) : (
                 <p className="text-muted-foreground text-center py-8">Aucun historique de commande trouvé.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
