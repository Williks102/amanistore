/** Numéro au format international pour wa.me (chiffres seulement), ou null si le numéro n'a pas d'indicatif explicite (+ ou 00). */
export function internationalDigits(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? digits : null;
  if (trimmed.startsWith('00')) return digits.length >= 10 && digits.length <= 17 ? digits.slice(2) : null;
  return null; // « 77 123 45 67 »: on ne devine pas le pays (Côte d'Ivoire, Sénégal…)
}

/** Lien d'appel `tel:`; garde seulement chiffres et +. */
export function telHref(phone: string): string {
  return `tel:${phone.trim().replace(/[^\d+]/g, '')}`;
}

/** Lien WhatsApp vers la cliente (message prérempli), ou null si le numéro n'a pas d'indicatif international. */
export function customerWhatsappLink(phone: string, message: string): string | null {
  const digits = internationalDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}
