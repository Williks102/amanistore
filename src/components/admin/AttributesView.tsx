'use client';

import { useState } from 'react';
import { Loader2, Plus, Shapes, Trash2, X } from 'lucide-react';
import type { Attribute, AttributeKind, Shoe } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/EmptyState';
import { AttributeMigrationCard } from '@/components/admin/AttributeMigrationCard';
import { useToast } from '@/hooks/use-toast';
import { createAttribute, deleteAttribute, updateAttribute } from '@/app/actions';
import { getIdToken } from '@/lib/get-id-token';
import { PALETTE } from '@/lib/colors';
import { splitValues, STARTER_ATTRIBUTES } from '@/lib/option-form';
import { validateAttribute } from '@/lib/attributes';

type Draft = { id: string | null; name: string; kind: AttributeKind; values: Array<{ label: string; hex?: string }> };

type Props = {
  attributes: Attribute[];
  shoes: Shoe[];
  onChanged: () => void | Promise<void>;
  /** Crée Pointure et Couleur d'un clic. */
  onCreateStarters: () => Promise<void>;
};

const usedBy = (shoes: Shoe[], id: string) => shoes.filter((s) => (s.options ?? []).some((o) => o.attributeId === id));

/** Gestion des attributs de produit: une carte par attribut, fenêtre pour créer ou modifier. */
export function AttributesView({ attributes, shoes, onChanged, onCreateStarters }: Props) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<Attribute | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!draft) return;
    const problem = validateAttribute({ name: draft.name, kind: draft.kind, values: draft.values });
    if (problem) {
      toast({ title: 'Attribut invalide', description: problem, variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const token = await getIdToken();
      const result = draft.id
        ? await updateAttribute(token, draft.id, { name: draft.name, values: draft.values })
        : await createAttribute(token, { name: draft.name, kind: draft.kind, values: draft.values });
      if (!result.success) {
        toast({ title: 'Enregistrement impossible', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: draft.id ? 'Attribut modifié' : 'Attribut créé', description: draft.name });
      setDraft(null);
      await onChanged();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error?.message ?? 'Opération impossible.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      const result = await deleteAttribute(await getIdToken(), toDelete.id);
      if (!result.success) toast({ title: 'Suppression impossible', description: result.error, variant: 'destructive' });
      else { toast({ title: 'Attribut supprimé', description: toDelete.name }); await onChanged(); }
    } finally {
      setBusy(false);
      setToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          Un attribut décrit ce que la cliente choisit: Pointure, Couleur, Taille, Matière… Vous le créez une fois, puis chaque produit choisit les siens (2 au maximum).
        </p>
        <Button className="min-h-11" onClick={() => setDraft({ id: null, name: '', kind: 'text', values: [] })}>
          <Plus className="mr-2 h-4 w-4" /> Nouvel attribut
        </Button>
      </div>

      <AttributeMigrationCard legacyCount={shoes.filter((s) => !s.options).length} onDone={onChanged} />

      {attributes.length === 0 ? (
        <div className="space-y-4">
          <EmptyState icon={<Shapes className="h-8 w-8" />} title="Aucun attribut" hint="Créez-en un, ou partez des attributs de base de la boutique." />
          <div className="flex justify-center">
            <Button variant="outline" className="min-h-11" disabled={busy} onClick={async () => { setBusy(true); try { await onCreateStarters(); } finally { setBusy(false); } }}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Créer Pointure et Couleur
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {attributes.map((a) => {
            const users = usedBy(shoes, a.id);
            return (
              <li key={a.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold">{a.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.values.length} valeur{a.values.length > 1 ? 's' : ''} · {users.length === 0 ? 'utilisé par aucun produit' : `utilisé par ${users.length} produit${users.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{a.kind === 'color' ? 'Couleur' : 'Texte'}</Badge>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`Valeurs de ${a.name}`}>
                  {a.values.slice(0, 14).map((v) => (
                    <li key={v.label} className="flex items-center gap-1.5 rounded-full border bg-secondary px-2.5 py-1 text-xs">
                      {a.kind === 'color' && <span aria-hidden="true" className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: v.hex ?? '#C5C7CB' }} />}
                      {v.label}
                    </li>
                  ))}
                  {a.values.length > 14 && <li className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">+ {a.values.length - 14}</li>}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDraft({ id: a.id, name: a.name, kind: a.kind, values: a.values.map((v) => ({ ...v })) })}>Modifier</Button>
                  <Button variant="destructive" size="sm" aria-label={`Supprimer l’attribut ${a.name}`} disabled={users.length > 0} onClick={() => setToDelete(a)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                  </Button>
                </div>
                {users.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Suppression impossible tant qu’un produit l’utilise.</p>}
              </li>
            );
          })}
        </ul>
      )}

      <AttributeDialog draft={draft} onChange={setDraft} onSave={save} busy={busy} />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {toDelete?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive. Aucun produit ne l’utilise.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AttributeDialog({ draft, onChange, onSave, busy }: { draft: Draft | null; onChange: (d: Draft | null) => void; onSave: () => void; busy: boolean }) {
  const [input, setInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [customHex, setCustomHex] = useState('#40E0D0');
  if (!draft) return null;

  const patch = (p: Partial<Draft>) => onChange({ ...draft, ...p });
  const addText = () => {
    const added = splitValues(input, draft.values.map((v) => v.label));
    if (added.length) patch({ values: [...draft.values, ...added.map((label) => ({ label }))] });
    setInput('');
  };
  const addPalette = (name: string) => {
    const color = PALETTE.find((c) => c.name === name);
    if (color && !draft.values.some((v) => v.label === color.name)) patch({ values: [...draft.values, { label: color.name, hex: color.hex }] });
  };
  const addCustom = () => {
    const label = customName.trim();
    if (!label || draft.values.some((v) => v.label.toLowerCase() === label.toLowerCase())) return;
    patch({ values: [...draft.values, { label, hex: customHex }] });
    setCustomName('');
  };
  const paletteLeft = PALETTE.filter((c) => !draft.values.some((v) => v.label.toLowerCase() === c.name.toLowerCase()));

  return (
    <Dialog open onOpenChange={(open) => !open && onChange(null)}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? 'Modifier l’attribut' : 'Nouvel attribut'}</DialogTitle>
          <DialogDescription>Nom et valeurs proposées aux clientes. Les valeurs peuvent être saisies à la suite, séparées par des virgules.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="attr-name">Nom</Label>
            <Input id="attr-name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Ex: Taille, Matière, Pointure" maxLength={40} />
          </div>

          {!draft.id && (
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium">Type</legend>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="attr-kind" className="h-5 w-5 accent-primary" checked={draft.kind === 'text'} onChange={() => patch({ kind: 'text', values: [] })} />
                Texte (pointures, tailles, matières…)
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="attr-kind" className="h-5 w-5 accent-primary" checked={draft.kind === 'color'} onChange={() => patch({ kind: 'color', values: [] })} />
                Couleur (avec une pastille)
              </label>
            </fieldset>
          )}

          <div className="space-y-2">
            <Label htmlFor="attr-values">Valeurs ({draft.values.length})</Label>
            {draft.kind === 'text' ? (
              <div className="flex gap-2">
                <Input id="attr-values" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addText(); } }} placeholder="Ex: S, M, L" />
                <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={addText}>Ajouter</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  id="attr-values"
                  aria-label="Ajouter une couleur de la palette"
                  value=""
                  onChange={(e) => addPalette(e.target.value)}
                  disabled={paletteLeft.length === 0}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                >
                  <option value="">{paletteLeft.length === 0 ? 'Toute la palette est ajoutée' : 'Ajouter une couleur de la palette…'}</option>
                  {paletteLeft.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor="attr-custom-name" className="text-xs">Autre couleur: nom</Label>
                    <Input id="attr-custom-name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Ex: Turquoise" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="attr-custom-hex" className="text-xs">Teinte</Label>
                    <input id="attr-custom-hex" type="color" value={customHex} onChange={(e) => setCustomHex(e.target.value)} className="h-11 w-14 cursor-pointer rounded-md border border-input bg-background p-1" />
                  </div>
                  <Button type="button" variant="outline" className="min-h-11" onClick={addCustom}>Ajouter</Button>
                </div>
              </div>
            )}
            {draft.values.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {draft.values.map((v) => (
                  <li key={v.label} className="flex min-h-11 items-center gap-2 rounded-full border bg-secondary pl-3 pr-1 text-sm">
                    {draft.kind === 'color' && <span aria-hidden="true" className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: v.hex ?? '#C5C7CB' }} />}
                    {v.label}
                    <button type="button" aria-label={`Retirer ${v.label}`} onClick={() => patch({ values: draft.values.filter((x) => x.label !== v.label) })} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onChange(null)}>Annuler</Button>
          <Button type="button" disabled={busy} onClick={onSave}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : draft.id ? 'Enregistrer' : 'Créer l’attribut'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
