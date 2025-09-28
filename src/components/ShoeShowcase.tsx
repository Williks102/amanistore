'use client';

import React, { useState, useMemo } from 'react';
import { shoes } from '@/lib/data';
import type { Shoe, Category } from '@/lib/types';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';

interface ShoeShowcaseProps {
  selectedCategory: Category | null;
}

const ShoeShowcase = ({ selectedCategory }: ShoeShowcaseProps) => {
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
    if (!selectedCategory) {
      return shoes;
    }
    return shoes.filter((shoe) => shoe.categoryId === selectedCategory.id);
  }, [selectedCategory]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredShoes.map((shoe) => (
          <ProductCard key={shoe.id} shoe={shoe} onClick={() => handleCardClick(shoe)} />
        ))}
      </div>
      {selectedShoe && (
        <ProductModal shoe={selectedShoe} isOpen={isModalOpen} onOpenChange={handleModalClose} />
      )}
    </>
  );
};

export default ShoeShowcase;
