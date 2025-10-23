
'use client';

import React, { useState, useEffect } from 'react';
import { Facebook, Instagram , } from 'lucide-react';
import type { Category } from '@/lib/types';
import { getCategories } from '@/services/categoryService';

const Footer = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Failed to fetch categories for footer:', error);
      }
    };
    fetchCategories();
  }, []);


  return (
    <footer className="bg-secondary text-secondary-foreground py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-xl font-bold font-headline mb-4">Amani's</h3>
            <p className="text-sm">
            Les chaussures les plus fines, soigneusement sélectionnées pour vous. Qualité et style à vos pieds.            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Catégories</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="hover:text-primary transition-colors">
                  Accueil
                </a>
              </li>
              {categories.map((category) => (
                 <li key={category.id}>
                    <a href={`#categories`} className="hover:text-primary transition-colors capitalize">
                        {category.name}
                    </a>
                 </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Nous suivre </h3>
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
          <p>&copy; {new Date().getFullYear()} Amani's. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
