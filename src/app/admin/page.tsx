
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Box, ShoppingBag, Users, BarChart2, Tag, Truck, CheckCircle, XCircle, Clock, Archive, X, Trash2, ShieldCheck, ListOrdered, Shapes } from 'lucide-react';
import Image from 'next/image';

import type { Shoe, Category, Collection, Order, OrderStatus, PromoCode, ShoeColor } from '@/lib/types';
import { 
    getProducts, getCategories, getCollections, createProduct, updateProduct, deleteProduct, 
    uploadImage, getOrders, updateOrderStatus, getPromoCodes, createPromoCode, 
    updatePromoCode, deletePromoCode, createCategory, deleteCategory, createCollection, 
    deleteCollection, getOrderByCodeForValidation, validateOrderDelivery
} from '@/app/actions';
import { EditProductModal } from '@/components/EditProductModal';

type View = 'dashboard' | 'products' | 'create-product' | 'orders' | 'categories' | 'collections' | 'promotions' | 'delivery-validation';

const AdminPage = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  // Data states
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newShoeName, setNewShoeName] = useState('');
  const [newShoeDescription, setNewShoeDescription] = useState('');
  const [newShoePrice, setNewShoePrice] = useState(0);
  const [newShoeCategoryId, setNewShoeCategoryId] = useState('');
  const [newShoeCollectionIds, setNewShoeCollectionIds] = useState<string[]>([]);
  const [newShoeSizes, setNewShoeSizes] = useState('');
  const [newShoeColors, setNewShoeColors] = useState<ShoeColor[]>([]);
  const [newShoeImageFiles, setNewShoeImageFiles] = useState<File[]>([]);
  const [newShoeImagePreviews, setNewShoeImagePreviews] = useState<string[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionImageFile, setNewCollectionImageFile] = useState<File | null>(null);
  const [newCollectionCategoryIds, setNewCollectionCategoryIds] = useState<string[]>([]);

  // Edit Modal states
  const [selectedShoe, setSelectedShoe] = useState<Shoe | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Order states
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');

  // Delivery Validation states
  const [validationCode, setValidationCode] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidationLoading, setIsValidationLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [shoesData, categoriesData, collectionsData, ordersData, promoCodesData] = await Promise.all([
        getProducts(), getCategories(), getCollections(), getOrders(), getPromoCodes()
      ]);
      setShoes(shoesData as Shoe[]);
      setCategories(categoriesData as Category[]);
      setCollections(collectionsData as Collection[]);
      setOrders(ordersData as Order[]);
      setPromoCodes(promoCodesData as PromoCode[]);
    } catch (error) {
      toast({ title: 'Erreur de chargement', description: 'Impossible de récupérer les données.', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ---- ENTITY HANDLERS (Create, Delete) ----

  const handleDeleteProduct = async (shoeId: string) => {
    const result = await deleteProduct(shoeId);
    if (result.success) {
      toast({ title: 'Succès', description: 'Produit supprimé.' });
      fetchData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
  }

  const resetCreateProductForm = () => {
    setNewShoeName('');
    setNewShoeDescription('');
    setNewShoePrice(0);
    setNewShoeCategoryId('');
    setNewShoeCollectionIds([]);
    setNewShoeSizes('');
    setNewShoeColors([]);
    setNewColorName('');
    setNewColorHex('#000000');
    setNewShoeImageFiles([]);
    setNewShoeImagePreviews((prev) => {
      prev.forEach((preview) => URL.revokeObjectURL(preview));
      return [];
    });
  }

  const handleNewShoeImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setNewShoeImageFiles((prev) => [...prev, ...fileList]);
    setNewShoeImagePreviews((prev) => [...prev, ...fileList.map((file) => URL.createObjectURL(file))]);
    event.target.value = '';
  }

  const handleRemoveNewShoeImage = (indexToRemove: number) => {
    setNewShoeImageFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setNewShoeImagePreviews((prev) => {
      if (prev[indexToRemove]) {
        URL.revokeObjectURL(prev[indexToRemove]);
      }
      return prev.filter((_, index) => index !== indexToRemove);
    });
  }

  const handleAddNewShoeColor = () => {
    if (!newColorName.trim()) {
      toast({ title: 'Nom de couleur manquant', description: 'Veuillez entrer un nom de couleur.', variant: 'destructive' });
      return;
    }
    if (newShoeColors.some((color) => color.name.toLowerCase() === newColorName.trim().toLowerCase())) {
      toast({ title: 'Couleur déjà ajoutée', description: 'Cette couleur existe déjà.', variant: 'destructive' });
      return;
    }
    setNewShoeColors((prev) => [...prev, { name: newColorName.trim(), hex: newColorHex }]);
    setNewColorName('');
    setNewColorHex('#000000');
  }

  const handleRemoveNewShoeColor = (colorNameToRemove: string) => {
    setNewShoeColors((prev) => prev.filter((color) => color.name !== colorNameToRemove));
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newShoeName || !newShoeDescription || newShoePrice <= 0 || !newShoeCategoryId || newShoeImageFiles.length === 0) {
      toast({
        title: 'Champs manquants',
        description: 'Nom, description, prix, catégorie et au moins une image sont requis.',
        variant: 'destructive'
      });
      return;
    }

    const sizesArray = newShoeSizes
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((s) => !isNaN(s) && s > 0);

    if (sizesArray.length === 0) {
      toast({ title: 'Tailles invalides', description: 'Veuillez entrer au moins une taille valide.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const uploadedUrls: string[] = [];

    try {
      for (const imageFile of newShoeImageFiles) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadResult = await uploadImage(formData);

        if (uploadResult.error || !uploadResult.secure_url) {
          toast({ title: 'Erreur d\'upload', description: uploadResult.error, variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        uploadedUrls.push(uploadResult.secure_url);
      }

      const shoeImages = uploadedUrls.map((url, index) => ({
        id: `image-${Date.now()}-${index}`,
        url,
        hint: newShoeName.toLowerCase().slice(0, 20) || 'shoe',
      }));

      const result = await createProduct({
        name: newShoeName,
        description: newShoeDescription,
        price: Number(newShoePrice),
        categoryId: newShoeCategoryId,
        collectionIds: newShoeCollectionIds,
        availableSizes: sizesArray,
        availableColors: newShoeColors,
        gridImage: shoeImages[0],
        detailImages: shoeImages.slice(1),
      });

      if (result.success) {
        toast({ title: 'Succès', description: 'Produit créé avec succès.' });
        resetCreateProductForm();
        fetchData();
        setActiveView('products');
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategoryName || !newCategoryImageFile) {
          toast({ title: 'Champs manquants', description: "Le nom et l'image sont requis.", variant: 'destructive' });
          return;
      }
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('image', newCategoryImageFile);
      const uploadResult = await uploadImage(formData);
      if (uploadResult.error || !uploadResult.secure_url) {
          toast({ title: 'Erreur d\'upload', description: uploadResult.error, variant: 'destructive' });
          setIsSubmitting(false);
          return;
      }
      const result = await createCategory({ name: newCategoryName, imageId: 'cloud', imageUrl: uploadResult.secure_url });
      if (result.success) {
          toast({ title: 'Succès', description: 'Catégorie créée.'});
          setNewCategoryName('');
          setNewCategoryImageFile(null);
          fetchData();
      } else {
          toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
      setIsSubmitting(false);
  }

  const handleDeleteCategory = async (categoryId: string) => {
      const result = await deleteCategory(categoryId);
      if (result.success) {
          toast({ title: 'Succès', description: 'Catégorie supprimée.' });
          fetchData();
      } else {
          toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
  }

  const handleCreateCollection = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCollectionName || !newCollectionImageFile) {
          toast({ title: 'Champs manquants', description: "Le nom et l'image sont requis.", variant: 'destructive' });
          return;
      }
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('image', newCollectionImageFile);
      const uploadResult = await uploadImage(formData);
       if (uploadResult.error || !uploadResult.secure_url) {
          toast({ title: 'Erreur d\'upload', description: uploadResult.error, variant: 'destructive' });
          setIsSubmitting(false);
          return;
      }
      const result = await createCollection({ name: newCollectionName, imageUrl: uploadResult.secure_url, categoryIds: newCollectionCategoryIds });
       if (result.success) {
          toast({ title: 'Succès', description: 'Collection créée.'});
          setNewCollectionName('');
          setNewCollectionImageFile(null);
          setNewCollectionCategoryIds([]);
          fetchData();
      } else {
          toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
      setIsSubmitting(false);
  }

    const handleDeleteCollection = async (collectionId: string) => {
      const result = await deleteCollection(collectionId);
      if (result.success) {
          toast({ title: 'Succès', description: 'Collection supprimée.' });
          fetchData();
      } else {
          toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
  }

  const handleFindOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationCode.trim()) return;
    setIsValidationLoading(true);
    setFoundOrder(null);
    setValidationError(null);
    const { order, error } = await getOrderByCodeForValidation(validationCode);
    if (error) {
      setValidationError(error);
    } else if (order) {
      setFoundOrder(order);
    } else {
      setValidationError('Aucune commande ne correspond à ce code.');
    }
    setIsValidationLoading(false);
  }

  const handleValidateDelivery = async (orderId: string) => {
    setIsValidationLoading(true);
    const { success, error } = await validateOrderDelivery(orderId);
    if (success) {
      toast({ title: 'Succès', description: 'Livraison validée!' });
      setFoundOrder(null);
      setValidationCode('');
      fetchData(); // Refresh orders list
    } else {
      toast({ title: 'Erreur', description: error, variant: 'destructive' });
      setValidationError(error || 'Une erreur est survenue.');
    }
    setIsValidationLoading(false);
  }

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    switch (activeView) {
      case 'dashboard':
        return <div>Dashboard Content</div>; // Placeholder
      
      case 'products':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Produits</CardTitle>
              <CardDescription>Gérez vos produits.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Nom</TableHead><TableHead>Prix</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {shoes.map((shoe) => (
                      <TableRow key={shoe.id}>
                        <TableCell><Image src={shoe.gridImage.url} alt={shoe.name} width={40} height={40} className="rounded-md" /></TableCell>
                        <TableCell className="font-medium">{shoe.name}</TableCell>
                        <TableCell>{shoe.price.toLocaleString('fr-FR')} XOF</TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedShoe(shoe); setIsEditModalOpen(true); }}>Modifier</Button>
                           <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible et supprimera définitivement le produit.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(shoe.id)}>Supprimer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'create-product':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Créer un produit</CardTitle>
              <CardDescription>Ajoutez un nouveau produit avec plusieurs images.</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="create-product-form" onSubmit={handleCreateProduct} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-shoe-name">Nom</Label>
                    <Input id="new-shoe-name" value={newShoeName} onChange={(e) => setNewShoeName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-shoe-price">Prix (XOF)</Label>
                    <Input id="new-shoe-price" type="number" min={0} value={newShoePrice} onChange={(e) => setNewShoePrice(Number(e.target.value))} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-shoe-description">Description</Label>
                  <Textarea id="new-shoe-description" value={newShoeDescription} onChange={(e) => setNewShoeDescription(e.target.value)} required />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select value={newShoeCategoryId} onValueChange={setNewShoeCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-shoe-sizes">Tailles (séparées par des virgules)</Label>
                    <Input id="new-shoe-sizes" placeholder="41, 42, 43" value={newShoeSizes} onChange={(e) => setNewShoeSizes(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Collections (optionnel)</Label>
                  <div className="space-y-2 rounded-md border p-4 max-h-40 overflow-y-auto">
                    {collections.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucune collection disponible.</p>
                    )}
                    {collections.map((collection) => (
                      <div key={collection.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-shoe-coll-${collection.id}`}
                          checked={newShoeCollectionIds.includes(collection.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewShoeCollectionIds((prev) => [...prev, collection.id]);
                            } else {
                              setNewShoeCollectionIds((prev) => prev.filter((id) => id !== collection.id));
                            }
                          }}
                        />
                        <label htmlFor={`new-shoe-coll-${collection.id}`} className="text-sm">{collection.name}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border p-4">
                  <Label className="font-semibold">Couleurs disponibles</Label>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1 flex-1 min-w-44">
                      <Label htmlFor="new-color-name">Nom</Label>
                      <Input id="new-color-name" value={newColorName} onChange={(e) => setNewColorName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-color-hex">Code</Label>
                      <Input id="new-color-hex" type="color" className="w-16 p-1 h-10" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} />
                    </div>
                    <Button type="button" onClick={handleAddNewShoeColor}>Ajouter la couleur</Button>
                  </div>
                  {newShoeColors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newShoeColors.map((color) => (
                        <Badge key={color.name} variant="secondary" className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: color.hex }} />
                          {color.name}
                          <button type="button" onClick={() => handleRemoveNewShoeColor(color.name)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="new-shoe-images">Images du produit</Label>
                  <Input id="new-shoe-images" type="file" accept="image/*" multiple onChange={handleNewShoeImageChange} />
                  <p className="text-sm text-muted-foreground">
                    Vous pouvez sélectionner plusieurs images. La première image sera utilisée comme image principale.
                  </p>

                  {newShoeImagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {newShoeImagePreviews.map((preview, index) => (
                        <div key={`${preview}-${index}`} className="relative group rounded-md overflow-hidden border">
                          <img src={preview} alt={`Aperçu ${index + 1}`} className="h-28 w-full object-cover" />
                          {index === 0 && (
                            <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">Principale</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveNewShoeImage(index)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button type="submit" form="create-product-form" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : 'Créer le produit'}
              </Button>
            </CardFooter>
          </Card>
        );

      case 'orders':
         return <p>Orders View Placeholder</p>; // This will be the full orders view

      case 'categories':
        return (
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Créer une catégorie</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateCategory} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cat-name">Nom de la catégorie</Label>
                                <Input id="cat-name" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="cat-image">Image</Label>
                                <Input id="cat-image" type="file" accept="image/*" onChange={e => setNewCategoryImageFile(e.target.files ? e.target.files[0] : null)} required />
                            </div>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Créer'}</Button>
                        </form>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Catégories existantes</CardTitle></CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {categories.map(cat => (
                                    <TableRow key={cat.id}>
                                        <TableCell className="font-medium">{cat.name}</TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle><AlertDialogDescription>La suppression d'une catégorie est irréversible.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>Supprimer</AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );

      case 'collections':
        return (
             <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Créer une collection</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateCollection} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="col-name">Nom de la collection</Label>
                                <Input id="col-name" value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="col-image">Image</Label>
                                <Input id="col-image" type="file" accept="image/*" onChange={e => setNewCollectionImageFile(e.target.files ? e.target.files[0] : null)} required />
                            </div>
                             <div className="space-y-2">
                                <Label>Associer à des catégories (optionnel)</Label>
                                <div className="space-y-2 rounded-md border p-4 max-h-48 overflow-y-auto">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="flex items-center space-x-2">
                                            <Checkbox id={`coll-cat-${cat.id}`} 
                                                checked={newCollectionCategoryIds.includes(cat.id)} 
                                                onCheckedChange={checked => { 
                                                    return checked 
                                                        ? setNewCollectionCategoryIds([...newCollectionCategoryIds, cat.id]) 
                                                        : setNewCollectionCategoryIds(newCollectionCategoryIds.filter(id => id !== cat.id)) 
                                                }} />
                                            <Label htmlFor={`coll-cat-${cat.id}`} className="font-normal">{cat.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Créer'}</Button>
                        </form>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Collections existantes</CardTitle></CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {collections.map(col => (
                                    <TableRow key={col.id}>
                                        <TableCell className="font-medium">{col.name}</TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle><AlertDialogDescription>La suppression d'une collection est irréversible.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDeleteCollection(col.id)}>Supprimer</AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );

        case 'delivery-validation':
            return (
                <Card className="max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle>Valider une livraison</CardTitle>
                        <CardDescription>Entrez le code de validation unique de la commande pour la marquer comme livrée.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={handleFindOrder} className="flex items-center gap-2">
                            <Input 
                                value={validationCode} 
                                onChange={(e) => setValidationCode(e.target.value.toUpperCase())} 
                                placeholder="Code de validation" 
                                required
                            />
                            <Button type="submit" disabled={isValidationLoading}>{isValidationLoading && !foundOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Chercher'}</Button>
                        </form>
                        {validationError && <p className="text-sm font-medium text-destructive">{validationError}</p>}
                        {foundOrder && (
                            <Card className="bg-muted/50">
                                <CardHeader><CardTitle>Commande trouvée</CardTitle></CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <p><strong>Client:</strong> {foundOrder.customerName}</p>
                                    <p><strong>Téléphone:</strong> {foundOrder.customerPhone}</p>
                                    <p><strong>Adresse:</strong> {foundOrder.customerAddress}</p>
                                    <p><strong>Total:</strong> {foundOrder.total.toLocaleString('fr-FR')} XOF</p>
                                    <p><strong>Statut actuel:</strong> <Badge>{foundOrder.status}</Badge></p>
                                </CardContent>
                                <CardFooter>
                                    <Button 
                                        onClick={() => handleValidateDelivery(foundOrder.id)}
                                        disabled={isValidationLoading || foundOrder.status === 'Livré' || foundOrder.status === 'Annulé'}
                                        className="w-full"
                                    >
                                        {isValidationLoading && foundOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : (<span><ShieldCheck className="inline mr-2"/> Confirmer la livraison</span>)}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}
                    </CardContent>
                </Card>
            );

      default:
        return <div>Sélectionnez une vue</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="w-64 bg-background border-r p-4 flex-col hidden md:flex">
        <h1 className="text-2xl font-bold mb-8">Amani<span className="text-primary">.</span> Admin</h1>
        <nav className="flex flex-col space-y-1.5">
            <Button variant={activeView === 'dashboard' ? 'secondary' : 'ghost'} onClick={() => setActiveView('dashboard')} className="justify-start"><BarChart2 className="mr-2 h-4 w-4"/> Dashboard</Button>
            <Button variant={activeView === 'orders' ? 'secondary' : 'ghost'} onClick={() => setActiveView('orders')} className="justify-start"><ListOrdered className="mr-2 h-4 w-4"/> Commandes</Button>
            <Button variant={activeView === 'products' ? 'secondary' : 'ghost'} onClick={() => setActiveView('products')} className="justify-start"><Box className="mr-2 h-4 w-4"/> Produits</Button>
            <Button variant={activeView === 'create-product' ? 'secondary' : 'ghost'} onClick={() => setActiveView('create-product')} className="justify-start"><PlusCircle className="mr-2 h-4 w-4"/> Créer un produit</Button>
            <Button variant={activeView === 'categories' ? 'secondary' : 'ghost'} onClick={() => setActiveView('categories')} className="justify-start"><Archive className="mr-2 h-4 w-4"/> Catégories</Button>
            <Button variant={activeView === 'collections' ? 'secondary' : 'ghost'} onClick={() => setActiveView('collections')} className="justify-start"><Shapes className="mr-2 h-4 w-4"/> Collections</Button>
            <Button variant={activeView === 'promotions' ? 'secondary' : 'ghost'} onClick={() => setActiveView('promotions')} className="justify-start"><Tag className="mr-2 h-4 w-4"/> Promotions</Button>
            <Button variant={activeView === 'delivery-validation' ? 'secondary' : 'ghost'} onClick={() => setActiveView('delivery-validation')} className="justify-start"><ShieldCheck className="mr-2 h-4 w-4"/> Valider Livraison</Button>
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-6">
        {renderContent()}
      </main>
      {selectedShoe && (
        <EditProductModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          shoe={selectedShoe}
          categories={categories}
          collections={collections}
          onProductUpdate={fetchData}
        />
      )}
    </div>
  );
};

export default AdminPage;
