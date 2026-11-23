import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Vérifie par calcul (WCAG 2.x) les contrastes des jetons de couleur de globals.css:
 * 4,5:1 pour le texte, 3:1 pour les contours de champs et l'anneau de focus.
 * Si une valeur de la charte change, ce test dit tout de suite si elle reste lisible.
 */
const css = readFileSync('src/app/globals.css', 'utf8');

function tokens(block: 'root' | 'dark'): Record<string, string> {
  const start = css.indexOf(block === 'root' ? ':root {' : '.dark {');
  const end = css.indexOf('}', start);
  const out: Record<string, string> = {};
  for (const m of css.slice(start, end).matchAll(/--([a-z-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g)) {
    out[m[1]] = `${m[2]} ${m[3]} ${m[4]}`;
  }
  return out;
}

function hslToRgb(spec: string): [number, number, number] {
  const [h, s, l] = spec.split(' ').map(Number);
  const sat = s / 100, lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function luminance(spec: string): number {
  const [r, g, b] = hslToRgb(spec).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT: Array<[string, string]> = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'muted'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['primary', 'background'], // lien ou texte d'accent
  ['sidebar-foreground', 'sidebar-background'],
  ['sidebar-primary-foreground', 'sidebar-primary'],
];
const NON_TEXT: Array<[string, string]> = [
  ['input', 'background'],
  ['input', 'card'],
  ['ring', 'background'],
];

for (const theme of ['root', 'dark'] as const) {
  const t = tokens(theme);
  describe(`contrastes du thème ${theme === 'root' ? 'clair' : 'sombre'}`, () => {
    it('tous les jetons utilisés sont définis', () => {
      for (const [a, b] of [...TEXT, ...NON_TEXT]) {
        expect(t[a], a).toBeTruthy();
        expect(t[b], b).toBeTruthy();
      }
    });
    for (const [fg, bg] of TEXT) {
      it(`${fg} sur ${bg} ≥ 4,5:1`, () => {
        expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
    for (const [fg, bg] of NON_TEXT) {
      it(`${fg} sur ${bg} ≥ 3:1`, () => {
        expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(3);
      });
    }
  });
}
