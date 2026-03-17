'use client';

import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram } from 'lucide-react';

const mainMenuLinks = [
  { href: '/', label: 'Accueil' },
  { href: '/shop', label: 'Boutique' },
  { href: '/contact', label: 'Contact' },
];

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-xl font-bold font-headline mb-4">Amani&apos;s</h3>
            <p className="text-sm">Les chaussures les plus fines, soigneusement sélectionnées pour vous. Qualité et style à vos pieds.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Menu principal</h3>
            <ul className="space-y-2 text-sm">
              {mainMenuLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Nous suivre</h3>
            <div className="flex justify-center md:justify-start space-x-4">
              <a href="https://www.facebook.com/bijoux.Amani.S" className="hover:text-primary transition-colors">
                <Facebook className="h-6 w-6" />
                <span className="sr-only">Facebook</span>
              </a>

              <a href="https://www.instagram.com/amanis.ci/" className="hover:text-primary transition-colors">
                <Instagram className="h-6 w-6" />
                <span className="sr-only">Instagram</span>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Amani&apos;s. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
