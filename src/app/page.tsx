'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import ShoeShowcase from '@/components/ShoeShowcase';
import type { Category } from '@/lib/types';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  return (
    <div className="min-h-screen">
      <Header selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <main className="container mx-auto px-4 py-8">
        <ShoeShowcase selectedCategory={selectedCategory} />
      </main>
    </div>
  );
}
