import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/components/CartProvider';
import Footer from '@/components/Footer';
import { FirebaseClientProvider } from '@/firebase';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  // Liens d'aperçu absolus (WhatsApp, Facebook): voir SITE.url.
  metadataBase: new URL(SITE.url),
  title: SITE.name,
  description: SITE.tagline,
  openGraph: {
    title: SITE.name,
    description: SITE.tagline,
    siteName: SITE.name,
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: { card: 'summary_large_image', title: SITE.name, description: SITE.tagline },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="font-body antialiased h-full flex flex-col">
        <FirebaseClientProvider>
          <CartProvider>
            <div className="flex-grow">
              {children}
            </div>
            <Footer />
            <Toaster />
          </CartProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
