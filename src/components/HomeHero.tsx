import Image from 'next/image';
import Link from 'next/link';
import type { Shoe } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { SITE, whatsappLink } from '@/lib/site';

/**
 * Premier écran de l'accueil: un vrai titre (h1), deux actions claires et les dernières nouveautés en images.
 * Le texte est écrit (net, lisible par les lecteurs d'écran), jamais incrusté dans une image.
 */
export function HomeHero({ shoes, loading }: { shoes: Shoe[]; loading: boolean }) {
  const photos = shoes.slice(0, 3);

  return (
    <section aria-labelledby="hero-title" className="container mx-auto px-4 py-10 md:py-16">
      <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
        <div className="space-y-6 text-center md:text-left">
          <h1 id="hero-title" className="font-headline text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            {SITE.tagline}
          </h1>
          <p className="text-lg text-muted-foreground">{SITE.subtitle}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Button asChild size="lg">
              <Link href="/shop">Voir la boutique</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="h-5 w-5" />
                Commander sur WhatsApp
              </a>
            </Button>
          </div>
        </div>

        {loading ? (
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((shoe, index) => (
              <div
                key={shoe.id}
                className={`relative overflow-hidden rounded-2xl bg-secondary ${index === 0 ? 'row-span-2 aspect-[3/4]' : 'aspect-square'}`}
              >
                <Image
                  src={shoe.gridImage.url}
                  alt={shoe.name}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 768px) 25vw, 45vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
