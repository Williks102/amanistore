import Image from 'next/image';
import Link from 'next/link';

export type Tile = { id: string; name: string; href: string; imageUrl?: string; count?: number };

/**
 * Grille de vignettes-liens (catégories, collections). De vrais liens: utilisables au clavier,
 * ouvrables dans un nouvel onglet, 2 colonnes sur téléphone (pas de carrousel à flèches cachées).
 * Le fond sombre sous l'image garantit un texte blanc lisible même si l'image ne se charge pas.
 */
export function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {tiles.map((tile) => (
        <li key={tile.id}>
          <Link
            href={tile.href}
            className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {tile.imageUrl ? (
              <Image
                src={tile.imageUrl}
                alt=""
                fill
                sizes="(min-width: 768px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : null}
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
            <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <span className="block font-headline text-lg font-bold leading-tight text-white sm:text-2xl">{tile.name}</span>
              {tile.count ? (
                <span className="block text-sm text-white/90">{tile.count} modèle{tile.count > 1 ? 's' : ''}</span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
