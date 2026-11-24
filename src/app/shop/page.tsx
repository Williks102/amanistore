'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { LoadError } from '@/components/LoadError';
import ShoeShowcase from '@/components/ShoeShowcase';
import Link from 'next/link';
import type { Category, Collection, Shoe } from '@/lib/types';
import { Sidebar } from '@/components/Sidebar';
import { getProducts } from '@/services/productService';
import { getCategories } from '@/services/categoryService';
import { getCollections } from '@/services/collectionService';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_MAX_PRICE, useProductFilters, type ProductFilters } from '@/hooks/use-product-filters';

export type PriceRange = {
  min: number;
  max: number;
};

function ShopContent() {
  const searchParams = useSearchParams();
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: DEFAULT_MAX_PRICE });
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const [products, fetchedCategories, fetchedCollections] = await Promise.all([getProducts(), getCategories(), getCollections()]);
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

  // Les liens de l'accueil mènent ici: /shop?category=…, /shop?collection=… et /shop?search=1 (ouvre la recherche).
  useEffect(() => {
    const categoryId = searchParams.get('category');
    const collectionId = searchParams.get('collection');
    setSelectedCategory(categoryId ? categories.find((category) => category.id === categoryId) || null : null);
    setSelectedCollection(collectionId ? collections.find((collection) => collection.id === collectionId) || null : null);
  }, [categories, collections, searchParams]);

  useEffect(() => {
    if (searchParams.get('search')) setSidebarOpen(true);
  }, [searchParams]);

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

  const filters = useMemo<ProductFilters>(
    () => ({
      selectedCategory,
      selectedCollection,
      searchTerm,
      priceRange,
      selectedSizes,
      selectedColors,
    }),
    [selectedCategory, selectedCollection, searchTerm, priceRange, selectedSizes, selectedColors]
  );

  const { filteredShoes } = useProductFilters(shoes, filters);
  const sortedShoes = useMemo(() => {
    const products = [...filteredShoes];
    if (sortBy === 'price-asc') return products.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return products.sort((a, b) => b.price - a.price);
    return products.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [filteredShoes, sortBy]);


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
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header categories={categories} onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Boutique</h1>
              <p className="text-muted-foreground mt-1">{loading || loadError ? '\u00a0' : `${sortedShoes.length} produit(s) disponibles`}</p>
              {(selectedCategory || selectedCollection) && (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-medium">{selectedCategory ? `Catégorie : ${selectedCategory.name}` : `Collection : ${selectedCollection?.name}`}</span>
                  <Link href="/shop" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">
                    Voir toute la boutique
                  </Link>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSidebarOpen(true)}>Filtres</Button>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "price-asc" | "price-desc")}>
                <SelectTrigger className="w-[210px]"><SelectValue placeholder="Trier par" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus récents</SelectItem>
                  <SelectItem value="price-asc">Prix: croissant</SelectItem>
                  <SelectItem value="price-desc">Prix: décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Sidebar
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            availableSizes={availableSizes}
            selectedSizes={selectedSizes}
            onSelectedSizesChange={setSelectedSizes}
            availableColors={availableColors}
            selectedColors={selectedColors}
            onSelectedColorsChange={setSelectedColors}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            resultCount={filteredShoes.length}
            isOpen={isSidebarOpen}
            onOpenChange={setSidebarOpen}
          />
          
          <div className="w-full">
            {loading ? renderSkeleton() : loadError ? <LoadError onRetry={() => setReloadKey((k) => k + 1)} /> : (
                <ShoeShowcase shoes={sortedShoes} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ShopPage() {
  // useSearchParams demande une frontière Suspense pour le rendu statique.
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  );
}
