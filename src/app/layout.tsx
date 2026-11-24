import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/components/CartProvider';
import Footer from '@/components/Footer';
import { FirebaseClientProvider } from '@/firebase';
import { SITE } from '@/lib/site';

// NEXT_PUBLIC_SITE_URL (ex. https://www.votre-domaine.com) permet des liens d'aperçu absolus (WhatsApp, Facebook).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
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
