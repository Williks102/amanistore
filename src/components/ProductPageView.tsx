'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ProductDetail } from '@/components/ProductDetail';
import type { Category, Shoe } from '@/lib/types';
import { getCategories } from '@/services/categoryService';

/** Coque de la page produit: en-tête de la boutique (avec ses catégories) et fiche. */
export function ProductPageView({ shoe }: { shoe: Shoe }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header categories={categories} onToggleSidebar={() => router.push('/shop?search=1')} />
      <main className="flex-grow">
        <ProductDetail shoe={shoe} />
      </main>
    </div>
  );
}
