export type Profile = { name: string; phone: string; address: string };

export const EMPTY_PROFILE: Profile = { name: '', phone: '', address: '' };

// Chiffres, espaces, + ( ) . - ; l'indicatif peut s'écrire « +221 » ou « (225) ». Entre 8 et 15 chiffres au total.
const PHONE_PATTERN = /^[+(]?\d[\d\s().-]{6,29}$/;
const phoneDigits = (phone: string) => phone.replace(/\D/g, '').length;

/** Nettoie une saisie: espaces de bord retirés, espaces multiples réduits, longueurs plafonnées. */
export function sanitizeProfile(input: Partial<Profile> | null | undefined): Profile {
  const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/[ \t]+/g, ' ').slice(0, max) : '');
  return { name: clean(input?.name, 100), phone: clean(input?.phone, 30), address: clean(input?.address, 500) };
}

/** Message d'erreur en français, ou null si le profil est valide. Un champ vide reste permis. */
export function validateProfile(profile: Profile): string | null {
  if (profile.name && profile.name.length < 2) return 'Le nom doit faire au moins 2 caractères.';
  if (profile.phone && (!PHONE_PATTERN.test(profile.phone) || phoneDigits(profile.phone) < 8 || phoneDigits(profile.phone) > 15)) return 'Le numéro de téléphone semble invalide (chiffres, espaces et + seulement).';
  if (profile.address && profile.address.length < 10) return 'L’adresse est trop courte: indiquez le quartier, la rue et un repère.';
  return null;
}
