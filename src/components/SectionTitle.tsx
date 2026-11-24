import Link from 'next/link';

/** Titre de section de l'accueil, avec un lien « Tout voir » facultatif (zone tactile de 44 px). */
export function SectionTitle({ id, children, href, linkLabel = 'Tout voir' }: { id?: string; children: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 id={id} className="font-headline text-2xl font-bold md:text-3xl">{children}</h2>
      {href ? (
        <Link href={href} className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
