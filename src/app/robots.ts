import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

/** Les pages privées (administration, compte, commandes, connexion) ne doivent pas être indexées. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/dashboard', '/order-confirmation', '/validate-delivery', '/login', '/signup', '/mot-de-passe-oublie'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
