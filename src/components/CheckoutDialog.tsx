
'use client';

import { useState } from 'react';
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
  const { clearCart } = useCart();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
    },
  });

  const onSubmit = (values: CheckoutFormValues) => {
    setIsSubmitting(true);
    console.log('Order submitted:', values);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: 'Commande passée avec succès !',
        description: 'Nous vous contacterons bientôt pour la livraison.',
      });
      clearCart();
      setIsSubmitting(false);
      onOpenChange(false);
      form.reset();
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Finaliser la commande</DialogTitle>
          <DialogDescription>
            Veuillez remplir vos informations pour la livraison.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
