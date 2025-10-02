
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { Menu, ShoppingBag, Search, User, LogOut, X } from 'lucide-react';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Separator } from './ui/separator';

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
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        <Button variant="ghost" asChild>
            <Link href="/login" className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">Connexion</span>
            </Link>
        </Button>
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
          {process.env.NEXT_PUBLIC_ADMIN_EMAIL === user.email && (
            <DropdownMenuItem asChild>
                <Link href="/admin">
                    <span>Admin</span>
                </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Déconnexion</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  
  const MobileMenuContent = () => (
    <div className="flex flex-col h-full">
        <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
            {navLinks.map(link => (
                <Link
                    key={link.href}
                    href={link.href}
                    className="block text-lg font-medium text-foreground hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                >
                    {link.label}
                </Link>
            ))}
            <Separator />
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="categories">
                    <AccordionTrigger className="text-lg font-medium">Catégories</AccordionTrigger>
                    <AccordionContent className="pl-4">
                        <div className="flex flex-col space-y-3 mt-2">
                        {categories.map((category) => (
                            <Link
                                key={category.id}
                                href={`/shop?category=${category.id}`}
                                className="text-base text-muted-foreground hover:text-primary"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {category.name}
                            </Link>
                        ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
             <Button variant="outline" className="w-full" onClick={() => { onToggleSidebar(); setMobileMenuOpen(false); }}>
                <Search className="mr-2 h-4 w-4"/> Filtrer & Rechercher
            </Button>
        </div>
        <div className="p-4 border-t">
           <UserMenu />
        </div>
    </div>
  );

  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b">
      <div className="container mx-auto px-4 flex justify-between items-center gap-4 py-4 relative">
        <div className="flex items-center gap-2">
          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
             <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Ouvrir le menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-sm p-0">
                <MobileMenuContent />
              </SheetContent>
            </Sheet>
          </div>
          {/* Logo */}
          <Link href="/" className="text-xl font-headline font-bold text-primary">
            Amani'store
          </Link>
        </div>

        {/* Center Section: Desktop Nav */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navLinks.map(link => (
                 <NavigationMenuItem key={link.href}>
                    <NavigationMenuLink asChild
                    className={cn(
                        navigationMenuTriggerStyle(),
                        'transition-colors hover:text-primary',
                        pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                    )}>
                    <Link href={link.href}>
                        {link.label}
                    </Link>
                    </NavigationMenuLink>
                </NavigationMenuItem>
            ))}

            <NavigationMenuItem>
              <NavigationMenuTrigger 
                className={cn('transition-colors hover:text-primary text-muted-foreground', pathname.startsWith('/categories') && 'text-primary')}
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
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right Section: Icons */}
        <div className="flex items-center gap-1 md:gap-2">
           <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="hidden md:inline-flex">
            <Search className="h-5 w-5" />
            <span className="sr-only">Filtrer et Rechercher</span>
          </Button>
          
          <div className="flex items-center">
            <UserMenu />
          </div>
          
          <Button variant="ghost" size="icon" onClick={onOpen} className="relative">
            <ShoppingBag className="h-6 w-6" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform bg-red-600 rounded-full">
                {items.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
            <span className="sr-only">Ouvrir le panier</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
