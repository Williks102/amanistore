'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import ShoeShowcase from '@/components/ShoeShowcase';
import type { Category } from '@/lib/types';
import Hero from '@/components/Hero';
import { Sidebar } from '@/components/Sidebar';
import { shoes } from '@/lib/data';

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
          <div className="flex flex-col md:flex-row gap-8">
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
              <ShoeShowcase
                selectedCategory={selectedCategory}
                searchTerm={searchTerm}
                priceRange={priceRange}
                selectedSizes={selectedSizes}
                selectedColors={selectedColors}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
