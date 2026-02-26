'use client';

import React, { useState } from 'react';
import type { Shoe } from '@/lib/types';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';

interface ShoeShowcaseProps {
  shoes: Shoe[];
}

const ShoeShowcase = ({ shoes }: ShoeShowcaseProps) => {
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

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {shoes.map((shoe) => (
          <ProductCard key={shoe.id} shoe={shoe} onClick={() => handleCardClick(shoe)} />
        ))}
      </div>
      {shoes.length === 0 && (
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
