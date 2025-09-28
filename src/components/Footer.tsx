import React from 'react';
import { Facebook, Twitter, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-xl font-bold font-headline mb-4">Amani'store</h3>
            <p className="text-sm">
              The finest shoes, curated for you. Quality and style at your feet.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Sneakers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Formal
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Sport
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
            <div className="flex justify-center md:justify-start space-x-4">
              <a href="#" className="hover:text-primary transition-colors">
                <Facebook className="h-6 w-6" />
                <span className="sr-only">Facebook</span>
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Twitter className="h-6 w-6" />
                <span className="sr-only">Twitter</span>
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Instagram className="h-6 w-6" />
                <span className="sr-only">Instagram</span>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Amani'store. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
