'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { catalogMaxPrice, useProductFilters, type ProductFilters } from '@/hooks/use-product-filters';
import { PALETTE, canonicalColor } from '@/lib/colors';
import { isListable, isSizeValid } from '@/lib/product-validation';
import { shoeColors, shoeSizes, stockSummaryFor } from '@/lib/attributes';
import { EmptyState } from '@/components/EmptyState';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PriceRange = {
  min: number;
  max: number;
};

const PAGE_SIZE = 24;

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Plafond choisi par la cliente; sinon le prix max du catalogue (aucun produit ne disparaît par défaut).
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
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
        setShoes(products.filter(isListable)); // un prix absurde ne s'affiche ni ne se commande
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

  const catalogMax = useMemo(() => catalogMaxPrice(shoes), [shoes]);
  const priceRange = useMemo<PriceRange>(() => ({ min: 0, max: Math.min(maxPriceFilter ?? catalogMax, catalogMax) }), [maxPriceFilter, catalogMax]);
  const setPriceRange = (range: PriceRange) => setMaxPriceFilter(range.max >= catalogMax ? null : range.max);

  // Pointures valides seulement; couleurs regroupées par nom officiel (« noir », « Noire » => « Noir »).
  const availableSizes = useMemo(() => {
    const allSizes = shoes.flatMap((shoe) => shoeSizes(shoe)).filter(isSizeValid);
    return [...new Set(allSizes)].sort((a, b) => a - b);
  }, [shoes]);

  const availableColors = useMemo(() => {
    const unique = new Map<string, { name: string; hex: string }>();
    shoes.forEach((shoe) =>
      shoeColors(shoe).forEach((color) => {
        const canonical = canonicalColor(color.name);
        const name = canonical?.name ?? color.name.trim();
        if (!unique.has(name)) unique.set(name, { name, hex: canonical?.hex ?? color.hex });
      })
    );
    const order = (n: string) => { const i = PALETTE.findIndex((p) => p.name === n); return i === -1 ? 999 : i; };
    return Array.from(unique.values()).sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name));
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

  const { filteredShoes } = useProductFilters(shoes, filters, catalogMax);
  const sortedShoes = useMemo(() => {
    const products = [...filteredShoes];
    const sorted =
      sortBy === 'price-asc' ? products.sort((a, b) => a.price - b.price)
      : sortBy === 'price-desc' ? products.sort((a, b) => b.price - a.price)
      : products.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    // Les produits épuisés passent en fin de liste (l'ordre choisi est conservé dans chaque groupe).
    return [...sorted.filter((s) => !stockSummaryFor(s).soldOut), ...sorted.filter((s) => stockSummaryFor(s).soldOut)];
  }, [filteredShoes, sortBy]);


  // Retour en haut de liste quand le choix change.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, selectedCollection, searchTerm, maxPriceFilter, selectedSizes, selectedColors, sortBy]);

  const categoryChips = useMemo(
    () =>
      categories
        .map((category) => ({ id: category.id, name: category.name, count: shoes.filter((s) => s.categoryId === category.id).length }))
        .filter((c) => c.count > 0),
    [categories, shoes]
  );

  const sidebarFilterCount =
    (searchTerm.trim() ? 1 : 0) + (priceRange.max < catalogMax ? 1 : 0) + selectedSizes.length + selectedColors.length;

  const activeChips = [
    ...(selectedCollection
      ? [{ key: 'collection', label: `Collection : ${selectedCollection.name}`, onRemove: () => router.push(selectedCategory ? `/shop?category=${selectedCategory.id}` : '/shop') }]
      : []),
    ...(searchTerm.trim() ? [{ key: 'search', label: `Recherche : ${searchTerm.trim()}`, onRemove: () => setSearchTerm('') }] : []),
    ...(priceRange.max < catalogMax ? [{ key: 'price', label: `Prix max : ${priceRange.max.toLocaleString('fr-FR')} XOF`, onRemove: () => setMaxPriceFilter(null) }] : []),
    ...selectedSizes.map((size) => ({ key: `size-${size}`, label: `Pointure ${size}`, onRemove: () => setSelectedSizes(selectedSizes.filter((x) => x !== size)) })),
    ...selectedColors.map((name) => ({ key: `color-${name}`, label: name, onRemove: () => setSelectedColors(selectedColors.filter((x) => x !== name)) })),
  ];

  const clearAll = () => {
    setSearchTerm('');
    setMaxPriceFilter(null);
    setSelectedSizes([]);
    setSelectedColors([]);
    if (selectedCollection) router.push(selectedCategory ? `/shop?category=${selectedCategory.id}` : '/shop');
  };

  const tabClass = (active: boolean) =>
    cn(
      'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:bg-accent'
    );

  const renderSkeleton = () => (
    <div aria-busy="true" className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 lg:gap-8">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );

  const visibleShoes = sortedShoes.slice(0, visibleCount);

  return (
    <div className="min-h-screen flex flex-col">
      <Header categories={categories} onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">Boutique</h1>
              <p className="mt-1 text-muted-foreground" aria-live="polite">{loading || loadError ? '\u00a0' : `${sortedShoes.length} produit${sortedShoes.length > 1 ? 's' : ''}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSidebarOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Filtres{sidebarFilterCount > 0 ? ` (${sidebarFilterCount})` : ''}
              </Button>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "price-asc" | "price-desc")}>
                <SelectTrigger className="w-[190px]" aria-label="Trier par"><SelectValue placeholder="Trier par" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus récents</SelectItem>
                  <SelectItem value="price-asc">Prix: croissant</SelectItem>
                  <SelectItem value="price-desc">Prix: décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Catégories en un geste: un vrai lien par catégorie (adresse partageable), défilement horizontal sur téléphone. */}
          {categoryChips.length > 0 && (
            <nav aria-label="Catégories" className="-mx-4 mb-4 overflow-x-auto px-4">
              <ul className="flex gap-2 pb-2">
                <li>
                  <Link href="/shop" scroll={false} aria-current={!selectedCategory && !selectedCollection ? 'page' : undefined} className={tabClass(!selectedCategory && !selectedCollection)}>
                    Tout
                  </Link>
                </li>
                {categoryChips.map((category) => (
                  <li key={category.id}>
                    <Link href={`/shop?category=${category.id}`} scroll={false} aria-current={selectedCategory?.id === category.id ? 'page' : undefined} className={tabClass(selectedCategory?.id === category.id)}>
                      {category.name}
                      <span className={cn('text-xs', selectedCategory?.id === category.id ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{category.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {activeChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Retirer le filtre : ${chip.label}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {chip.label}
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
              <Button variant="ghost" size="sm" onClick={clearAll}>Tout effacer</Button>
            </div>
          )}

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
            maxPrice={catalogMax}
            isOpen={isSidebarOpen}
            onOpenChange={setSidebarOpen}
          />

          <div className="w-full">
            {loading ? renderSkeleton() : loadError ? <LoadError onRetry={() => setReloadKey((k) => k + 1)} /> : sortedShoes.length === 0 ? (
              <EmptyState
                title="Aucun produit ne correspond"
                hint={activeChips.length > 0 ? 'Essayez de retirer un filtre.' : 'Revenez bientôt, de nouveaux modèles arrivent.'}
              />
            ) : (
              <>
                <ShoeShowcase shoes={visibleShoes} columns="two-up" />
                {sortedShoes.length > visibleCount && (
                  <div className="mt-8 text-center">
                    <Button variant="outline" size="lg" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                      Voir plus de produits ({sortedShoes.length - visibleCount} restants)
                    </Button>
                    <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">{visibleCount} sur {sortedShoes.length} affichés</p>
                  </div>
                )}
              </>
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
