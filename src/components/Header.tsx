import React from 'react';
import { Button } from './ui/button';
import { Menu, ShoppingBag, Search, Filter } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { categories } from '@/lib/categories';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from './ui/input';

interface HeaderProps {
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onToggleSidebar: () => void;
}

const Header = ({
  selectedCategory,
  onSelectCategory,
  searchTerm,
  onSearchTermChange,
  onToggleSidebar,
}: HeaderProps) => {
  const { onOpen } = useCart();
  return (
    <header className="py-6 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
      <div className="container mx-auto px-4 flex justify-between items-center gap-4">
        <h1
          className="text-4xl font-headline font-bold text-center text-primary cursor-pointer hidden sm:block"
          onClick={() => onSelectCategory(null)}
        >
          Amani'store
        </h1>

        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher des chaussures..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
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

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Ouvrir le menu des catégories</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSelectCategory(null)}>
                  Toutes
                </DropdownMenuItem>
                {categories.map((category) => (
                  <DropdownMenuItem key={category.id} onClick={() => onSelectCategory(category)}>
                    {category.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggleSidebar}>
            <Filter className="h-6 w-6" />
            <span className="sr-only">Ouvrir les filtres</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={onOpen}>
            <ShoppingBag className="h-6 w-6" />
            <span className="sr-only">Ouvrir le panier</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
