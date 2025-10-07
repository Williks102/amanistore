
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

interface ProductModalProps {
  shoe: Shoe;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);


const ProductModal: React.FC<ProductModalProps> = ({ shoe, isOpen, onOpenChange }) => {
  const [selectedSize, setSelectedSize] = useState<number | null>(shoe.availableSizes[0] || null);
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

    const shopNumber = "2250172698282";
    let message = `Bonjour, je souhaiterais acheter cette chaussure : *${shoe.name}*.\n\n`;
    message += `*Options choisies :*\n`;
    message += `- Taille : ${selectedSize}\n`;
    message += `- Couleur : ${selectedColor}\n`;
    message += `- Quantité : ${quantity}`;
    
    const whatsappUrl = `https://wa.me/${shopNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
                <Label className="text-lg font-semibold">Couleur</Label>
                <div className="flex items-center gap-3 mt-2">
                  {shoe.availableColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110 focus:outline-none',
                        selectedColor === color.name ? 'ring-2 ring-offset-2 ring-primary' : 'border-border'
                      )}
                      style={{ backgroundColor: color.hex }}
                      aria-label={`Select color ${color.name}`}
                    />
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div>
                <Label className="text-lg font-semibold">Taille</Label>
                <RadioGroup
                  value={selectedSize?.toString()}
                  onValueChange={(val) => setSelectedSize(Number(val))}
                  className="grid grid-cols-4 gap-2 mt-2"
                >
                  {shoe.availableSizes.map((size) => (
                    <div key={size} className="flex items-center">
                      <RadioGroupItem value={size.toString()} id={`size-${size}`} className="sr-only" />
                      <Label
                        htmlFor={`size-${size}`}
                        className={cn(
                          'flex items-center justify-center w-full h-10 rounded-md border text-sm font-medium cursor-pointer transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          selectedSize === size ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'
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
                  <Button variant="outline" size="icon" onClick={() => setQuantity((q) => q + 1)}>
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
              <Label className="text-lg font-semibold">Couleur</Label>
              <div className="flex items-center gap-3 mt-2">
                {shoe.availableColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110 focus:outline-none',
                      selectedColor === color.name ? 'ring-2 ring-offset-2 ring-primary' : 'border-border'
                    )}
                    style={{ backgroundColor: color.hex }}
                    aria-label={`Select color ${color.name}`}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <Label className="text-lg font-semibold">Taille</Label>
              <RadioGroup
                value={selectedSize?.toString()}
                onValueChange={(val) => setSelectedSize(Number(val))}
                className="grid grid-cols-4 gap-2 mt-2"
              >
                {shoe.availableSizes.map((size) => (
                  <div key={size} className="flex items-center">
                    <RadioGroupItem value={size.toString()} id={`size-mobile-${size}`} className="sr-only" />
                    <Label
                      htmlFor={`size-mobile-${size}`}
                      className={cn(
                        'flex items-center justify-center w-full h-10 rounded-md border text-sm font-medium cursor-pointer transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        selectedSize === size ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'
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
                <Button variant="outline" size="icon" onClick={() => setQuantity((q) => q + 1)} className="h-12 w-12">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Total Display */}
            <div className="bg-muted rounded-lg p-4 border">
              <p className="text-2xl font-bold text-center">
                Total: {(shoe.price * quantity).toLocaleString('fr-FR')} CFA
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
               <Button onClick={handleShareOnWhatsApp} variant="outline" className="w-full h-12 bg-green-500 hover:bg-green-600 text-white">
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
