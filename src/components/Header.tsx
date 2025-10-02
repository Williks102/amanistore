
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Menu, ShoppingBag, Search, User, LogOut } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Input } from './ui/input';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';


interface HeaderProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onToggleSidebar: () => void;
}

const Header = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchTerm,
  onSearchTermChange,
  onToggleSidebar,
}: HeaderProps) => {
  const { onOpen, items } = useCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  const UserMenu = () => {
    if (isUserLoading) {
      return <Skeleton className="h-8 w-8 rounded-full" />;
    }

    if (!user) {
      return (
        <div className="flex items-center gap-1">
          <Button variant="ghost" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Inscription</Link>
          </Button>
        </div>
      )
    }

    return (
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
              <AvatarFallback>{(user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuItem disabled>
            <p className="font-medium">Connecté en tant que</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <User className="mr-2 h-4 w-4" />
              <span>Mon Compte</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Déconnexion</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b">
      {/* Top Bar */}
      <div className="bg-secondary text-secondary-foreground py-2 text-sm">
        <div className="container mx-auto px-4 text-center">
          <p>Bienvenue dans votre boutique en ligne</p>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 flex justify-between items-center gap-4 py-4 relative">
        {/* Left Section: Logo & Mobile Menu */}
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Ouvrir le menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onSelectCategory(null)}>Toutes</DropdownMenuItem>
                {categories.map((category) => (
                  <DropdownMenuItem key={category.id} onClick={() => onSelectCategory(category)}>
                    {category.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={onToggleSidebar}>
                  Filtrer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
           <h1
            className="text-xl font-headline font-bold text-primary cursor-pointer"
            onClick={() => onSelectCategory(null)}
          >
            Amani'store
          </h1>
        </div>

        {/* Center Section: Desktop Nav */}
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

        {/* Mobile Search - absolute positioned */}
        {isSearchOpen && (
            <div className="absolute top-full left-4 right-4 mt-2 sm:hidden">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                 <Input
                    type="search"
                    placeholder="Rechercher..."
                    className="pl-10 w-full"
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                 />
              </div>
            </div>
        )}


        {/* Right Section: Icons */}
        <div className="flex items-center gap-2">
           <div className="hidden sm:block relative mr-2">
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

          <div className="flex items-center">
            <UserMenu />

            <Button variant="ghost" size="icon" onClick={onOpen} className="relative">
              <ShoppingBag className="h-6 w-6" />
              {items.length > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {items.length}
                </span>
              )}
              <span className="sr-only">Ouvrir le panier</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
