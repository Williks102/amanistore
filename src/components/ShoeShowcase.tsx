'use client';

import React, { useState, useMemo } from 'react';
import { shoes } from '@/lib/data';
import type { Shoe, Category } from '@/lib/types';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import type { PriceRange } from '@/app/page';

interface ShoeShowcaseProps {
  selectedCategory: Category | null;
  searchTerm: string;
  priceRange: PriceRange;
  selectedSizes: number[];
  selectedColors: string[];
}

const ShoeShowcase = ({
  selectedCategory,
  searchTerm,
  priceRange,
  selectedSizes,
  selectedColors,
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
    return shoes.filter((shoe) => {
      // Category filter
      if (selectedCategory && shoe.categoryId !== selectedCategory.id) {
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
  }, [selectedCategory, searchTerm, priceRange, selectedSizes, selectedColors]);

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
