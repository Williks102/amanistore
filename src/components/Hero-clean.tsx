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

// Vos images Cloudinary pour le slider Hero
const heroImages = [
  {
    id: 'hero-collection-1',
    imageUrl: 'https://res.cloudinary.com/db4hmbdv3/image/upload/v1761739482/Découvrez_la_collection_son5ea.png',
    alt: 'Découvrez la collection',
  },
  {
    id: 'hero-collection-2',
    imageUrl: 'https://res.cloudinary.com/db4hmbdv3/image/upload/v1761739458/Découvrez_la_collection_1_hn4mma.png',
    alt: 'Nouvelle collection',
  },
];

const Hero = () => {
  return (
    <section className="w-full relative">
      <Carousel className="w-full" opts={{ loop: true }}>
        <CarouselContent>
          {heroImages.map((image, index) => (
            <CarouselItem key={image.id}>
              {/* Image responsive en pleine largeur */}
              <div className="w-full relative">
                <img
                  src={image.imageUrl}
                  alt={image.alt}
                  className="w-full h-auto"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex" />
        <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex" />
      </Carousel>
    </section>
  );
};

export default Hero;
