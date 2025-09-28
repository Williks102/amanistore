import React from 'react';
import { Button } from './ui/button';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { categories } from '@/lib/categories';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

interface HeaderProps {
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
}

const Header = ({ selectedCategory, onSelectCategory }: HeaderProps) => {
  const { onOpen } = useCart();
  return (
    <header className="py-6 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <h1
          className="text-4xl font-headline font-bold text-center text-primary cursor-pointer"
          onClick={() => onSelectCategory(null)}
        >
          Amani'store
        </h1>
        <nav className="hidden md:flex items-center gap-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category)}
              className={cn(
                'text-lg font-medium transition-colors hover:text-primary',
                selectedCategory?.id === category.id ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {category.name}
            </button>
          ))}
        </nav>
        <Button variant="ghost" size="icon" onClick={onOpen}>
          <ShoppingBag className="h-6 w-6" />
          <span className="sr-only">Open Cart</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
