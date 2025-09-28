'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import ShoeShowcase from '@/components/ShoeShowcase';
import type { Category } from '@/lib/types';
import Hero from '@/components/Hero';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      <Header selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <main className="flex-grow">
        <Hero />
        <div className="container mx-auto px-4 py-8">
          <ShoeShowcase selectedCategory={selectedCategory} />
        </div>
      </main>
    </div>
  );
}
