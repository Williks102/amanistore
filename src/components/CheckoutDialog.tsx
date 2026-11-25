
'use client';

import { lineLabel, orderPayloadLine } from '@/lib/cart-line';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
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
import { createOrder, validatePromoCode } from '@/app/actions';
import { getIdToken } from '@/lib/get-id-token';
import { saveGuestOrder } from '@/lib/guest-orders';
import { useProfile } from '@/hooks/use-profile';
import Link from 'next/link';
import { computeDiscount, promoProblem } from '@/lib/promo';
import type { PromoCode } from '@/lib/types';
import { useUser } from '@/firebase';

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
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null);
  const [honeypot, setHoneypot] = useState(''); // champ piège: invisible pour une personne, rempli par un robot
  const { user } = useUser();
  // Coordonnées enregistrées: lues seulement quand la fenêtre est ouverte par une cliente connectée.
  const { profile, loaded: profileLoaded, save: saveProfile } = useProfile(isOpen && !!user);
  const [rememberProfile, setRememberProfile] = useState(true);

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.product.price * item.quantity, 0), [items]);
  
  // Affichage seulement: le serveur recalcule la remise (et revérifie expiration, limite, minimum).
  const promoIssue = useMemo(
    () => (appliedPromoCode ? promoProblem(appliedPromoCode, subtotal) : null),
    [appliedPromoCode, subtotal]
  );
  const discount = useMemo(() => {
    if (!appliedPromoCode || promoIssue) return 0;
    return computeDiscount(appliedPromoCode, subtotal);
  }, [subtotal, appliedPromoCode, promoIssue]);

  const total = subtotal - discount;

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.displayName || '',
      phone: '',
      email: user?.email || '',
      address: '',
    },
  });
  
  // Préremplissage: profil enregistré d'abord, sinon ce que le compte connaît. On ne touche pas à ce que la cliente a déjà tapé.
  useEffect(() => {
    if (!isOpen || form.formState.isDirty) return;
    form.reset({
      name: profile.name || user?.displayName || '',
      phone: profile.phone || user?.phoneNumber || '',
      email: user?.email || '',
      address: profile.address || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, profileLoaded, profile, user]);


  const handleApplyPromoCode = async () => {
    if (!promoCodeInput) return;
    setIsApplyingPromo(true);

    const result = await validatePromoCode(promoCodeInput.toUpperCase(), subtotal);
    
    if (result.success && result.promoCode) {
      setAppliedPromoCode(result.promoCode);
      toast({
        title: 'Code promo appliqué !',
        description: `La réduction a été appliquée à votre commande.`,
      });
    } else {
      setAppliedPromoCode(null);
      toast({
        title: 'Code promo invalide',
        description: result.error || 'Veuillez vérifier le code et réessayer.',
        variant: 'destructive',
      });
    }
    setIsApplyingPromo(false);
  };


  const onSubmit = async (values: CheckoutFormValues) => {
    setIsSubmitting(true);

    try {
        const result = await createOrder((await getIdToken()) || null, {
            name: values.name,
            phone: values.phone,
            email: values.email || '',
            address: values.address,
            promoCode: promoIssue ? undefined : appliedPromoCode?.code,
            website: honeypot,
            items: items.map(orderPayloadLine),
        });
        if (!result.success || !result.orderId) {
            throw new Error(result.error || 'Commande refusée.');
        }
        if (result.guestSecret) saveGuestOrder(result.orderId, result.guestSecret);
        if (user && rememberProfile) void saveProfile({ name: values.name, phone: values.phone, address: values.address }); // sans bloquer la commande
        toast({
            title: 'Commande passée avec succès !',
            description: 'Vous allez être redirigé vers la page de confirmation.',
        });
        clearCart();
        onOpenChange(false);
        form.reset();
        setPromoCodeInput('');
        setAppliedPromoCode(null);
        router.push(`/order-confirmation/${result.orderId}`);
    } catch (error) {
        console.error('Order submission failed', error);
        toast({
            title: 'Erreur',
            description: error instanceof Error && error.message ? error.message : 'Impossible de passer la commande. Veuillez réessayer.',
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
          <section aria-labelledby="checkout-summary" className="mb-5 rounded-lg border bg-secondary/50 p-3">
            <h3 id="checkout-summary" className="mb-2 text-sm font-semibold">Votre commande ({items.reduce((n, i) => n + i.quantity, 0)} article{items.reduce((n, i) => n + i.quantity, 0) > 1 ? 's' : ''})</h3>
            <ul className="space-y-1 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{item.quantity} × {item.product.name}</span>
                    {lineLabel(item) && <span className="block text-xs text-muted-foreground">{lineLabel(item)}</span>}
                  </span>
                  <span className="shrink-0">{`XOF ${(item.product.price * item.quantity).toLocaleString('fr-FR')}`}</span>
                </li>
              ))}
            </ul>
          </section>
          {!user && (
            <p className="mb-5 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
              Vous commandez <strong>sans compte</strong>: pas besoin de mot de passe. Un <strong>code de validation</strong> vous sera remis à la fin; gardez-le, vous le donnerez au livreur.{' '}
              <Link href="/login" onClick={() => onOpenChange(false)} className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Vous avez un compte ? Se connecter</Link>
            </p>
          )}
          <Form {...form}>
            <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="checkout-website">Ne pas remplir</label>
                <input id="checkout-website" type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </div>
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
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="pour le suivi de commande" {...field} disabled={!!user?.email}/>
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

              {user && (
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" className="h-5 w-5 accent-primary" checked={rememberProfile} onChange={(e) => setRememberProfile(e.target.checked)} />
                  Enregistrer mes coordonnées pour la prochaine commande
                </label>
              )}

              <div className="space-y-2">
                  <FormLabel>Code promo</FormLabel>
                  <div className="flex items-center space-x-2">
                      <Input 
                          placeholder="Entrez votre code" 
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value)}
                          disabled={!!appliedPromoCode}
                          className="uppercase"
                      />
                      <Button type="button" variant="outline" onClick={handleApplyPromoCode} disabled={isApplyingPromo || !!appliedPromoCode}>
                        {isApplyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Appliquer'}
                      </Button>
                  </div>
                  {promoIssue && <p className="text-sm text-destructive">{promoIssue}</p>}
              </div>

              <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                      <span>Sous-total:</span>
                      <span>{`XOF ${subtotal.toLocaleString('fr-FR')}`}</span>
                  </div>
                  {discount > 0 && (
                      <div className="flex justify-between text-green-700">
                          <span>Réduction ({appliedPromoCode?.code}):</span>
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
