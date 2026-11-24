import type { MetadataRoute } from 'next';
import { fetchAllShoes } from '@/lib/firestore-rest';
import { isListable } from '@/lib/product-validation';
import { SITE } from '@/lib/site';

/** Plan du site pour Google: pages principales et une adresse par produit affichable. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shoes = (await fetchAllShoes()).filter(isListable);
  const pages: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE.url}/contact`, changeFrequency: 'yearly', priority: 0.3 },
  ];
  const products: MetadataRoute.Sitemap = shoes.map((shoe) => ({
    url: `${SITE.url}/produit/${shoe.id}`,
    lastModified: shoe.createdAt ? new Date(shoe.createdAt) : undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
  return [...pages, ...products];
}
