
'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import type { Collection } from '@/lib/types';
import { ImageIcon } from 'lucide-react';

interface CollectionCarouselProps {
  collections: Collection[];
  onSelectCollection: (collection: Collection) => void;
}

const CollectionCarousel: React.FC<CollectionCarouselProps> = ({ collections, onSelectCollection }) => {
  return (
    <Carousel
      opts={{
        align: 'start',
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent>
        {collections.map((collection) => (
            <CarouselItem key={collection.id} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <Card
                  className="overflow-hidden group cursor-pointer"
                  onClick={() => onSelectCollection(collection)}
                >
                  <CardContent className="relative aspect-[4/3] p-0">
                    {collection.imageUrl ? (
                      <Image
                        src={collection.imageUrl}
                        alt={collection.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-4">
                      <h3 className="text-2xl font-bold font-headline text-white">{collection.name}</h3>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex" />
      <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex" />
    </Carousel>
  );
};

export default CollectionCarousel;
