import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { Shoe } from '@/lib/types';
import { Button } from './ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  shoe: Shoe;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ shoe, onClick }) => {
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche le modal de s'ouvrir lors du clic sur le bouton
    // Ajoute l'article avec la première taille et couleur disponible par défaut.
    // L'utilisateur peut modifier cela dans le panier ou le modal.
    const defaultSize = shoe.availableSizes[0];
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
            <Image
              src={shoe.gridImage.url}
              alt={shoe.name}
              width={600}
              height={600}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={shoe.gridImage.hint}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <h3 className="font-headline text-xl font-semibold truncate">{shoe.name}</h3>
        </CardContent>
      </div>
      <CardFooter className="p-4 pt-0 mt-auto flex justify-between items-center">
        <p className="text-lg font-semibold text-primary/80">
          {`XOF ${shoe.price.toLocaleString('fr-FR')}`}
        </p>
        <Button variant="outline" size="icon" onClick={handleAddToCart}>
          <ShoppingCart className="h-5 w-5" />
          <span className="sr-only">Commander</span>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
