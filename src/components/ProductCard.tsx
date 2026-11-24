import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { Shoe } from '@/lib/types';
import { Button } from './ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { firstAvailableSize, stockSummary } from '@/lib/stock';

interface ProductCardProps {
  shoe: Shoe;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ shoe, onClick }) => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const stock = stockSummary(shoe);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche le modal de s'ouvrir lors du clic sur le bouton
    // Ajoute l'article avec la première taille et couleur disponible par défaut.
    // L'utilisateur peut modifier cela dans le panier ou le modal.
    const defaultSize = firstAvailableSize(shoe);
    if (defaultSize === null || shoe.availableColors.length === 0) return;
    const defaultColor = shoe.availableColors[0].name;
    addItem(shoe, 1, defaultSize, defaultColor);
    toast({
      title: 'Ajouté au panier !',
      description: `${shoe.name} (Taille: ${defaultSize}, Couleur: ${defaultColor})`,
    });
  };

  return (
    <Card
      className="overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 flex flex-col"
      aria-label={`View details for ${shoe.name}`}
    >
      <div onClick={onClick} className="cursor-pointer">
        <CardHeader className="p-0">
          <div className="aspect-square w-full relative overflow-hidden">
            {stock.soldOut && (
              <Badge variant="secondary" className="absolute left-3 top-3 z-10 border border-border bg-background text-foreground">Épuisé</Badge>
            )}
            {!stock.soldOut && stock.tracked && stock.total <= 3 && (
              <Badge variant="secondary" className="absolute left-3 top-3 z-10 border border-border bg-background text-foreground">Plus que {stock.total}</Badge>
            )}
            <Image
              src={shoe.gridImage.url}
              alt={shoe.name}
              width={600}
              height={600}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={shoe.gridImage.hint}
            />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <h3 className="font-headline text-lg font-semibold truncate sm:text-xl">{shoe.name}</h3>
        </CardContent>
      </div>
      <CardFooter className="p-3 pt-0 sm:p-4 sm:pt-0 mt-auto flex flex-wrap justify-between items-center gap-2">
        <p className="text-base font-semibold text-primary sm:text-lg">
          {`XOF ${shoe.price.toLocaleString('fr-FR')}`}
        </p>
        <Button variant="outline" size="icon" onClick={handleAddToCart} disabled={stock.soldOut}>
          <ShoppingCart className="h-5 w-5" />
          <span className="sr-only">{stock.soldOut ? 'Épuisé' : 'Commander'}</span>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
