'use client';

import React, { useState } from 'react';
import { shoes } from '@/lib/data';
import type { Shoe } from '@/lib/types';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';

const ShoeShowcase = () => {
  const [selectedShoe, setSelectedShoe] = useState<Shoe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (shoe: Shoe) => {
    setSelectedShoe(shoe);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Delay clearing the selected shoe to allow for the closing animation
    setTimeout(() => {
      setSelectedShoe(null);
    }, 300);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {shoes.map((shoe) => (
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
