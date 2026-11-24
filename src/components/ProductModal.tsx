
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import type { Shoe } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StyleGuideAssistant } from './StyleGuideAssistant';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/use-cart';
import { availableStock } from '@/lib/stock';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { whatsappLink } from '@/lib/site';

interface ProductModalProps {
  shoe: Shoe;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}



const ProductModal: React.FC<ProductModalProps> = ({ shoe, isOpen, onOpenChange }) => {
  const [selectedSize, setSelectedSize] = useState<number | null>(
    shoe.availableSizes.find((sz) => availableStock(shoe, sz) !== 0) ?? null
  );
  const stockLeft = selectedSize !== null ? availableStock(shoe, selectedSize) : null;
  const maxQty = stockLeft ?? 99;
  const allSoldOut = shoe.availableSizes.length > 0 && shoe.availableSizes.every((sz) => availableStock(shoe, sz) === 0);
  const [selectedColor, setSelectedColor] = useState<string | null>(shoe.availableColors[0]?.name || null);
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  const { addItem, openCheckout } = useCart();

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      toast({
        title: 'Sélection requise',
        description: "Veuillez sélectionner une taille et une couleur avant d'ajouter au panier.",
        variant: 'destructive',
      });
      return;
    }
    addItem(shoe, quantity, selectedSize, selectedColor);
    toast({
      title: 'Ajouté au panier !',
      description: `${quantity} x ${shoe.name} (Taille: ${selectedSize}, Couleur: ${selectedColor})`,
    });
    onOpenChange(false);
  };
  
  const handleBuyNow = () => {
    if (!selectedSize || !selectedColor) {
      toast({
        title: 'Sélection requise',
        description: "Veuillez sélectionner une taille et une couleur avant de continuer.",
        variant: 'destructive',
      });
      return;
    }
    addItem(shoe, quantity, selectedSize, selectedColor);
    onOpenChange(false);
    openCheckout();
  };

  const handleShareOnWhatsApp = () => {
    if (!selectedSize || !selectedColor) {
      toast({
        title: 'Sélection requise',
        description: "Veuillez sélectionner une taille et une couleur avant de contacter la boutique.",
        variant: 'destructive',
      });
      return;
    }

    let message = `Bonjour, je souhaiterais acheter cette chaussure : *${shoe.name}*.\n\n`;
    message += `*Options choisies :*\n`;
    message += `- Taille : ${selectedSize}\n`;
    message += `- Couleur : ${selectedColor}\n`;
    message += `- Quantité : ${quantity}`;
    
    window.open(whatsappLink(message), '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-background z-10 border-b">
          <DialogHeader className="p-4 md:p-6">
            <DialogTitle className="font-headline text-2xl md:text-3xl">{shoe.name}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* Image Carousel */}
          <div className="w-full">
            <Carousel className="w-full max-w-md mx-auto">
              <CarouselContent>
                {shoe.detailImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-square relative rounded-lg overflow-hidden">
                      <Image
                        src={image.url}
                        alt={`${shoe.name} - view ${index + 1}`}
                        fill
                        className="object-cover"
                        data-ai-hint={image.hint}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          </div>

          {/* Description */}
          <DialogDescription className="text-base text-center md:text-left">
            {shoe.description}
          </DialogDescription>
          
          {/* Price */}
          <div className="bg-accent/50 rounded-lg p-4">
            <p className="text-3xl font-bold text-center text-primary">
              {`${(shoe.price * quantity).toLocaleString('fr-FR')} XOF`}
            </p>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Color Selection */}
              <div>
                <Label className="text-lg font-semibold">Couleur{selectedColor ? <span className="font-normal text-muted-foreground"> : {selectedColor}</span> : null}</Label>
                <div className="flex items-center gap-3 mt-2">
                  {shoe.availableColors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColor(color.name)}
                      aria-label={`Couleur ${color.name}`}
                      aria-pressed={selectedColor === color.name}
                      className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          className={cn(
                            'block h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                            selectedColor === color.name ? 'ring-2 ring-offset-2 ring-primary' : 'border-border'
                          )}
                          style={{ backgroundColor: color.hex }}
                        />
                      </button>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div>
                <Label className="text-lg font-semibold">Taille</Label>
                {allSoldOut && <p className="text-sm text-destructive mt-1">Produit épuisé</p>}
                {!allSoldOut && stockLeft !== null && stockLeft <= 3 && <p className="text-sm text-amber-600 mt-1">Plus que {stockLeft} en stock</p>}
                <RadioGroup
                  value={selectedSize?.toString()}
                  onValueChange={(val) => { const next = Number(val); setSelectedSize(next); const left = availableStock(shoe, next); if (left !== null) setQuantity((q) => Math.max(1, Math.min(q, left))); }}
                  className="grid grid-cols-4 gap-2 mt-2"
                >
                  {shoe.availableSizes.map((size) => (
                    <div key={size} className="flex items-center">
                      <RadioGroupItem value={size.toString()} id={`size-${size}`} className="sr-only" disabled={availableStock(shoe, size) === 0} />
                      <Label
                        htmlFor={`size-${size}`}
                        className={cn(
                          'flex items-center justify-center w-full h-10 rounded-md border text-sm font-medium cursor-pointer transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          selectedSize === size ? 'bg-primary text-primary-foreground border-primary' : 'bg-background',
                          availableStock(shoe, size) === 0 && 'opacity-40 line-through cursor-not-allowed hover:bg-background'
                        )}
                      >
                        {size}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-6">
              {/* Quantity */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">Quantité</Label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity((q) => Math.min(q + 1, maxQty))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />
              <StyleGuideAssistant shoeDescription={shoe.description} />
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-6">
            {/* Color Selection */}
            <div>
              <Label className="text-lg font-semibold">Couleur{selectedColor ? <span className="font-normal text-muted-foreground"> : {selectedColor}</span> : null}</Label>
              <div className="flex items-center gap-3 mt-2">
                {shoe.availableColors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.name)}
                    aria-label={`Couleur ${color.name}`}
                    aria-pressed={selectedColor === color.name}
                    className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={cn(
                          'block h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                          selectedColor === color.name ? 'ring-2 ring-offset-2 ring-primary' : 'border-border'
                        )}
                        style={{ backgroundColor: color.hex }}
                      />
                    </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <Label className="text-lg font-semibold">Taille</Label>
                {allSoldOut && <p className="text-sm text-destructive mt-1">Produit épuisé</p>}
                {!allSoldOut && stockLeft !== null && stockLeft <= 3 && <p className="text-sm text-amber-600 mt-1">Plus que {stockLeft} en stock</p>}
              <RadioGroup
                value={selectedSize?.toString()}
                onValueChange={(val) => { const next = Number(val); setSelectedSize(next); const left = availableStock(shoe, next); if (left !== null) setQuantity((q) => Math.max(1, Math.min(q, left))); }}
                className="grid grid-cols-4 gap-2 mt-2"
              >
                {shoe.availableSizes.map((size) => (
                  <div key={size} className="flex items-center">
                    <RadioGroupItem value={size.toString()} id={`size-mobile-${size}`} className="sr-only" disabled={availableStock(shoe, size) === 0} />
                    <Label
                      htmlFor={`size-mobile-${size}`}
                      className={cn(
                        'flex items-center justify-center w-full h-10 rounded-md border text-sm font-medium cursor-pointer transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        selectedSize === size ? 'bg-primary text-primary-foreground border-primary' : 'bg-background',
                          availableStock(shoe, size) === 0 && 'opacity-40 line-through cursor-not-allowed hover:bg-background'
                      )}
                    >
                      {size}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Quantity */}
            <div>
              <Label className="text-lg font-semibold mb-3 block">Quantité</Label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="h-12 w-12"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="text-2xl font-bold w-16 text-center">{quantity}</span>
                <Button variant="outline" size="icon" onClick={() => setQuantity((q) => Math.min(q + 1, maxQty))} className="h-12 w-12">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Total Display */}
            <div className="bg-muted rounded-lg p-4 border">
              <p className="text-2xl font-bold text-center">
                Total : {(shoe.price * quantity).toLocaleString('fr-FR')} XOF
              </p>
            </div>

            <Separator />
            <StyleGuideAssistant shoeDescription={shoe.description} />
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="sticky bottom-0 bg-background border-t p-4 md:p-6">
          <div className="w-full flex flex-col gap-3">
            <Button size="lg" className="w-full text-base md:text-lg h-12 md:h-14" onClick={handleAddToCart}>
              <ShoppingCart className="mr-2 h-5 w-5" /> Ajouter au panier
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" variant="secondary" className="w-full text-base h-12" onClick={handleBuyNow}>
                Acheter
              </Button>
               <Button onClick={handleShareOnWhatsApp} variant="outline" className="w-full h-12 bg-green-700 hover:bg-green-800 text-white">
                  <WhatsAppIcon className="mr-2 h-5 w-5" />
                  Commander via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
