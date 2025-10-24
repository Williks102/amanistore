
'use client';

import React, { useState, useMemo } from 'react';
import type { Shoe, Category, Collection } from '@/lib/types';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import type { PriceRange } from '@/app/page';

interface ShoeShowcaseProps {
  shoes: Shoe[];
  selectedCategory: Category | null;
  selectedCollection: Collection | null;
  categories: Category[];
  searchTerm: string;
  priceRange: PriceRange;
  selectedSizes: number[];
  selectedColors: string[];
  filtersubset?: string[];
}

const ShoeShowcase = ({
  shoes,
  selectedCategory,
  selectedCollection,
  categories,
  searchTerm,
  priceRange,
  selectedSizes,
  selectedColors,
  filtersubset,
}: ShoeShowcaseProps) => {
  const [selectedShoe, setSelectedShoe] = useState<Shoe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (shoe: Shoe) => {
    setSelectedShoe(shoe);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedShoe(null);
    }, 300);
  };

  const filteredShoes = useMemo(() => {
    let shoesToShow = shoes;

    if (filtersubset) {
      const subsetSet = new Set(filtersubset);
      shoesToShow = shoes.filter(shoe => subsetSet.has(shoe.id));
    }
    
    return shoesToShow.filter((shoe) => {
      // Category filter
      if (selectedCategory && shoe.categoryId !== selectedCategory.id) {
        return false;
      }
      
      // Collection filter
      if (selectedCollection && !selectedCollection.categoryIds.includes(shoe.categoryId)) {
        return false;
      }

      // Search term filter
      if (searchTerm && !shoe.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Price range filter
      if (shoe.price < priceRange.min || shoe.price > priceRange.max) {
        return false;
      }
      // Size filter
      if (selectedSizes.length > 0 && !selectedSizes.some((size) => shoe.availableSizes.includes(size))) {
        return false;
      }
      // Color filter
      if (selectedColors.length > 0 && !selectedColors.some((colorName) => shoe.availableColors.some((c) => c.name === colorName))) {
        return false;
      }
      return true;
    });
  }, [shoes, selectedCategory, selectedCollection, searchTerm, priceRange, selectedSizes, selectedColors, filtersubset]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredShoes.map((shoe) => (
          <ProductCard key={shoe.id} shoe={shoe} onClick={() => handleCardClick(shoe)} />
        ))}
      </div>
      {filteredShoes.length === 0 && (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold mb-2">Aucun produit trouvé</h2>
          <p className="text-muted-foreground">Essayez d'ajuster vos filtres de recherche.</p>
        </div>
      )}
      {selectedShoe && (
        <ProductModal shoe={selectedShoe} isOpen={isModalOpen} onOpenChange={handleModalClose} />
      )}
    </>
  );
};

export default ShoeShowcase;
