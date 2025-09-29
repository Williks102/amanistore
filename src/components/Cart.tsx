
'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { useCart } from '@/hooks/use-cart';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import { Trash } from 'lucide-react';
import { CheckoutDialog } from './CheckoutDialog';

export const Cart = () => {
  const { items, isOpen, onClose, removeItem, clearCart } = useCart();
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const total = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleCheckoutClick = () => {
    onClose(); // Ferme le panier
    setCheckoutOpen(true); // Ouvre le formulaire de commande
  };


  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Panier</SheetTitle>
          </SheetHeader>
          <Separator />
          {items.length > 0 ? (
            <>
              <ScrollArea className="flex-grow pr-4">
                <div className="flex flex-col gap-4 py-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="relative w-20 h-20 rounded-md overflow-hidden">
                        <Image
                          src={item.product.gridImage.url}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-grow">
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Taille: {item.size} | Couleur: {item.color}
                        </p>
                        <p className="text-sm">
                          {item.quantity} x {`XOF ${item.product.price.toLocaleString('fr-FR')}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Separator />
              <SheetFooter className="mt-4">
                <div className="w-full space-y-4">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span>{`XOF ${total.toLocaleString('fr-FR')}`}</span>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleCheckoutClick}>
                    Commander
                  </Button>
                  <Button variant="outline" className="w-full" onClick={clearCart}>
                    Vider le panier
                  </Button>
                </div>
              </SheetFooter>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center">
              <p>Votre panier est vide.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <CheckoutDialog isOpen={isCheckoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  );
};
