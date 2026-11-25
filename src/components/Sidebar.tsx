
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
import type { FilterGroup, SelectedOptions } from '@/lib/attribute-filters';
import { DEFAULT_MAX_PRICE, type UnifiedPriceRange } from '@/hooks/use-product-filters';

interface SidebarProps {
  priceRange: UnifiedPriceRange;
  onPriceRangeChange: (value: UnifiedPriceRange) => void;
  /** Un groupe par attribut du catalogue (Pointure, Couleur, Matière…). */
  filterGroups: FilterGroup[];
  selectedOptions: SelectedOptions;
  onSelectedOptionsChange: (selected: SelectedOptions) => void;
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
  filterGroups,
  selectedOptions,
  onSelectedOptionsChange,
  searchTerm,
  onSearchTermChange,
  resultCount,
  maxPrice = DEFAULT_MAX_PRICE,
}) => {
  const safeSearchTerm = searchTerm ?? "";

  const toggle = (key: string, value: string) => {
    const current = selectedOptions[key] ?? [];
    onSelectedOptionsChange({ ...selectedOptions, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  };

  const clearFilters = () => {
    onPriceRangeChange({ min: 0, max: maxPrice });
    onSelectedOptionsChange({});
    onSearchTermChange?.('');
  };

  const activeFilters = [
    ...(safeSearchTerm ? ['Recherche: ' + safeSearchTerm] : []),
    ...(priceRange.max < maxPrice ? ['Prix max: ' + priceRange.max.toLocaleString('fr-FR') + ' XOF'] : []),
    ...filterGroups.flatMap((g) => (selectedOptions[g.key] ?? []).map((v) => `${g.name}: ${v}`)),
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
      {filterGroups.map((group) => (
        <fieldset key={group.key}>
          <legend className="mb-4 text-lg font-semibold">{group.name}</legend>
          <div className="flex flex-wrap gap-2">
            {group.values.map((item) => {
              const selected = (selectedOptions[group.key] ?? []).includes(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(group.key, item.value)}
                  className={cn(
                    'flex min-h-11 items-center gap-2 border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    item.hex
                      ? cn('rounded-full px-3', selected ? 'border-primary bg-primary/10 font-medium' : 'border-input bg-background hover:bg-accent')
                      : cn('min-w-11 justify-center rounded-md px-3 font-medium', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:bg-accent')
                  )}
                >
                  {item.hex && <span aria-hidden="true" className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: item.hex }} />}
                  {item.value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
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
