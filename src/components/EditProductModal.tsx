
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Shoe, ShoeColor, Category } from '@/lib/types';
import { Loader2, X } from 'lucide-react';
import { updateProduct, uploadImage } from '@/app/actions';
import Image from 'next/image';

interface EditProductModalProps {
  shoe: Shoe;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onProductUpdate: () => void;
}

export const EditProductModal = ({ shoe, isOpen, onOpenChange, categories, onProductUpdate }: EditProductModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(shoe.name);
  const [description, setDescription] = useState(shoe.description);
  const [price, setPrice] = useState(shoe.price);
  const [categoryId, setCategoryId] = useState(shoe.categoryId);
  const [availableSizes, setAvailableSizes] = useState(shoe.availableSizes.join(', '));
  const [availableColors, setAvailableColors] = useState<ShoeColor[]>(shoe.availableColors);
  const [gridImageUrl, setGridImageUrl] = useState(shoe.gridImage.url);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  const [currentColorName, setCurrentColorName] = useState('');
  const [currentColorHex, setCurrentColorHex] = useState('#000000');

  const { toast } = useToast();

  useEffect(() => {
    if (shoe) {
      setName(shoe.name);
      setDescription(shoe.description);
      setPrice(shoe.price);
      setCategoryId(shoe.categoryId);
      setAvailableSizes(shoe.availableSizes.join(', '));
      setAvailableColors(shoe.availableColors);
      setGridImageUrl(shoe.gridImage.url);
      setNewImageFile(null);
    }
  }, [shoe]);

  const handleAddColor = () => {
    if (!currentColorName.trim()) {
      toast({ title: 'Nom de couleur manquant', variant: 'destructive' });
      return;
    }
    setAvailableColors([...availableColors, { name: currentColorName.trim(), hex: currentColorHex }]);
    setCurrentColorName('');
    setCurrentColorHex('#000000');
  };

  const handleRemoveColor = (colorNameToRemove: string) => {
    setAvailableColors(availableColors.filter((c) => c.name !== colorNameToRemove));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    let finalImageUrl = gridImageUrl;

    // 1. Upload new image if provided
    if (newImageFile) {
      const formData = new FormData();
      formData.append('image', newImageFile);
      const uploadResult = await uploadImage(formData);
      if (uploadResult.error || !uploadResult.secure_url) {
        toast({ title: "Échec de l'upload de l'image", description: uploadResult.error, variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
      finalImageUrl = uploadResult.secure_url;
    }

    // 2. Prepare updated data
    const sizesArray = availableSizes.split(',').map((s) => Number(s.trim())).filter((s) => !isNaN(s) && s > 0);
    if (sizesArray.length === 0) {
      toast({ title: 'Tailles invalides', description: 'Veuillez entrer des tailles valides.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const updatedShoeData: Omit<Shoe, 'id'> = {
      name,
      description,
      price,
      categoryId,
      availableSizes: sizesArray,
      availableColors,
      gridImage: { ...shoe.gridImage, url: finalImageUrl },
      detailImages: [{ ...shoe.detailImages[0], url: finalImageUrl }], // Assuming first detail image is same as grid
    };

    // 3. Call server action to update product
    const result = await updateProduct(shoe.id, updatedShoeData);

    if (result.success) {
      toast({ title: 'Succès', description: 'Produit mis à jour avec succès.' });
      onProductUpdate();
      onOpenChange(false);
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }

    setIsSubmitting(false);
  };

  if (!shoe) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Modifier le produit</DialogTitle>
          <DialogDescription>Mettez à jour les informations du produit ci-dessous.</DialogDescription>
        </DialogHeader>
        <form id="edit-product-modal-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-6 pr-6 pl-1">
            <div className="space-y-2">
                <Label htmlFor="edit-product-name">Nom du produit</Label>
                <Input id="edit-product-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-product-description">Description</Label>
                <Textarea id="edit-product-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-product-price">Prix (XOF)</Label>
                    <Input id="edit-product-price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-product-category">Catégorie</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger id="edit-product-category"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-product-sizes">Tailles disponibles</Label>
                <Input id="edit-product-sizes" value={availableSizes} onChange={(e) => setAvailableSizes(e.target.value)} />
                 <p className="text-sm text-muted-foreground">Séparez les tailles par des virgules.</p>
            </div>

            <div className="space-y-4 rounded-md border p-4">
                <Label className="font-semibold">Couleurs disponibles</Label>
                 <div className="flex items-center gap-4">
                    <Input placeholder="Nom de la couleur" value={currentColorName} onChange={(e) => setCurrentColorName(e.target.value)} />
                    <Input type="color" value={currentColorHex} onChange={(e) => setCurrentColorHex(e.target.value)} className="p-1 h-10 w-16" />
                    <Button type="button" onClick={handleAddColor} className="self-end">Ajouter</Button>
                </div>
                {availableColors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {availableColors.map((color) => (
                            <Badge key={color.name} variant="secondary" className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.hex }} />
                                <span>{color.name}</span>
                                <button type="button" onClick={() => handleRemoveColor(color.name)} className="rounded-full hover:bg-muted-foreground/20"><X className="h-3 w-3" /></button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label>Image actuelle</Label>
                <Image src={gridImageUrl} alt="Aperçu" width={100} height={100} className="rounded-md object-cover border" />
                <Label htmlFor="edit-product-image">Changer l'image</Label>
                <Input id="edit-product-image" type="file" accept="image/*" onChange={(e) => setNewImageFile(e.target.files ? e.target.files[0] : null)} />
            </div>
        </form>
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" form="edit-product-modal-form" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sauvegarde...</> : 'Sauvegarder les modifications'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

    