/** Informations publiques de la boutique, au même endroit (accueil, pied de page, fiche produit, aperçu de partage). */
export const SITE = {
  name: "Amani's",
  /** Adresse publique du site (liens d'aperçu WhatsApp/Facebook). Surchargeable par NEXT_PUBLIC_SITE_URL (domaine personnalisé). */
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://amanis.vercel.app').replace(/\/+$/, ''),
  tagline: 'Des chaussures raffinées, soigneusement sélectionnées pour vous.',
  subtitle: 'Qualité et style à vos pieds.',
  /** Numéro WhatsApp de la boutique, au format international sans « + ». */
  whatsappNumber: '2250172698282',
  facebookUrl: 'https://www.facebook.com/bijoux.Amani.S',
  instagramUrl: 'https://www.instagram.com/amanis.ci/',
} as const;

/** Lien WhatsApp vers la boutique, avec un message prérempli facultatif. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${SITE.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
