'use client';

import { useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Attribute } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_OPTIONS, combinations } from '@/lib/attributes';
import { optionsFromState, stockRowsFor, type OptionsFormState } from '@/lib/option-form';

type Props = {
  idPrefix: string;
  attributes: Attribute[];
  state: OptionsFormState;
  onChange: (state: OptionsFormState) => void;
  /** Ouvre la page « Attributs ». */
  onGoToAttributes?: () => void;
  /** Crée Pointure et Couleur d'un clic (première utilisation). */
  onCreateStarters?: () => Promise<void> | void;
};

/** Attributs du produit (0 à 2, avec les valeurs proposées) puis stock: une ligne par pointure ou combinaison. */
export function ProductOptionsEditor({ idPrefix, attributes, state, onChange, onGoToAttributes, onCreateStarters }: Props) {
  const [busy, setBusy] = useState(false);
  const [fillAll, setFillAll] = useState('');
  const options = useMemo(() => optionsFromState(state, attributes), [state, attributes]);
  const unused = attributes.filter((a) => !state.selected.some((s) => s.attributeId === a.id));
  const scope = options.length < 2 ? 'combination' : state.scope;
  const rows = useMemo(() => stockRowsFor(options, scope), [options, scope]);
  const comboCount = combinations(options).length;

  const set = (patch: Partial<OptionsFormState>) => onChange({ ...state, ...patch });
  const addAttribute = (id: string) => {
    const attribute = attributes.find((a) => a.id === id);
    if (attribute) set({ selected: [...state.selected, { attributeId: id, values: attribute.values.map((v) => v.label) }], qty: {} });
  };
  const removeAttribute = (id: string) => set({ selected: state.selected.filter((s) => s.attributeId !== id), qty: {} });
  const toggleValue = (id: string, label: string) =>
    set({
      selected: state.selected.map((s) =>
        s.attributeId === id ? { ...s, values: s.values.includes(label) ? s.values.filter((v) => v !== label) : [...s.values, label] } : s
      ),
    });
  const setAllValues = (attribute: Attribute, all: boolean) =>
    set({ selected: state.selected.map((s) => (s.attributeId === attribute.id ? { ...s, values: all ? attribute.values.map((v) => v.label) : [] } : s)) });

  return (
    <div className="space-y-4">
      <section aria-labelledby={`${idPrefix}-attrs`} className="space-y-3 rounded-md border p-4">
        <div>
          <h3 id={`${idPrefix}-attrs`} className="font-semibold">Attributs du produit</h3>
          <p className="text-sm text-muted-foreground">
            Ce que la cliente choisit (pointure, couleur, taille de bague…). {MAX_OPTIONS} au maximum. Aucun attribut: sac, pochette… seule la quantité compte.
          </p>
        </div>

        {attributes.length === 0 && (
          <div className="space-y-3 rounded-md border border-dashed p-4 text-sm">
            <p>Vous n’avez encore créé aucun attribut. Les attributs servent à décrire vos produits (Pointure, Couleur, Taille, Matière…).</p>
            <div className="flex flex-wrap gap-2">
              {onCreateStarters && (
                <Button type="button" disabled={busy} className="min-h-11" onClick={async () => { setBusy(true); try { await onCreateStarters(); } finally { setBusy(false); } }}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Créer Pointure et Couleur
                </Button>
              )}
              {onGoToAttributes && <Button type="button" variant="outline" className="min-h-11" onClick={onGoToAttributes}>Gérer les attributs</Button>}
            </div>
          </div>
        )}

        {state.selected.map((sel) => {
          const attribute = attributes.find((a) => a.id === sel.attributeId);
          if (!attribute) return <p key={sel.attributeId} className="text-sm text-destructive">Un attribut de ce produit n’existe plus.</p>;
          return (
            <fieldset key={attribute.id} className="space-y-2 rounded-md border bg-secondary/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <legend className="font-medium">{attribute.name}</legend>
                <Button type="button" variant="ghost" size="sm" aria-label={`Retirer l’attribut ${attribute.name}`} onClick={() => removeAttribute(attribute.id)}>
                  <X className="mr-1 h-4 w-4" /> Retirer
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAllValues(attribute, true)}>Tout cocher</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAllValues(attribute, false)}>Tout décocher</Button>
              </div>
              <ul className="flex flex-wrap gap-2">
                {attribute.values.map((v) => {
                  const checked = sel.values.includes(v.label);
                  return (
                    <li key={v.label}>
                      <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${checked ? 'border-primary bg-primary/10 font-medium' : 'border-input bg-background'}`}>
                        <input type="checkbox" className="h-5 w-5 accent-primary" checked={checked} onChange={() => toggleValue(attribute.id, v.label)} />
                        {attribute.kind === 'color' && <span aria-hidden="true" className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: v.hex ?? '#C5C7CB' }} />}
                        {v.label}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}

        {attributes.length > 0 && state.selected.length < MAX_OPTIONS && unused.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-add-attr`}>Ajouter un attribut</Label>
            <select
              id={`${idPrefix}-add-attr`}
              value=""
              onChange={(e) => addAttribute(e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
            >
              <option value="">Choisir un attribut…</option>
              {unused.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        {attributes.length > 0 && onGoToAttributes && (
          <Button type="button" variant="link" className="h-auto min-h-11 whitespace-normal px-0 text-left" onClick={onGoToAttributes}>Gérer les attributs: créer, renommer, ajouter des valeurs</Button>
        )}
      </section>

      <section aria-labelledby={`${idPrefix}-stock`} className="space-y-3 rounded-md border p-4">
        <h3 id={`${idPrefix}-stock`} className="font-semibold">Stock</h3>

        {state.tracked && options.length === 2 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Comment compter le stock ?</legend>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name={`${idPrefix}-scope`} className="h-5 w-5 accent-primary" checked={scope === 'combination'} onChange={() => set({ scope: 'combination', qty: {} })} />
              Une quantité par combinaison ({options[0].name} + {options[1].name})
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name={`${idPrefix}-scope`} className="h-5 w-5 accent-primary" checked={scope === 'attribute1'} onChange={() => set({ scope: 'attribute1', qty: {} })} />
              Une quantité par {options[0].name}, partagée entre les {options[1].name.toLowerCase()}s
            </label>
          </fieldset>
        )}

        {state.tracked && comboCount > 100 && scope === 'combination' && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {comboCount} combinaisons: c’est trop (100 au maximum). Décochez des valeurs, ou partagez le stock par {options[0]?.name}.
          </p>
        )}

        {state.tracked && (comboCount <= 100 || scope === 'attribute1') ? (
          <>
            {rows.length > 3 && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-fill`} className="text-xs">Même quantité partout</Label>
                  <Input id={`${idPrefix}-fill`} inputMode="numeric" className="w-28" value={fillAll} onChange={(e) => setFillAll(e.target.value)} placeholder="Ex: 5" />
                </div>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => set({ qty: Object.fromEntries(rows.map((r) => [r.key, fillAll])) })}>Appliquer</Button>
              </div>
            )}
            <ul className="space-y-2">
              {rows.map((row) => (
                <li key={row.key} className="flex flex-wrap items-end justify-between gap-2 rounded-md border p-2">
                  <Label htmlFor={`${idPrefix}-qty-${row.key}`} className="min-w-0 flex-1 text-sm">{row.label}</Label>
                  <Input
                    id={`${idPrefix}-qty-${row.key}`}
                    inputMode="numeric"
                    className="w-24 shrink-0"
                    placeholder="Stock"
                    aria-label={`Stock: ${row.label}`}
                    value={state.qty[row.key] ?? ''}
                    onChange={(e) => set({ qty: { ...state.qty, [row.key]: e.target.value } })}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={!state.tracked} onChange={(e) => set({ tracked: !e.target.checked })} />
          Ne pas suivre le stock (quantité illimitée)
        </label>
      </section>
    </div>
  );
}
