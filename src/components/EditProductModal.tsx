
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Shoe, ShoeColor, Category, Collection, ShoeImage } from '@/lib/types';
import { Loader2, X } from 'lucide-react';
import { updateProduct, uploadImage } from '@/app/actions';
import Image from 'next/image';

interface EditProductModalProps {
  shoe: Shoe;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  collections: Collection[];
  onProductUpdate: () => void;
}

export const EditProductModal = ({ shoe, isOpen, onOpenChange, categories, collections, onProductUpdate }: EditProductModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(shoe.name);
  const [description, setDescription] = useState(shoe.description);
  const [price, setPrice] = useState(shoe.price);
  const [categoryId, setCategoryId] = useState(shoe.categoryId);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(shoe.collectionIds || []);
  const [availableSizes, setAvailableSizes] = useState(shoe.availableSizes.join(', '));
  const [availableColors, setAvailableColors] = useState<ShoeColor[]>(shoe.availableColors);
  
  const [existingImages, setExistingImages] = useState<ShoeImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const [currentColorName, setCurrentColorName] = useState('');
  const [currentColorHex, setCurrentColorHex] = useState('#000000');

  const { toast } = useToast();

  useEffect(() => {
    if (shoe) {
      setName(shoe.name);
      setDescription(shoe.description);
      setPrice(shoe.price);
      setCategoryId(shoe.categoryId);
      setSelectedCollectionIds(shoe.collectionIds || []); // Ensure it's an array
      setAvailableSizes(shoe.availableSizes.join(', '));
      setAvailableColors(shoe.availableColors);
      const allImages = [shoe.gridImage, ...(shoe.detailImages || [])];
      const uniqueImages = allImages.filter((img, index, self) => 
          img && index === self.findIndex((t) => t.url === img.url)
      );
      setExistingImages(uniqueImages);
      
      setNewImageFiles([]);
      setNewImagePreviews([]);
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

  const handleNewImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setNewImageFiles(prev => [...prev, ...fileArray]);
      const previews = fileArray.map(file => URL.createObjectURL(file));
      setNewImagePreviews(prev => [...prev, ...previews]);
    }
  };
  
  const handleRemoveExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => {
      if(prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

 const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const sizesArray = availableSizes.split(',').map((s) => Number(s.trim())).filter((s) => !isNaN(s) && s > 0);
    if (sizesArray.length === 0) {
        toast({ title: 'Tailles invalides', description: 'Veuillez entrer des tailles valides.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    if (existingImages.length === 0 && newImageFiles.length === 0) {
        toast({ title: 'Images manquantes', description: 'Le produit doit avoir au moins une image.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    const uploadedImageUrls: string[] = [];
    for (const imageFile of newImageFiles) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadResult = await uploadImage(formData);
        
        if (uploadResult.error || !uploadResult.secure_url) {
            toast({ title: "Échec de l'upload de l'image", description: uploadResult.error, variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
        uploadedImageUrls.push(uploadResult.secure_url);
    }

    const existingImageObjects = existingImages;
    const newImageObjects = uploadedImageUrls.map((url, index) => ({
        id: `image-new-${Date.now()}-${index}`,
        url: url,
        hint: "shoe"
    }));
    const allImages = [...existingImageObjects, ...newImageObjects];

    const updatedShoeData: Partial<Shoe> = {
        name,
        description,
        price,
        categoryId,
        collectionIds: selectedCollectionIds,
        availableSizes: sizesArray,
        availableColors,
        gridImage: allImages[0],
        detailImages: allImages.slice(1),
    };

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
                <Label>Collections (optionnel)</Label>
                <p className="text-xs text-muted-foreground mb-2">Associez ce produit à une ou plusieurs collections</p>
                <div className="space-y-2 rounded-md border p-4 max-h-48 overflow-y-auto">
                {collections.map((collection) => (
                    <div key={collection.id} className="flex items-center space-x-2">
                    <Checkbox
                        id={`edit-coll-${collection.id}`}
                        checked={selectedCollectionIds.includes(collection.id)}
                        onCheckedChange={(checked) => {
                        return checked
                            ? setSelectedCollectionIds([...selectedCollectionIds, collection.id])
                            : setSelectedCollectionIds(selectedCollectionIds.filter(id => id !== collection.id));
                        }}
                    />
                    <label
                        htmlFor={`edit-coll-${collection.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                        {collection.name}
                    </label>
                    </div>
                ))}
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

            <div className="space-y-3">
              <Label>Images du produit</Label>
              
              {existingImages.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Images actuelles</p>
                  <div className="grid grid-cols-4 gap-2">
                    {existingImages.map((image, index) => (
                      <div key={image.id} className="relative group">
                        <img 
                          src={image.url} 
                          alt={`Existing ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                            Principal
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="edit-new-images" className="text-sm">Ajouter de nouvelles images</Label>
                <Input 
                  id="edit-new-images" 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={handleNewImageChange}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ajoutez de nouvelles images (ajoutées après les existantes)
                </p>
              </div>

              {newImagePreviews.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Nouvelles images</p>
                  <div className="grid grid-cols-4 gap-2">
                    {newImagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={preview} 
                          alt={`New ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md border border-dashed border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewImage(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                        <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                          Nouveau
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
