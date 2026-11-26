'use client';
import { useEffect, useState, useTransition } from 'react';
import { fetchShoeRecommendations } from '@/app/actions';
import { Wand2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function StyleGuideAssistant({ shoeDescription }: { shoeDescription: string }) {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setError(null);
      try {
        const result = await fetchShoeRecommendations({ shoeDescription });
        if (result.error) {
          setError(result.error);
          setRecommendations([]);
        } else {
          setRecommendations(result.recommendations || []);
        }
      } catch {
        // Réponse perdue (coupure, délai dépassé): sans ce filet, l'erreur d'une transition fait planter toute la page.
        setError('Le conseil de style n’a pas pu répondre. Réessayez dans quelques minutes.');
        setRecommendations([]);
      }
    });
  }, [shoeDescription]);

  return (
    <div aria-live="polite">
      {isPending && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}
      {!isPending && error && (
        <Alert variant="destructive" className="text-xs">
          <AlertTitle>Conseil de style indisponible</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!isPending && !error && recommendations.length > 0 && (
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {recommendations.slice(0, 3).map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * L'assistant n'interroge l'IA que lorsque la cliente le demande (avant, chaque ouverture d'une fiche
 * lançait un appel payant, même pour un robot qui parcourt le site).
 */
export function StyleGuideLauncher({ shoeDescription }: { shoeDescription: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <Wand2 className="h-4 w-4" aria-hidden="true" />
        {open ? 'Masquer les idées d’accords' : 'Des idées pour l’assortir ?'}
      </button>
      {open && <StyleGuideAssistant shoeDescription={shoeDescription} />}
    </div>
  );
}
