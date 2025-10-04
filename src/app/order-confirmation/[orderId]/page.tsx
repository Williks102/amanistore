
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOrderById } from '@/services/orderService';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, Home, ShoppingBag, KeyRound, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orderId = params.orderId as string;

  useEffect(() => {
    if (!orderId) {
      setError("ID de commande manquant.");
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const fetchedOrder = await getOrderById(orderId);
        if (fetchedOrder) {
          setOrder(fetchedOrder);
        } else {
          setError("Commande non trouvée.");
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
        setError("Impossible de charger les détails de la commande.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);
  
  const handleCopyToClipboard = () => {
    if(order?.validationCode) {
      navigator.clipboard.writeText(order.validationCode);
      toast({
        title: "Copié !",
        description: "Le code de validation a été copié dans le presse-papiers.",
      })
    }
  }


  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button asChild className="mt-6">
              <Link href="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return null; 
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="text-3xl mt-4">Merci pour votre commande !</CardTitle>
            <CardDescription className="text-base">
              Votre commande a été passée avec succès.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <KeyRound className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-800 dark:text-blue-300">Votre code de validation pour la livraison</h3>
              </div>
              <div className="flex justify-center items-center gap-2">
                <p className="text-3xl font-bold tracking-widest text-blue-700 dark:text-blue-400">{order.validationCode}</p>
                <Button variant="ghost" size="icon" onClick={handleCopyToClipboard}>
                    <Copy className="h-5 w-5"/>
                </Button>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">Conservez ce code précieusement. Vous devrez le fournir au livreur.</p>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                    <h4 className="font-semibold mb-2">Adresse de livraison</h4>
                    <p className="text-muted-foreground">{order.customerName}</p>
                    <p className="text-muted-foreground">{order.customerAddress}</p>
                    <p className="text-muted-foreground">{order.customerPhone}</p>
                </div>
                 <div>
                    <h4 className="font-semibold mb-2">Résumé</h4>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Commande n°:</span>
                        <span className="font-medium">#{order.id.substring(0, 7)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">{new Date(order.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                     <div className="flex justify-between font-bold mt-2">
                        <span>Total:</span>
                        <span>{order.total.toLocaleString('fr-FR')} XOF</span>
                    </div>
                </div>
            </div>
            
            <Separator />

            <div>
              <h4 className="font-semibold mb-3">Articles commandés</h4>
              <div className="space-y-4">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center gap-4">
                    <Image 
                      src={item.product.gridImage.url} 
                      alt={item.product.name} 
                      width={64} 
                      height={64} 
                      className="rounded-md border object-cover"
                    />
                    <div className="flex-grow">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Taille: {item.size} | Couleur: {item.color} | Qté: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-sm">
                      {(item.product.price * item.quantity).toLocaleString('fr-FR')} XOF
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />

            <div className="flex flex-col sm:flex-row gap-4">
                 <Button asChild className="w-full">
                    <Link href="/dashboard">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Suivre ma commande
                    </Link>
                </Button>
                 <Button asChild variant="outline" className="w-full">
                    <Link href="/">
                        <Home className="mr-2 h-4 w-4" />
                        Retour à l'accueil
                    </Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
