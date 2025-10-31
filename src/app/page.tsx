
'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import ShoeShowcase from '@/components/ShoeShowcase';
import type { Category, Shoe, Collection } from '@/lib/types';
import Hero from '@/components/Hero-clean';
import { Sidebar } from '@/components/Sidebar';
import { Separator } from '@/components/ui/separator';
import CategoryCarousel from '@/components/CategoryCarousel';
import CollectionCarousel from '@/components/CollectionCarousel';
import { AnimatedSection } from '@/components/AnimatedSection';
import { getProducts } from '@/services/productService';
import { getCategories } from '@/services/categoryService';
import { getCollections } from '@/services/collectionService';
import { Skeleton } from '@/components/ui/skeleton';


export type PriceRange = {
  min: number;
  max: number;
};

export default function Home() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 100000 });
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [products, fetchedCategories, fetchedCollections] = await Promise.all([
            getProducts(), 
            getCategories(),
            getCollections()
        ]);
        setShoes(products);
        setCategories(fetchedCategories);
        setCollections(fetchedCollections);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const availableSizes = useMemo(() => {
    const allSizes = shoes.flatMap((shoe) => shoe.availableSizes);
    return [...new Set(allSizes)].sort((a, b) => a - b);
  }, [shoes]);

  const availableColors = useMemo(() => {
    const allColors = shoes.flatMap((shoe) => shoe.availableColors);
    // Use a Map to ensure unique colors by name, preserving the first hex code encountered.
    const uniqueColors = new Map<string, { name: string; hex: string }>();
    allColors.forEach((color) => {
      if (!uniqueColors.has(color.name)) {
        uniqueColors.set(color.name, color);
      }
    });
    return Array.from(uniqueColors.values());
  }, [shoes]);
  
  const newArrivals = useMemo(() => shoes.slice(0, 3), [shoes]);
  const bestSellers = useMemo(() => shoes.slice(-3).reverse(), [shoes]);
  const recommended = useMemo(() => shoes.slice(-3).reverse(), [shoes]);

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setSelectedCollection(null); // Reset collection filter when category is selected
  }

  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    setSelectedCategory(null); // Reset category filter when collection is selected
  }

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {[...Array(3)].map((_, i) => (
         <div key={i} className="flex flex-col space-y-3">
           <Skeleton className="h-[300px] w-full rounded-xl" />
           <div className="space-y-2">
             <Skeleton className="h-4 w-3/4" />
             <Skeleton className="h-4 w-1/2" />
           </div>
         </div>
      ))}
    </div>
  )


  return (
    <div className="min-h-screen flex flex-col">
      <Header
        categories={categories}
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
      />
      <main className="flex-grow">
        <Hero />
        <div className="container mx-auto px-4 py-8">
          <AnimatedSection>
            <section id="categories" className="py-12">
              <h2 className="text-3xl font-bold text-center mb-8">Catégories</h2>
              <CategoryCarousel categories={categories} onSelectCategory={handleSelectCategory} />
            </section>
          </AnimatedSection>
          
          <AnimatedSection>
            <section id="collections" className="py-12">
              <h2 className="text-3xl font-bold text-center mb-8">Collections</h2>
              <CollectionCarousel collections={collections} onSelectCollection={handleSelectCollection} />
            </section>
          </AnimatedSection>

          <Sidebar
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            availableSizes={availableSizes}
            selectedSizes={selectedSizes}
            onSelectedSizesChange={setSelectedSizes}
            availableColors={availableColors}
            selectedColors={selectedColors}
            onSelectedColorsChange={setSelectedColors}
            isOpen={isSidebarOpen}
            onOpenChange={setSidebarOpen}
          />
          <div className="w-full">
            <AnimatedSection>
              <section id="new-arrivals" className="py-12">
                <h2 className="text-3xl font-bold text-center mb-8">Nouveautés</h2>
                {loading ? renderSkeleton() : (
                    <ShoeShowcase
                      shoes={shoes}
                      selectedCategory={selectedCategory}
                      selectedCollection={selectedCollection}
                      searchTerm={searchTerm}
                      priceRange={priceRange}
                      selectedSizes={selectedSizes}
                      selectedColors={selectedColors}
                      filtersubset={newArrivals.map(s => s.id)}
                    />
                )}
              </section>
            </AnimatedSection>

            <Separator className="my-12" />

            <AnimatedSection>
              <section id="best-sellers" className="py-12">
                <h2 className="text-3xl font-bold text-center mb-8">Meilleures Ventes</h2>
                 {loading ? renderSkeleton() : (
                    <ShoeShowcase
                      shoes={shoes}
                      selectedCategory={selectedCategory}
                      selectedCollection={selectedCollection}
                      searchTerm={searchTerm}
                      priceRange={priceRange}
                      selectedSizes={selectedSizes}
                      selectedColors={selectedColors}
                      filtersubset={bestSellers.map(s => s.id)}
                    />
                 )}
              </section>
            </AnimatedSection>

            <Separator className="my-12" />

            <AnimatedSection>
              <section id="recommended" className="py-12">
                <h2 className="text-3xl font-bold text-center mb-8">Recommandations pour vous</h2>
                 {loading ? renderSkeleton() : (
                    <ShoeShowcase
                      shoes={shoes}
                      selectedCategory={selectedCategory}
                      selectedCollection={selectedCollection}
                      searchTerm={searchTerm}
                      priceRange={priceRange}
                      selectedSizes={selectedSizes}
                      selectedColors={selectedColors}
                      filtersubset={recommended.map(s => s.id)}
                    />
                 )}
              </section>
            </AnimatedSection>
          </div>
        </div>
      </main>
    </div>
  );
}
