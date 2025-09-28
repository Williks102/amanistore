import React, { useState } from 'react';
import { Button } from './ui/button';
import { Menu, ShoppingBag, Search, Filter, Phone, Mail } from 'lucide-react';
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b">
      {/* Top Bar */}
      <div className="bg-secondary text-secondary-foreground py-2 text-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="tel:+2250707070707" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Phone className="h-4 w-4" />
              <span>+225 0707070707</span>
            </a>
            <a href="mailto:contact@amani.store" className="flex items-center gap-1 hover:text-primary transition-colors hidden sm:flex">
              <Mail className="h-4 w-4" />
              <span>contact@amani.store</span>
            </a>
          </div>
          <div className="hidden md:block">
            <p>Livraison gratuite à partir de 50 000 XOF d'achat</p>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 flex justify-between items-center gap-4 py-4">
        <div className="flex items-center gap-4">
          <h1
            className="text-4xl font-headline font-bold text-primary cursor-pointer"
            onClick={() => onSelectCategory(null)}
          >
            Amani'store
          </h1>
        </div>

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

        <div className="flex items-center gap-2">
           <div className={cn("relative sm:block", isSearchOpen ? 'block' : 'hidden')}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher..."
              className="pl-10 w-full sm:w-auto"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
            />
          </div>

          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setIsSearchOpen(!isSearchOpen)}>
            <Search className="h-6 w-6" />
            <span className="sr-only">Rechercher</span>
          </Button>

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Ouvrir le menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSelectCategory(null)}>Toutes</DropdownMenuItem>
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
