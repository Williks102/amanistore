
'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import ShoeShowcase from '@/components/ShoeShowcase';
import type { Category } from '@/lib/types';
import Hero from '@/components/Hero';
import { Sidebar } from '@/components/Sidebar';
import { shoes } from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import ProductCard from '@/components/ProductModal';

export type PriceRange = {
  min: number;
  max: number;
};

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 100000 });
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const availableSizes = useMemo(() => {
    const allSizes = shoes.flatMap((shoe) => shoe.availableSizes);
    return [...new Set(allSizes)].sort((a, b) => a - b);
  }, []);

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
  }, []);
  
  const newArrivals = useMemo(() => shoes.slice(0, 3), []);
  const bestSellers = useMemo(() => shoes.slice(-3).reverse(), []);
  const recommended = useMemo(() => shoes.slice(-3).reverse(), []);


  return (
    <div className="min-h-screen flex flex-col">
      <Header
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
      />
      <main className="flex-grow">
        <Hero />
        <div className="container mx-auto px-4 py-8">
           <div className="flex flex-col md:flex-row md:items-start gap-8">
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
              <section id="new-arrivals" className="py-12">
                <h2 className="text-3xl font-bold text-center mb-8">Nouveautés</h2>
                <ShoeShowcase
                  shoes={shoes}
                  selectedCategory={selectedCategory}
                  searchTerm={searchTerm}
                  priceRange={priceRange}
                  selectedSizes={selectedSizes}
                  selectedColors={selectedColors}
                  filtersubset={newArrivals.map(s => s.id)}
                />
              </section>

              <Separator className="my-12" />

              <section id="best-sellers" className="py-12">
                <h2 className="text-3xl font-bold text-center mb-8">Meilleures Ventes</h2>
                <ShoeShowcase
                  shoes={shoes}
                  selectedCategory={selectedCategory}
                  searchTerm={searchTerm}
                  priceRange={priceRange}
                  selectedSizes={selectedSizes}
                  selectedColors={selectedColors}
                  filtersubset={bestSellers.map(s => s.id)}
                />
              </section>

              <Separator className="my-12" />

              <section id="recommended" className="py-12">
                <h2 className="text-3xl font-bold text-center mb-8">Recommandations pour vous</h2>
                <ShoeShowcase
                  shoes={shoes}
                  selectedCategory={selectedCategory}
                  searchTerm={searchTerm}
                  priceRange={priceRange}
                  selectedSizes={selectedSizes}
                  selectedColors={selectedColors}
                  filtersubset={recommended.map(s => s.id)}
                />
              </section>

              <Separator className="my-12" />

              <section id="all-products" className="py-12">
                <h2 className="text-3xl font-bold text-center mb-8">Tous les produits</h2>
                <ShoeShowcase
                  shoes={shoes}
                  selectedCategory={selectedCategory}
                  searchTerm={searchTerm}
                  priceRange={priceRange}
                  selectedSizes={selectedSizes}
                  selectedColors={selectedColors}
                />
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
