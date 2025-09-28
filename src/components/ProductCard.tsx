import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { Shoe } from '@/lib/types';

interface ProductCardProps {
  shoe: Shoe;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ shoe, onClick }) => {
  return (
    <Card
      className="overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
      onClick={onClick}
      aria-label={`View details for ${shoe.name}`}
    >
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
      <CardFooter className="p-4 pt-0">
        <p className="text-lg font-semibold text-primary/80">
          {`XOF ${shoe.price.toLocaleString('fr-FR')}`}
        </p>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
