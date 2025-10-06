
'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getOrderByCodeAction, validateDeliveryAction } from '@/app/actions';
import { Loader2, PackageSearch, CheckCircle } from 'lucide-react';
import type { Category, Order } from '@/lib/types';
import Image from 'next/image';
import { getCategories } from '@/services/categoryService';

export default function ValidateDeliveryPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);

  useState(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Failed to fetch categories for header:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length !== 6) {
      toast({
        title: 'Code invalide',
        description: 'Veuillez entrer un code à 6 chiffres.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setOrder(null);
    setValidationSuccess(false);

    const result = await getOrderByCodeAction(code);

    if (result.success && result.order) {
      setOrder(result.order);
    } else {
      toast({
        title: 'Recherche infructueuse',
        description: result.error,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  const handleValidation = async () => {
    if (!order) return;
    setIsSubmitting(true);
    
    const result = await validateDeliveryAction(code); 
    
    if (result.success) {
      setOrder(null);
      setCode('');
      setValidationSuccess(true);
      toast({
        title: 'Livraison validée !',
        description: 'Le statut de la commande a été mis à jour.',
      });
    } else {
      toast({
        title: 'Erreur de validation',
        description: result.error,
        variant: 'destructive',
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header categories={categories} onToggleSidebar={() => {}} />
      <main className="flex-grow container mx-auto py-12 px-4 flex justify-center items-start">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-3xl text-center">Validation de Livraison</CardTitle>
            <CardDescription className="text-center">
              Entrez le code de validation à 6 chiffres fourni par le client.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
              <form onSubmit={handleSearch} className="flex items-start gap-2">
                <div className="flex-grow space-y-2">
                  <Label htmlFor="validation-code" className="sr-only">Code de validation</Label>
                  <Input
                    id="validation-code"
                    name="validation-code"
                    placeholder="_ _ _ _ _ _"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.trim());
                      setValidationSuccess(false);
                      setOrder(null);
                    }}
                    maxLength={6}
                    className="text-2xl text-center tracking-[0.5em] font-mono h-16"
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="h-16" disabled={isLoading || code.length !== 6}>
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <PackageSearch className="h-6 w-6" />}
                </Button>
              </form>

            {validationSuccess && (
              <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-green-800 dark:text-green-300">Livraison validée avec succès !</h3>
                  <p className="text-muted-foreground mt-2">Vous pouvez entrer un nouveau code pour valider une autre livraison.</p>
                </CardContent>
              </Card>
            )}

            {order && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle>Détails de la Commande</CardTitle>
                  <CardDescription>
                    Vérifiez les informations avec le client avant de valider.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p><strong>Client:</strong> {order.customerName}</p>
                    <p><strong>Adresse:</strong> {order.customerAddress}</p>
                    <p><strong>Total:</strong> {order.total.toLocaleString('fr-FR')} XOF</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Articles :</h4>
                    {order.items.map(item => (
                      <div key={item.id} className="flex items-center gap-4 text-sm p-2 rounded-md bg-background">
                        <Image src={item.product.gridImage.url} alt={item.product.name} width={40} height={40} className="rounded-md object-cover" />
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-muted-foreground">Taille: {item.size} | Couleur: {item.color} | Qté: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleValidation} disabled={isSubmitting} className="w-full h-12 text-lg">
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Validation...</>
                    ) : (
                      'Confirmer la Livraison'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
