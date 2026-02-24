
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
import type { PriceRange } from '@/app/page';
import type { ShoeColor } from '@/lib/types';

interface SidebarProps {
  priceRange: PriceRange;
  onPriceRangeChange: (value: PriceRange) => void;
  availableSizes: number[];
  selectedSizes: number[];
  onSelectedSizesChange: (sizes: number[]) => void;
  availableColors: ShoeColor[];
  selectedColors: string[];
  onSelectedColorsChange: (colors: string[]) => void;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  resultCount?: number;
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
    onPriceRangeChange({ min: 0, max: 100000 });
    onSelectedSizesChange([]);
    onSelectedColorsChange([]);
    onSearchTermChange?.('');
  };

  const activeFilters = [
    ...(safeSearchTerm ? ['Recherche: ' + safeSearchTerm] : []),
    ...(priceRange.max < 100000 ? ['Prix max: ' + priceRange.max.toLocaleString('fr-FR') + ' XOF'] : []),
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
          max={100000}
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
              className="h-10"
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Couleur</h3>
        <div className="flex flex-wrap gap-3">
          {availableColors.map((color) => (
            <button
              key={color.name}
              onClick={() => handleColorClick(color.name)}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110 focus:outline-none',
                selectedColors.includes(color.name)
                  ? 'ring-2 ring-offset-2 ring-primary'
                  : 'border-border'
              )}
              style={{ backgroundColor: color.hex }}
              aria-label={`Select color ${color.name}`}
            />
          ))}
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
