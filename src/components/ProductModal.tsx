
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { ScrollArea } from './ui/scroll-area';

interface ProductModalProps {
  shoe: Shoe;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ shoe, isOpen, onOpenChange }) => {
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(shoe.availableColors[0]?.name || null);
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  const { addItem } = useCart();

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast({
        title: 'Sélection requise',
        description: "Veuillez sélectionner une taille avant d'ajouter au panier.",
        variant: 'destructive',
      });
      return;
    }
    addItem(shoe, quantity, selectedSize, selectedColor || '');
    toast({
      title: 'Ajouté au panier !',
      description: `${quantity} x ${shoe.name} (Taille: ${selectedSize}, Couleur: ${selectedColor})`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 h-[90vh] flex flex-col">
        <div className="grid md:grid-cols-2 flex-1 min-h-0">
          <div className="p-6 flex flex-col">
            <Carousel className="w-full h-full flex flex-col">
              <CarouselContent className="flex-1">
                {shoe.detailImages.map((image, index) => (
                  <CarouselItem key={index} className="h-full">
                    <div className="aspect-square relative h-full w-full rounded-lg overflow-hidden">
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
              <div className="flex justify-center items-center gap-4 mt-4">
                <CarouselPrevious className="static translate-y-0" />
                <CarouselNext className="static translate-y-0" />
              </div>
            </Carousel>
          </div>

          <div className="flex flex-col min-h-0">
            <ScrollArea className="flex-1 pr-8 pl-8 md:pl-0 pt-8">
              <DialogHeader>
                <DialogTitle className="font-headline text-3xl mb-2">{shoe.name}</DialogTitle>
                <DialogDescription className="text-base">{shoe.description}</DialogDescription>
              </DialogHeader>

              <div className="py-6 space-y-6">
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

                <div>
                  <Label className="text-lg font-semibold">Quantité</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                    <Button variant="outline" size="icon" onClick={() => setQuantity((q) => q + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator className="my-4" />
                <StyleGuideAssistant shoeDescription={shoe.description} />
              </div>
            </ScrollArea>
            
            <div className="p-8 pt-4 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-3xl font-bold font-headline">
                  {`XOF ${(shoe.price * quantity).toLocaleString('fr-FR')}`}
                </p>
                <Button size="lg" className="w-full sm:w-auto" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-5 w-5" /> Commander
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
