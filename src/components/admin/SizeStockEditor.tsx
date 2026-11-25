'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { newSizeRow, type SizeRow } from '@/lib/size-rows';

type Props = {
  idPrefix: string;
  rows: SizeRow[];
  onRowsChange: (rows: SizeRow[]) => void;
  tracked: boolean;
  onTrackedChange: (tracked: boolean) => void;
};

/** Une ligne par pointure (pointure + stock), bouton « Ajouter une autre pointure ». */
export function SizeStockEditor({ idPrefix, rows, onRowsChange, tracked, onTrackedChange }: Props) {
  const update = (id: string, patch: Partial<SizeRow>) =>
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => {
    const next = rows.filter((r) => r.id !== id);
    onRowsChange(next.length > 0 ? next : [newSizeRow()]);
  };

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div>
        <Label className="font-semibold">Pointures{tracked ? ' et stock' : ''}</Label>
        <p className="text-sm text-muted-foreground">
          {tracked
            ? 'Indiquez chaque pointure et la quantité en stock (0 = épuisée).'
            : 'Indiquez les pointures proposées. Le stock n’est pas suivi: quantité illimitée.'}
        </p>
      </div>

      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.id} className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor={`${idPrefix}-size-${row.id}`} className="text-xs">Pointure</Label>
              <Input
                id={`${idPrefix}-size-${row.id}`}
                inputMode="decimal"
                placeholder="Ex: 40"
                value={row.size}
                onChange={(e) => update(row.id, { size: e.target.value })}
              />
            </div>
            {tracked && (
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor={`${idPrefix}-qty-${row.id}`} className="text-xs">Stock</Label>
                <Input
                  id={`${idPrefix}-qty-${row.id}`}
                  inputMode="numeric"
                  placeholder="Ex: 5"
                  value={row.qty}
                  onChange={(e) => update(row.id, { qty: e.target.value })}
                />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label={`Retirer la pointure ${row.size || index + 1}`}
              onClick={() => remove(row.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>

      <Button type="button" variant="outline" className="min-h-11" onClick={() => onRowsChange([...rows, newSizeRow()])}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter une autre pointure
      </Button>

      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={!tracked}
          onChange={(e) => onTrackedChange(!e.target.checked)}
        />
        Ne pas suivre le stock (quantité illimitée)
      </label>
    </div>
  );
}
