'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import ShoeShowcase from '@/components/ShoeShowcase';
import type { Category, Shoe } from '@/lib/types';
import { Sidebar } from '@/components/Sidebar';
import { getProducts } from '@/services/productService';
import { getCategories } from '@/services/categoryService';
import { Skeleton } from '@/components/ui/skeleton';

export type PriceRange = {
  min: number;
  max: number;
};

export default function ShopPage() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 100000 });
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [products, fetchedCategories] = await Promise.all([getProducts(), getCategories()]);
        setShoes(products);
        setCategories(fetchedCategories);
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
    const uniqueColors = new Map<string, { name: string; hex: string }>();
    allColors.forEach((color) => {
      if (!uniqueColors.has(color.name)) {
        uniqueColors.set(color.name, color);
      }
    });
    return Array.from(uniqueColors.values());
  }, [shoes]);
  
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {[...Array(6)].map((_, i) => (
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
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-center mb-12">Boutique</h1>
          
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
            {loading ? renderSkeleton() : (
                <ShoeShowcase
                  shoes={shoes}
                  selectedCategory={selectedCategory}
                  searchTerm={searchTerm}
                  priceRange={priceRange}
                  selectedSizes={selectedSizes}
                  selectedColors={selectedColors}
                />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
