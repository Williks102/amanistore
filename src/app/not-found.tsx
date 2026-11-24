import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 text-center">
      <div className="space-y-4">
        <h1 className="font-headline text-3xl font-bold">Page introuvable</h1>
        <p className="text-muted-foreground">Ce produit n&apos;existe plus ou l&apos;adresse est incorrecte.</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg"><Link href="/shop">Voir la boutique</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/">Accueil</Link></Button>
        </div>
      </div>
    </main>
  );
}
