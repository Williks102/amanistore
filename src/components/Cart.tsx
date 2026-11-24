'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCart } from '@/hooks/use-cart';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash } from 'lucide-react';
import { CheckoutDialog } from './CheckoutDialog';
import { availableStock } from '@/lib/stock';

const MAX_PER_LINE = 20; // même plafond que le serveur

export const Cart = () => {
  const { items, isOpen, onClose, removeItem, updateItemQuantity, clearCart, isCheckoutOpen, openCheckout, closeCheckout } = useCart();
  const total = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const count = items.reduce((n, item) => n + item.quantity, 0);

  const handleCheckoutClick = () => {
    onClose(); // Ferme le panier
    openCheckout(); // Ouvre le formulaire de commande via le store
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Panier{count > 0 ? ` (${count})` : ''}</SheetTitle>
            <SheetDescription className="sr-only">Vos articles, leurs quantités et le total de la commande.</SheetDescription>
          </SheetHeader>
          <Separator />
          {items.length > 0 ? (
            <>
              <ScrollArea className="flex-grow pr-4">
                <ul className="flex flex-col gap-5 py-4">
                  {items.map((item) => {
                    const stockLeft = availableStock(item.product, item.size);
                    const maxQty = Math.min(stockLeft ?? MAX_PER_LINE, MAX_PER_LINE);
                    return (
                      <li key={item.id} className="flex gap-3">
                        <Link href={`/produit/${item.product.id}`} onClick={onClose} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-secondary">
                          <Image src={item.product.gridImage.url} alt={item.product.name} fill sizes="80px" className="object-cover" />
                        </Link>
                        <div className="flex min-w-0 flex-grow flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link href={`/produit/${item.product.id}`} onClick={onClose} className="block truncate font-semibold hover:text-primary">{item.product.name}</Link>
                              <p className="text-sm text-muted-foreground">Pointure {item.size} · {item.color}</p>
                            </div>
                            <Button variant="ghost" size="icon" aria-label={`Retirer ${item.product.name} du panier`} onClick={() => removeItem(item.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" aria-label="Diminuer la quantité" onClick={() => updateItemQuantity(item.id, item.quantity - 1)}>
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span aria-live="polite" className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button variant="outline" size="icon" aria-label="Augmenter la quantité" disabled={item.quantity >= maxQty} onClick={() => updateItemQuantity(item.id, item.quantity + 1)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="font-semibold">{`XOF ${(item.product.price * item.quantity).toLocaleString('fr-FR')}`}</p>
                          </div>
                          {stockLeft !== null && item.quantity >= stockLeft && <p className="text-xs text-amber-800">Quantité maximale en stock atteinte</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
              <Separator />
              <SheetFooter className="mt-4">
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{`XOF ${total.toLocaleString('fr-FR')}`}</span>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleCheckoutClick}>
                    Commander
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href="/shop" onClick={onClose}>Continuer mes achats</Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="flex-1">Vider</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Vider le panier ?</AlertDialogTitle>
                          <AlertDialogDescription>Les {count} article{count > 1 ? 's' : ''} seront retirés de votre panier.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={clearCart}>Vider le panier</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </SheetFooter>
            </>
          ) : (
            <div className="flex flex-grow flex-col items-center justify-center gap-4 text-center">
              <ShoppingBag aria-hidden="true" className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Votre panier est vide.</p>
              <Button asChild onClick={onClose}>
                <Link href="/shop">Voir la boutique</Link>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <CheckoutDialog isOpen={isCheckoutOpen} onOpenChange={closeCheckout} />
    </>
  );
};
