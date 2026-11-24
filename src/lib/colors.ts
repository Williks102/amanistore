import type { ShoeColor } from './types';

/**
 * Palette officielle de la boutique. Un produit ne peut avoir que ces couleurs (nom + code),
 * ce qui évite « Noir / noir / Noire » et les codes faux (un « Rouge » en #000000).
 */
export const PALETTE: ShoeColor[] = [
  { name: 'Noir', hex: '#1C1B1A' },
  { name: 'Blanc', hex: '#FFFFFF' },
  { name: 'Blanc cassé', hex: '#F4EFE6' },
  { name: 'Beige', hex: '#D9C4A3' },
  { name: 'Marron', hex: '#6B4423' },
  { name: 'Kaki', hex: '#9C9A6B' },
  { name: 'Rouge', hex: '#C21F1F' },
  { name: 'Bordeaux', hex: '#6D1A24' },
  { name: 'Rose', hex: '#E58FB0' },
  { name: 'Orange', hex: '#F08428' },
  { name: 'Jaune', hex: '#F2C230' },
  { name: 'Vert', hex: '#2E7D4F' },
  { name: 'Bleu', hex: '#1F4FBF' },
  { name: 'Bleu nuit', hex: '#14213D' },
  { name: 'Bleu ciel', hex: '#87CEEB' },
  { name: 'Gris', hex: '#8A8985' },
  { name: 'Violet', hex: '#7B3FA0' },
  { name: 'Doré', hex: '#D4A940' },
  { name: 'Argenté', hex: '#C5C7CB' },
];

/** Écritures historiques reconnues (clé = nom sans accents, sans espaces ni ponctuation, en minuscules). */
const VARIANTS: Record<string, string> = {
  noir: 'Noir', noire: 'Noir', noirmatte: 'Noir', noirverni: 'Noir',
  blanc: 'Blanc', blanche: 'Blanc', blanccasse: 'Blanc cassé', blanccassee: 'Blanc cassé', ecru: 'Blanc cassé',
  beige: 'Beige',
  marron: 'Marron', maron: 'Marron',
  kaki: 'Kaki',
  rouge: 'Rouge', rougebordeau: 'Bordeaux', rougebordeaux: 'Bordeaux', bordeau: 'Bordeaux', bordeaux: 'Bordeaux',
  rose: 'Rose', orange: 'Orange', jaune: 'Jaune', vert: 'Vert', verte: 'Vert',
  bleu: 'Bleu', bleue: 'Bleu', blue: 'Bleu',
  bleunuit: 'Bleu nuit', bleuenuit: 'Bleu nuit', marine: 'Bleu nuit',
  bleuciel: 'Bleu ciel', bleueciel: 'Bleu ciel',
  gris: 'Gris', grise: 'Gris', grismetallise: 'Gris', grismetallisee: 'Gris',
  violet: 'Violet', violette: 'Violet',
  dore: 'Doré', doree: 'Doré', or: 'Doré',
  argent: 'Argenté', argente: 'Argenté', argentee: 'Argenté',
};

function key(raw: string): string {
  return raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

/** Couleur de la palette correspondant à un nom (écriture libre ou historique), ou null si inconnue. */
export function canonicalColor(raw: string): ShoeColor | null {
  const name = VARIANTS[key(raw)];
  return name ? PALETTE.find((c) => c.name === name) ?? null : null;
}

/** Nom officiel si connu, sinon le nom tel quel (sert à regrouper les filtres même avant nettoyage des données). */
export function canonicalColorName(raw: string): string {
  return canonicalColor(raw)?.name ?? raw.trim();
}

export type ColorNormalization = {
  colors: ShoeColor[];
  /** Noms qui n'ont aucune correspondance dans la palette (à corriger à la main). */
  unmapped: string[];
  changed: boolean;
};

/** Remplace chaque couleur par celle de la palette (nom et code) et supprime les doublons. */
export function normalizeColors(colors: ShoeColor[]): ColorNormalization {
  const out: ShoeColor[] = [];
  const unmapped: string[] = [];
  for (const color of colors) {
    const canonical = canonicalColor(color.name);
    if (!canonical) {
      unmapped.push(color.name);
      out.push(color);
      continue;
    }
    if (!out.some((c) => c.name === canonical.name)) out.push({ ...canonical });
  }
  const changed = out.length !== colors.length || out.some((c, i) => c.name !== colors[i]?.name || c.hex !== colors[i]?.hex);
  return { colors: out, unmapped, changed };
}
