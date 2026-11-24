'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/** Page d'erreur affichée quand une page échoue (panne passagère de la base, par exemple): en français, avec « Réessayer ». */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 text-center">
      <div role="alert" className="space-y-4">
        <h1 className="font-headline text-3xl font-bold">Un souci est survenu</h1>
        <p className="text-muted-foreground">La page n&apos;a pas pu se charger. C&apos;est souvent passager: réessayez dans un instant.</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>Réessayer</Button>
          <Button asChild size="lg" variant="outline"><Link href="/">Accueil</Link></Button>
        </div>
      </div>
    </main>
  );
}
