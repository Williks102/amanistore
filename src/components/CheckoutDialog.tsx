
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { addOrder } from '@/services/orderService';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Le nom est requis (2 caractères min).' }),
  phone: z.string().min(9, { message: 'Le numéro de téléphone est requis.' }),
  email: z.string().email({ message: 'Adresse e-mail invalide.' }).optional().or(z.literal('')),
  address: z.string().min(10, { message: 'Veuillez fournir une adresse plus détaillée.' }),
});

type CheckoutFormValues = z.infer<typeof formSchema>;

interface CheckoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CheckoutDialog = ({ isOpen, onOpenChange }: CheckoutDialogProps) => {
  const { items, clearCart } = useCart();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.product.price * item.quantity, 0), [items]);
  const total = subtotal - discount;

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
    },
  });

  const handleApplyPromoCode = () => {
    if (promoCode.toUpperCase() === 'PROMO10') {
      const discountAmount = subtotal * 0.10;
      setDiscount(discountAmount);
      toast({
        title: 'Code promo appliqué !',
        description: `Vous avez obtenu une réduction de ${discountAmount.toLocaleString('fr-FR')} XOF.`,
      });
    } else {
      toast({
        title: 'Code promo invalide',
        description: 'Veuillez vérifier le code et réessayer.',
        variant: 'destructive',
      });
    }
  };


  const onSubmit = async (values: CheckoutFormValues) => {
    setIsSubmitting(true);
    
    const orderData = {
        customerName: values.name,
        customerPhone: values.phone,
        customerEmail: values.email,
        customerAddress: values.address,
        items: items,
        subtotal,
        discount,
        total,
    }

    try {
        await addOrder(orderData);
        toast({
            title: 'Commande passée avec succès !',
            description: 'Nous vous contacterons bientôt pour la livraison.',
        });
        clearCart();
        onOpenChange(false);
        form.reset();
        setPromoCode('');
        setDiscount(0);
    } catch (error) {
        console.error('Order submission failed', error);
        toast({
            title: 'Erreur',
            description: 'Impossible de passer la commande. Veuillez réessayer.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg grid-rows-[auto_1fr_auto] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Finaliser la commande</DialogTitle>
          <DialogDescription>
            Veuillez remplir vos informations pour la livraison.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="px-6">
          <Form {...form}>
            <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Awa Fall" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 77 123 45 67" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email <span className="text-muted-foreground">(Optionnel)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="pour le suivi de commande" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu de livraison</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Indiquez votre adresse complète..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator />

              <div className="space-y-2">
                  <FormLabel>Code promo</FormLabel>
                  <div className="flex items-center space-x-2">
                      <Input 
                          placeholder="Entrez votre code" 
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                      />
                      <Button type="button" variant="outline" onClick={handleApplyPromoCode}>Appliquer</Button>
                  </div>
              </div>

              <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                      <span>Sous-total:</span>
                      <span>{`XOF ${subtotal.toLocaleString('fr-FR')}`}</span>
                  </div>
                  {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                          <span>Réduction:</span>
                          <span>{`- XOF ${discount.toLocaleString('fr-FR')}`}</span>
                      </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-base">
                      <span>Total:</span>
                      <span>{`XOF ${total.toLocaleString('fr-FR')}`}</span>
                  </div>
              </div>
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter className="p-6 pt-4 border-t">
          <Button type="submit" form="checkout-form" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              'Confirmer la commande'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
