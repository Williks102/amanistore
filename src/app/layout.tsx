import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/components/CartProvider';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: "Amani'store",
  description: 'The finest shoes, curated for you.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased h-full flex flex-col">
        <CartProvider>
          <div className="flex-grow">
            {children}
          </div>
          <Footer />
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
