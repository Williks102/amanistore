'use client';

import Image from 'next/image';
import { Box, Star, Trash2 } from 'lucide-react';
import type { Shoe } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/EmptyState';

type Props = {
  shoes: Shoe[];
  onEdit: (shoe: Shoe) => void;
  onDelete: (shoeId: string) => void;
  onToggleFeatured: (shoe: Shoe) => void;
  /** Produit dont le « coup de cœur » est en cours d'enregistrement. */
  busyId?: string | null;
};

/**
 * Liste des produits de l'admin: une carte par produit (lisible sur téléphone), avec le bouton
 * « Coup de cœur » directement visible: un geste pour mettre un produit en avant sur l'accueil.
 */
export function AdminProductList({ shoes, onEdit, onDelete, onToggleFeatured, busyId = null }: Props) {
  const featuredCount = shoes.filter((s) => s.featured).length;

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm" role="status">
        <Star aria-hidden="true" className="mr-1 inline h-4 w-4 align-text-bottom text-primary" />
        {featuredCount === 0 ? (
          <>
            <strong>Aucun coup de cœur.</strong> Touchez « Mettre en avant » sur un produit: il apparaîtra en haut de l&apos;accueil et dans « Sélection Amani&apos;s ». Sans coup de cœur, l&apos;accueil montre les 3 dernières nouveautés et n&apos;affiche pas cette sélection.
          </>
        ) : (
          <>
            <strong>{featuredCount} coup{featuredCount > 1 ? 's' : ''} de cœur.</strong> Les 3 plus récents s&apos;affichent en haut de l&apos;accueil, et jusqu&apos;à 6 dans « Sélection Amani&apos;s » (les plus récents d&apos;abord).
          </>
        )}
      </p>

      <ul className="divide-y divide-border rounded-lg border">
        {shoes.map((shoe) => (
          <li key={shoe.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Image src={shoe.gridImage.url} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-md bg-secondary object-cover" />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {shoe.name}
                  {shoe.featured && <Badge variant="secondary" className="ml-2 align-middle">Coup de cœur</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">{shoe.price.toLocaleString('fr-FR')} XOF</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={shoe.featured ? 'secondary' : 'outline'}
                size="sm"
                aria-pressed={!!shoe.featured}
                disabled={busyId === shoe.id}
                onClick={() => onToggleFeatured(shoe)}
              >
                <Star className={`h-4 w-4 ${shoe.featured ? 'fill-primary text-primary' : ''}`} aria-hidden="true" />
                {shoe.featured ? 'Retirer de la sélection' : 'Mettre en avant'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(shoe)}>Modifier</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" aria-label={`Supprimer ${shoe.name}`}><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                    <AlertDialogDescription>Cette action est irréversible et supprimera définitivement le produit.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(shoe.id)}>Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>
      {shoes.length === 0 && <EmptyState icon={<Box className="h-8 w-8" />} title="Aucun produit" hint="Créez votre premier produit depuis « Créer un produit »." />}
    </div>
  );
}
