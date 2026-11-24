
'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import type { ShoeColor } from '@/lib/types';
import { DEFAULT_MAX_PRICE, type UnifiedPriceRange } from '@/hooks/use-product-filters';

interface SidebarProps {
  priceRange: UnifiedPriceRange;
  onPriceRangeChange: (value: UnifiedPriceRange) => void;
  availableSizes: number[];
  selectedSizes: number[];
  onSelectedSizesChange: (sizes: number[]) => void;
  availableColors: ShoeColor[];
  selectedColors: string[];
  onSelectedColorsChange: (colors: string[]) => void;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  resultCount?: number;
  /** Plafond du curseur de prix (prix max du catalogue). */
  maxPrice?: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const FilterContent: React.FC<Omit<SidebarProps, 'isOpen' | 'onOpenChange'>> = ({
  priceRange,
  onPriceRangeChange,
  availableSizes,
  selectedSizes,
  onSelectedSizesChange,
  availableColors,
  selectedColors,
  onSelectedColorsChange,
  searchTerm,
  onSearchTermChange,
  resultCount,
  maxPrice = DEFAULT_MAX_PRICE,
}) => {
  const safeSearchTerm = searchTerm ?? "";

  const handleSizeClick = (size: number) => {
    const newSizes = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    onSelectedSizesChange(newSizes);
  };

  const handleColorClick = (colorName: string) => {
    const newColors = selectedColors.includes(colorName)
      ? selectedColors.filter((c) => c !== colorName)
      : [...selectedColors, colorName];
    onSelectedColorsChange(newColors);
  };

  const clearFilters = () => {
    onPriceRangeChange({ min: 0, max: maxPrice });
    onSelectedSizesChange([]);
    onSelectedColorsChange([]);
    onSearchTermChange?.('');
  };

  const activeFilters = [
    ...(safeSearchTerm ? ['Recherche: ' + safeSearchTerm] : []),
    ...(priceRange.max < maxPrice ? ['Prix max: ' + priceRange.max.toLocaleString('fr-FR') + ' XOF'] : []),
    ...selectedSizes.map((size) => 'Pointure: ' + size),
    ...selectedColors.map((color) => 'Couleur: ' + color),
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Recherche</h3>
        <Input
          value={safeSearchTerm}
          onChange={(event) => onSearchTermChange?.(event.target.value)}
          placeholder="Rechercher un modèle"
        />
      </div>

      <div className="rounded-md border p-3 text-sm">
        <p className="font-medium">{resultCount ?? 0} résultat(s)</p>
        {activeFilters.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <span key={filter} className="rounded-full bg-muted px-2 py-1 text-xs">
                {filter}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-muted-foreground">Aucun filtre actif.</p>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Prix</h3>
        <Slider
          min={0}
          max={maxPrice}
          step={5000}
          value={[priceRange.max]}
          onValueChange={(value) => onPriceRangeChange({ min: 0, max: value[0] })}
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>XOF 0</span>
          <span>{`XOF ${priceRange.max.toLocaleString('fr-FR')}`}</span>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Taille</h3>
        <div className="grid grid-cols-4 gap-2">
          {availableSizes.map((size) => (
            <Button
              key={size}
              variant={selectedSizes.includes(size) ? 'default' : 'outline'}
              onClick={() => handleSizeClick(size)}
              className="h-11"
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Couleur</h3>
        <div className="flex flex-wrap gap-2">
          {availableColors.map((color) => {
            const selected = selectedColors.includes(color.name);
            return (
              <button
                key={color.name}
                type="button"
                aria-pressed={selected}
                onClick={() => handleColorClick(color.name)}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'border-primary bg-primary/10 font-medium' : 'border-input bg-background hover:bg-accent'
                )}
              >
                <span aria-hidden="true" className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: color.hex }} />
                {color.name}
              </button>
            );
          })}
        </div>
      </div>
      <Button variant="ghost" onClick={clearFilters} className="w-full">
        Réinitialiser les filtres
      </Button>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onOpenChange,
  ...filterProps
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Filtres</SheetTitle>
        </SheetHeader>
        <div className="py-8">
          <FilterContent {...filterProps} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
