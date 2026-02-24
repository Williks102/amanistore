import { useMemo } from 'react';
import type { Category, Collection, Shoe } from '@/lib/types';

export type UnifiedPriceRange = {
  min: number;
  max: number;
};

export type ProductFilters = {
  selectedCategory: Category | null;
  selectedCollection: Collection | null;
  searchTerm: string;
  priceRange: UnifiedPriceRange;
  selectedSizes: number[];
  selectedColors: string[];
};

export const DEFAULT_MAX_PRICE = 100000;

export const matchesProductFilters = (shoe: Shoe, filters: ProductFilters) => {
  const {
    selectedCategory,
    selectedCollection,
    searchTerm,
    priceRange,
    selectedSizes,
    selectedColors,
  } = filters;

  if (selectedCategory && shoe.categoryId !== selectedCategory.id) return false;
  if (selectedCollection && !selectedCollection.categoryIds.includes(shoe.categoryId)) return false;
  if (searchTerm && !shoe.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
  if (shoe.price < priceRange.min || shoe.price > priceRange.max) return false;
  if (selectedSizes.length > 0 && !selectedSizes.some((size) => shoe.availableSizes.includes(size))) return false;
  if (selectedColors.length > 0 && !selectedColors.some((colorName) => shoe.availableColors.some((color) => color.name === colorName))) return false;

  return true;
};

export function useProductFilters(shoes: Shoe[], filters: ProductFilters) {
  const filteredShoes = useMemo(
    () => shoes.filter((shoe) => matchesProductFilters(shoe, filters)),
    [shoes, filters]
  );

  const hasActiveFilters =
    !!filters.selectedCategory ||
    !!filters.selectedCollection ||
    filters.searchTerm.trim().length > 0 ||
    filters.priceRange.max < DEFAULT_MAX_PRICE ||
    filters.selectedSizes.length > 0 ||
    filters.selectedColors.length > 0;

  return {
    filteredShoes,
    hasActiveFilters,
  };
}
