import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Shoe } from '@/lib/types';
import { canonicalColorName } from '@/lib/colors';
import { shoeColors, stockSummaryFor } from '@/lib/attributes';

/**
 * Carte produit: un vrai lien vers la page du produit (partageable, ouvrable dans un nouvel onglet).
 * Plus d'ajout rapide: la pointure et la couleur se choisissent toujours sur la page du produit.
 */
const ProductCard = ({ shoe }: { shoe: Shoe }) => {
  const stock = stockSummaryFor(shoe);
  const colors = Array.from(new Map(shoeColors(shoe).map((c) => [canonicalColorName(c.name), c.hex])).entries());

  return (
    <Link
      href={`/produit/${shoe.id}`}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        <CardHeader className="p-0">
          <div className="relative aspect-square w-full overflow-hidden bg-secondary">
            {stock.soldOut && (
              <Badge variant="secondary" className="absolute left-3 top-3 z-10 border border-border bg-background text-foreground">Épuisé</Badge>
            )}
            {!stock.soldOut && stock.tracked && stock.total <= 3 && (
              <Badge variant="secondary" className="absolute left-3 top-3 z-10 border border-border bg-background text-foreground">Plus que {stock.total}</Badge>
            )}
            <Image
              src={shoe.gridImage.url}
              alt={shoe.name}
              width={600}
              height={600}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 50vw"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={shoe.gridImage.hint}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <h3 className="truncate font-headline text-lg font-semibold sm:text-xl">{shoe.name}</h3>
          {colors.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden="true" className="flex -space-x-1">
                {colors.slice(0, 5).map(([name, hex]) => (
                  <span key={name} className="h-3.5 w-3.5 rounded-full border border-border" style={{ backgroundColor: hex }} />
                ))}
              </span>
              {colors.length === 1 ? colors[0][0] : `${colors.length} couleurs`}
            </p>
          )}
          <p className="mt-auto pt-1 text-base font-semibold text-primary sm:text-lg">{`XOF ${shoe.price.toLocaleString('fr-FR')}`}</p>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
