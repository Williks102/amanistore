'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { applyAttributeMigration, previewAttributeMigration } from '@/app/actions';
import { getIdToken } from '@/lib/get-id-token';
import type { MigrationPlan } from '@/lib/migration';

type Props = {
  /** Nombre de produits encore à l'ancien format. */
  legacyCount: number;
  onDone: () => void | Promise<void>;
};

/** Conversion des produits actuels (pointures + couleurs) vers les attributs, avec aperçu avant d'appliquer. */
export function AttributeMigrationCard({ legacyCount, onDone }: Props) {
  const { toast } = useToast();
  const [plan, setPlan] = useState<MigrationPlan | null>(null);
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [leftover, setLeftover] = useState<Array<{ name: string; reason: string }>>([]);

  if (legacyCount === 0 && !plan && leftover.length === 0) return null;

  const preview = async () => {
    setBusy('preview');
    setLeftover([]);
    try {
      const r = await previewAttributeMigration(await getIdToken());
      if (!r.plan) toast({ title: 'Aperçu impossible', description: r.error ?? 'Réessayez.', variant: 'destructive' });
      else setPlan(r.plan);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error?.message ?? 'Aperçu impossible.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const apply = async () => {
    setConfirm(false);
    setBusy('apply');
    try {
      const r = await applyAttributeMigration(await getIdToken());
      setLeftover(r.skipped);
      if (!r.success) {
        toast({ title: 'Conversion impossible', description: r.error, variant: 'destructive' });
      } else {
        toast({ title: 'Conversion terminée', description: `${r.updated} produit${r.updated > 1 ? 's' : ''} converti${r.updated > 1 ? 's' : ''}${r.skipped.length ? `, ${r.skipped.length} à corriger` : ''}.` });
        setPlan(null);
        await onDone();
      }
    } catch (error: any) {
      toast({ title: 'Erreur', description: error?.message ?? 'Conversion impossible.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="migration-title" className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div>
        <h3 id="migration-title" className="font-semibold">Convertir mes produits actuels</h3>
        <p className="text-sm text-muted-foreground">
          {legacyCount > 0
            ? `${legacyCount} produit${legacyCount > 1 ? 's utilisent' : ' utilise'} encore l’ancien format (pointures et couleurs).`
            : 'Tous les produits sont convertis.'}{' '}
          La conversion les relie aux attributs Pointure et Couleur. Le stock, les prix et l’apparence ne changent pas, et les anciennes données sont conservées.
        </p>
      </div>

      {plan && <MigrationPlanView plan={plan} />}

      {!plan && leftover.length > 0 && (
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">À corriger puis relancer la conversion</p>
          <ul className="mt-1 space-y-1">{leftover.map((i) => <li key={i.name}><strong>{i.name}</strong>: {i.reason}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={plan ? 'outline' : 'default'} className="min-h-11" disabled={busy !== null} onClick={preview}>
          {busy === 'preview' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {plan ? 'Revérifier' : 'Vérifier mes produits'}
        </Button>
        {plan && plan.convertible > 0 && plan.blockers.length === 0 && (
          <Button type="button" className="min-h-11" disabled={busy !== null} onClick={() => setConfirm(true)}>
            {busy === 'apply' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Convertir {plan.convertible} produit{plan.convertible > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertir {plan?.convertible ?? 0} produit(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les attributs Pointure et Couleur sont créés ou complétés, puis chaque produit y est relié. Le stock par pointure est conservé. Les anciennes données restent enregistrées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={apply}>Convertir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** Résultat de l'aperçu: produits prêts, attributs à créer, produits à corriger, blocages. */
export function MigrationPlanView({ plan }: { plan: MigrationPlan }) {
  const toFix = plan.items.filter((i) => i.status === 'skip');
  const notes = plan.items.filter((i) => i.status === 'convert' && i.notes.length > 0);
  return (

    <div className="space-y-3 text-sm">
      {plan.blockers.length > 0 && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive">
          <p className="font-medium">Conversion bloquée</p>
          <ul className="list-disc pl-5">{plan.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      )}
      <p><strong>{plan.convertible}</strong> produit{plan.convertible > 1 ? 's' : ''} prêt{plan.convertible > 1 ? 's' : ''} à convertir{plan.alreadyDone > 0 ? `, ${plan.alreadyDone} déjà converti${plan.alreadyDone > 1 ? 's' : ''}` : ''}.</p>
      {plan.attributeChanges.filter((a) => a.action === 'create' || a.action === 'extend').length > 0 && (
        <ul className="list-disc pl-5 text-muted-foreground">
          {plan.attributeChanges.filter((a) => a.action === 'create' || a.action === 'extend').map((a) => (
            <li key={a.name}>
              {a.action === 'create' ? `Créer l’attribut « ${a.name} »` : `Compléter l’attribut « ${a.name} »`}: {a.addValues.slice(0, 8).map((v) => v.label).join(', ')}{a.addValues.length > 8 ? `… (${a.addValues.length} valeurs)` : ''}
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <ul className="list-disc pl-5 text-muted-foreground">
          {notes.map((i) => <li key={i.id}>{i.name}: {i.notes.join(' ')}</li>)}
        </ul>
      )}
      {toFix.length > 0 && (
        <div className="rounded-md border p-3">
          <p className="font-medium">{toFix.length} produit{toFix.length > 1 ? 's' : ''} à corriger d’abord (ignoré{toFix.length > 1 ? 's' : ''} pour l’instant)</p>
          <ul className="mt-1 space-y-1">{toFix.map((i) => <li key={i.id}><strong>{i.name}</strong>: {i.reason}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
