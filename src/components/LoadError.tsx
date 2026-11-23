'use client';

import { Button } from '@/components/ui/button';

/** État d'erreur des listes: message clair et bouton « Réessayer » (les trois états: chargement, vide, erreur). */
export function LoadError({ onRetry, message = 'Impossible de charger les produits.' }: { onRetry: () => void; message?: string }) {
  return (
    <div role="alert" className="mx-auto max-w-md space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p className="font-medium text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground">Vérifiez votre connexion internet puis réessayez.</p>
      <Button variant="outline" onClick={onRetry}>Réessayer</Button>
    </div>
  );
}
