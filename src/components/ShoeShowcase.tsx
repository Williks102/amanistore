'use client';

import React, { useMemo } from 'react';
import type { Category, Collection, Shoe } from '@/lib/types';
import ProductCard from './ProductCard';
import { type ProductFilters, useProductFilters } from '@/hooks/use-product-filters';

interface ShoeShowcaseProps {
  shoes: Shoe[];
  selectedCategory?: Category | null;
  selectedCollection?: Collection | null;
  searchTerm?: string;
  priceRange?: { min: number; max: number };
  selectedSizes?: number[];
  selectedColors?: string[];
  filtersubset?: string[];
}

const ShoeShowcase = ({
  shoes,
  selectedCategory = null,
  selectedCollection = null,
  searchTerm = '',
  priceRange,
  selectedSizes = [],
  selectedColors = [],
  filtersubset,
}: ShoeShowcaseProps) => {
  const resolvedPriceRange = priceRange ?? {
    min: 0,
    max: Math.max(...shoes.map((shoe) => shoe.price), 0),
  };

  const filters = useMemo<ProductFilters>(
    () => ({
      selectedCategory,
      selectedCollection,
      searchTerm,
      priceRange: resolvedPriceRange,
      selectedSizes,
      selectedColors,
    }),
    [selectedCategory, selectedCollection, searchTerm, resolvedPriceRange, selectedSizes, selectedColors]
  );

  const { filteredShoes } = useProductFilters(shoes, filters);
  const displayedShoes = useMemo(() => {
    if (!filtersubset) return filteredShoes;
    return filteredShoes.filter((shoe) => filtersubset.includes(shoe.id));
  }, [filteredShoes, filtersubset]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayedShoes.map((shoe) => (
          <ProductCard key={shoe.id} shoe={shoe} productHref={`/shop/produit/${shoe.id}`} />
        ))}
      </div>
      {displayedShoes.length === 0 && (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold mb-2">Aucun produit trouvé</h2>
          <p className="text-muted-foreground">Essayez d'ajuster vos filtres de recherche.</p>
        </div>
      )}
    </>
  );
};

export default ShoeShowcase;
