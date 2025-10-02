
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { Menu, ShoppingBag, Search, User, LogOut, ChevronDown } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Input } from './ui/input';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';

interface HeaderProps {
  categories: Category[];
  onToggleSidebar: () => void;
}

const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'>
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';

const Header = ({ categories, onToggleSidebar }: HeaderProps) => {
  const { onOpen, items } = useCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut(auth);
  };
  
  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/shop', label: 'Boutique' },
    { href: '/contact', label: 'Contact' },
  ];

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
      );
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
    );
  };

  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b">
      <div className="container mx-auto px-4 flex justify-between items-center gap-4 py-4 relative">
        <div className="flex items-center gap-2">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Ouvrir le menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {navLinks.map(link => (
                    <DropdownMenuItem key={link.href} asChild>
                        <Link href={link.href}>{link.label}</Link>
                    </DropdownMenuItem>
                ))}
                 <DropdownMenuSeparator />
                  <DropdownMenuItem>Catégories</DropdownMenuItem>
                 {categories.map((category) => (
                    <DropdownMenuItem key={category.id} asChild>
                        <Link href={`/shop?category=${category.id}`}>{category.name}</Link>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleSidebar}>Filtrer</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Logo */}
          <Link href="/" className="text-xl font-headline font-bold text-primary">
            Amani'store
          </Link>
        </div>

        {/* Center Section: Desktop Nav */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
                <NavigationMenuLink asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    'transition-colors hover:text-primary',
                    pathname === '/' ? 'text-primary border-b-2 border-destructive' : 'text-muted-foreground'
                  )}>
                  <Link href="/">
                    Accueil
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            <NavigationMenuItem>
                <NavigationMenuLink asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    'transition-colors hover:text-primary',
                    pathname === '/shop' ? 'text-primary border-b-2 border-destructive' : 'text-muted-foreground'
                  )}>
                  <Link href="/shop">
                    Boutique
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger 
                className={cn('transition-colors hover:text-primary', pathname.startsWith('/categories') ? 'text-primary border-b-2 border-destructive' : 'text-muted-foreground')}
              >
                Catégories
                </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                  {categories.map((component) => (
                    <ListItem key={component.name} title={component.name} href={`/shop?category=${component.id}`}>
                        Découvrez notre sélection de {component.name.toLowerCase()}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
                <NavigationMenuLink asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    'transition-colors hover:text-primary',
                    pathname === '/contact' ? 'text-primary border-b-2 border-destructive' : 'text-muted-foreground'
                  )}>
                  <Link href="/contact">
                    Contact
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right Section: Icons */}
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            <Search className="h-6 w-6" />
            <span className="sr-only">Filtrer et Rechercher</span>
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
