import type { Shoe } from '@/lib/types';
import ProductCard from './ProductCard';

interface ShoeShowcaseProps {
  shoes: Shoe[];
  /** `two-up`: 2 colonnes dès le téléphone. Par défaut: 1 colonne sur téléphone. */
  columns?: 'default' | 'two-up';
}

const ShoeShowcase = ({ shoes, columns = 'default' }: ShoeShowcaseProps) => {
  return (
    <>
      <div className={columns === 'two-up' ? 'grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 lg:gap-8' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'}>
        {shoes.map((shoe) => (
          <ProductCard key={shoe.id} shoe={shoe} />
        ))}
      </div>
      {shoes.length === 0 && (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold mb-2">Aucun produit trouvé</h2>
          <p className="text-muted-foreground">Essayez d&apos;ajuster vos filtres de recherche.</p>
        </div>
      )}
    </>
  );
};

export default ShoeShowcase;
