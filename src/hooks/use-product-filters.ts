import { useMemo } from 'react';
import type { Category, Collection, Shoe } from '@/lib/types';
import { isListable } from '@/lib/product-validation';
import { matchesOptionFilters, selectedCount, type SelectedOptions } from '@/lib/attribute-filters';

export type UnifiedPriceRange = {
  min: number;
  max: number;
};

export type ProductFilters = {
  selectedCategory: Category | null;
  selectedCollection: Collection | null;
  searchTerm: string;
  priceRange: UnifiedPriceRange;
  /** Valeurs cochées par attribut (Pointure, Couleur, Matière…), clé = nom de l'attribut sans accents ni casse. */
  selectedOptions: SelectedOptions;
};

export const DEFAULT_MAX_PRICE = 100000;

/** Plafond du curseur de prix: le prix le plus élevé du catalogue affichable, arrondi aux 5 000 XOF supérieurs. */
export function catalogMaxPrice(shoes: Pick<Shoe, 'price'>[]): number {
  const prices = shoes.filter(isListable).map((s) => s.price);
  if (prices.length === 0) return DEFAULT_MAX_PRICE;
  return Math.max(5000, Math.ceil(Math.max(...prices) / 5000) * 5000);
}

export const matchesProductFilters = (shoe: Shoe, filters: ProductFilters) => {
  const {
    selectedCategory,
    selectedCollection,
    searchTerm,
    priceRange,
    selectedOptions,
  } = filters;

  if (selectedCategory && shoe.categoryId !== selectedCategory.id) return false;
  if (selectedCollection && !selectedCollection.categoryIds.includes(shoe.categoryId)) return false;
  if (searchTerm && !shoe.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
  if (shoe.price < priceRange.min || shoe.price > priceRange.max) return false;
  if (!matchesOptionFilters(shoe, selectedOptions)) return false;

  return true;
};

export function useProductFilters(shoes: Shoe[], filters: ProductFilters, maxPrice: number = DEFAULT_MAX_PRICE) {
  const filteredShoes = useMemo(
    () => shoes.filter((shoe) => matchesProductFilters(shoe, filters)),
    [shoes, filters]
  );

  const hasActiveFilters =
    !!filters.selectedCategory ||
    !!filters.selectedCollection ||
    filters.searchTerm.trim().length > 0 ||
    filters.priceRange.max < maxPrice ||
    selectedCount(filters.selectedOptions) > 0;

  return {
    filteredShoes,
    hasActiveFilters,
  };
}
