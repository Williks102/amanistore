import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductPageView } from '@/components/ProductPageView';
import { fetchShoeById } from '@/lib/firestore-rest';
import { isListable } from '@/lib/product-validation';
import { stockSummaryFor } from '@/lib/attributes';
import { SITE } from '@/lib/site';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let shoe;
  try {
    shoe = await fetchShoeById(id);
  } catch {
    return { title: SITE.name }; // panne passagère de Firestore: la page elle-même affichera l'erreur avec « Réessayer »
  }
  if (!shoe || !isListable(shoe)) return { title: 'Produit introuvable', robots: { index: false } };

  const title = `${shoe.name} — ${SITE.name}`;
  const description = `${shoe.name}, ${shoe.price.toLocaleString('fr-FR')} XOF. ${shoe.description ?? ''}`.trim().slice(0, 200);
  return {
    title,
    description,
    alternates: { canonical: `/produit/${id}` },
    openGraph: { title, description, type: 'website', url: `/produit/${id}`, siteName: SITE.name, locale: 'fr_FR', images: [{ url: shoe.gridImage.url, alt: shoe.name }] },
    twitter: { card: 'summary_large_image', title, description, images: [shoe.gridImage.url] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const shoe = await fetchShoeById(id);
  if (!shoe || !isListable(shoe)) notFound();

  // Données structurées: permet à Google d'afficher le prix et la disponibilité.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: shoe.name,
    description: shoe.description,
    image: [shoe.gridImage.url, ...(shoe.detailImages ?? []).map((i) => i.url)],
    offers: {
      '@type': 'Offer',
      url: `${SITE.url}/produit/${id}`,
      priceCurrency: 'XOF',
      price: shoe.price,
      availability: stockSummaryFor(shoe).soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ProductPageView shoe={shoe} />
    </>
  );
}
