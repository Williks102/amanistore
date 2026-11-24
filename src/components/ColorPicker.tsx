'use client';

import { X } from 'lucide-react';
import type { ShoeColor } from '@/lib/types';
import { PALETTE, canonicalColor, canonicalColorName } from '@/lib/colors';

/**
 * Choix des couleurs d'un produit dans la palette officielle (plus de texte libre ni de code couleur à saisir).
 * Une couleur ancienne hors palette est signalée avec sa correspondance; elle est corrigée à l'enregistrement.
 */
export function ColorPicker({ value, onChange }: { value: ShoeColor[]; onChange: (colors: ShoeColor[]) => void }) {
  const remaining = PALETTE.filter((p) => !value.some((v) => canonicalColorName(v.name) === p.name));

  const add = (name: string) => {
    const color = PALETTE.find((p) => p.name === name);
    if (color) onChange([...value, { ...color }]);
  };

  return (
    <div className="space-y-3">
      <select
        aria-label="Ajouter une couleur"
        value=""
        onChange={(e) => add(e.target.value)}
        disabled={remaining.length === 0}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
      >
        <option value="">{remaining.length === 0 ? 'Toutes les couleurs sont ajoutées' : 'Ajouter une couleur…'}</option>
        {remaining.map((p) => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
      </select>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((color) => {
            const canonical = canonicalColor(color.name);
            const display = canonical ?? color;
            return (
              <li key={color.name} className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-secondary pl-3 pr-1 text-sm">
                <span aria-hidden="true" className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: display.hex }} />
                <span>
                  {color.name}
                  {canonical && canonical.name !== color.name ? <span className="text-muted-foreground"> → {canonical.name}</span> : null}
                  {!canonical ? <span className="text-destructive"> (hors palette)</span> : null}
                </span>
                <button
                  type="button"
                  aria-label={`Retirer ${color.name}`}
                  onClick={() => onChange(value.filter((c) => c.name !== color.name))}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
