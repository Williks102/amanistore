
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
import { PlaceHolderImages } from '@/lib/placeholder-images';

const heroImages = [
  PlaceHolderImages.find((p) => p.id === 'hero-sneakers'),
  PlaceHolderImages.find((p) => p.id === 'hero-formal'),
  PlaceHolderImages.find((p) => p.id === 'hero-sports'),
].filter(Boolean);

const Hero = () => {
  return (
    <section className="w-full h-[60vh] relative">
      <Carousel className="w-full h-full" opts={{ loop: true }}>
        <CarouselContent>
          {heroImages.map((image, index) => (
            <CarouselItem key={index}>
              <div className="h-[60vh] w-full relative">
                {image && (
                  <Image
                    src={image.imageUrl}
                    alt={`Hero image ${index + 1}`}
                    fill
                    className="object-cover"
                    data-ai-hint={image.imageHint}
                    priority={index === 0}
                  />
                )}
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
                  <h2 className="text-4xl md:text-6xl font-headline font-bold">
                  Trouvez votre paire parfaite
                  </h2>
                  <p className="mt-2 text-lg md:text-xl">
                  Style, confort et qualité à chaque pas.
                  </p>
                </div>
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
