'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { LoadError } from '@/components/LoadError';
import ShoeShowcase from '@/components/ShoeShowcase';
import { HomeHero } from '@/components/HomeHero';
import { TrustStrip } from '@/components/TrustStrip';
import { TileGrid, type Tile } from '@/components/TileGrid';
import { SectionTitle } from '@/components/SectionTitle';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { Facebook, Instagram } from 'lucide-react';
import type { Category, Shoe, Collection } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getProducts } from '@/services/productService';
import { getCategories } from '@/services/categoryService';
import { getCollections } from '@/services/collectionService';
import { SITE, whatsappLink } from '@/lib/site';

/**
 * Accueil = vitrine: hero, garanties, nouveautés, catégories, collections, sélection « coup de cœur », contact.
 * La recherche et les filtres vivent sur /shop (la loupe du menu y mène).
 */
export default function Home() {
  const router = useRouter();
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const [products, fetchedCategories, fetchedCollections] = await Promise.all([
          getProducts(),
          getCategories(),
          getCollections(),
        ]);
        setShoes(products);
        setCategories(fetchedCategories);
        setCollections(fetchedCollections);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reloadKey]);

  const newArrivals = useMemo(() => shoes.slice(0, 6), [shoes]);
  const featured = useMemo(() => shoes.filter((shoe) => shoe.featured).slice(0, 6), [shoes]);
  // Le hero montre les coups de cœur s'il y en a, sinon les dernières nouveautés.
  const heroShoes = useMemo(() => (featured.length > 0 ? featured.slice(0, 3) : shoes.slice(0, 3)), [featured, shoes]);

  const categoryTiles = useMemo<Tile[]>(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        href: `/shop?category=${category.id}`,
        imageUrl: category.imageUrl || PlaceHolderImages.find((p) => p.id === category.imageId)?.imageUrl,
        count: shoes.filter((shoe) => shoe.categoryId === category.id).length,
      })).filter((tile) => (tile.count ?? 0) > 0), // pas de vignette vers une catégorie vide
    [categories, shoes]
  );

  const collectionTiles = useMemo<Tile[]>(
    () =>
      collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        href: `/shop?collection=${collection.id}`,
        imageUrl: collection.imageUrl,
        count: shoes.filter((shoe) => collection.categoryIds.includes(shoe.categoryId)).length,
      })).filter((tile) => (tile.count ?? 0) > 0),
    [collections, shoes]
  );

  const renderSkeleton = (count: number) => (
    <div aria-busy="true" className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 lg:gap-8">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );

  const showContent = !loading && !loadError;

  return (
    <div className="min-h-screen flex flex-col">
      {/* La recherche et les filtres sont sur la boutique. */}
      <Header categories={categories} onToggleSidebar={() => router.push('/shop?search=1')} />
      <main className="flex-grow">
        <HomeHero shoes={heroShoes} loading={loading} />
        <TrustStrip />

        <div className="container mx-auto px-4">
          {loadError && !loading && (
            <div className="py-12">
              <LoadError onRetry={() => setReloadKey((k) => k + 1)} />
            </div>
          )}

          <AnimatedSection>
            <section aria-labelledby="new-arrivals-title" className="py-10 md:py-14">
              <SectionTitle id="new-arrivals-title" href="/shop" linkLabel="Voir toute la boutique">Nouveautés</SectionTitle>
              {loading ? renderSkeleton(6) : showContent && newArrivals.length > 0 ? (
                <ShoeShowcase shoes={newArrivals} columns="two-up" />
              ) : null}
            </section>
          </AnimatedSection>

          {showContent && categoryTiles.length > 0 && (
            <AnimatedSection>
              <section id="categories" aria-labelledby="categories-title" className="py-10 md:py-14">
                <SectionTitle id="categories-title">Catégories</SectionTitle>
                <TileGrid tiles={categoryTiles} />
              </section>
            </AnimatedSection>
          )}

          {showContent && collectionTiles.length > 0 && (
            <AnimatedSection>
              <section id="collections" aria-labelledby="collections-title" className="py-10 md:py-14">
                <SectionTitle id="collections-title">Collections</SectionTitle>
                <TileGrid tiles={collectionTiles} />
              </section>
            </AnimatedSection>
          )}

          {/* Visible seulement quand la boutique a coché au moins un « coup de cœur » dans l'admin. */}
          {showContent && featured.length > 0 && (
            <AnimatedSection>
              <section id="selection" aria-labelledby="selection-title" className="py-10 md:py-14">
                <SectionTitle id="selection-title">Sélection Amani&apos;s</SectionTitle>
                <ShoeShowcase shoes={featured} columns="two-up" />
              </section>
            </AnimatedSection>
          )}

          <section aria-labelledby="contact-title" className="py-10 md:py-14">
            <div className="rounded-2xl bg-secondary p-6 text-center md:p-10">
              <h2 id="contact-title" className="font-headline text-2xl font-bold md:text-3xl">Une question, un conseil de pointure ?</h2>
              <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Écrivez-nous, nous vous aidons à choisir.</p>
              <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                  <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon className="h-5 w-5" /> Écrire sur WhatsApp
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/contact">Formulaire de contact</Link>
                </Button>
                <div className="flex items-center justify-center gap-1">
                  <Button asChild size="icon" variant="ghost">
                    <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>
                  </Button>
                  <Button asChild size="icon" variant="ghost">
                    <a href={SITE.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
