
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
import { Loader2, PlusCircle, Box, ShoppingBag, Users, BarChart2, Tag, Truck, CheckCircle, XCircle, Clock, Archive, X, Trash2, ShieldCheck, ListOrdered, Shapes, Pencil } from 'lucide-react';
import Image from 'next/image';

import type { Shoe, Category, Collection, Order, OrderStatus, PromoCode, ShoeColor } from '@/lib/types';
import { 
    getProducts, getCategories, getCollections, createProduct, updateProduct, deleteProduct, 
    uploadImage, getOrders, updateOrderStatus, getPromoCodes, createPromoCode, 
    updatePromoCode, deletePromoCode, createCategory, updateCategory, deleteCategory, createCollection, 
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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryImageFile, setEditingCategoryImageFile] = useState<File | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionImageFile, setNewCollectionImageFile] = useState<File | null>(null);
  const [newCollectionCategoryIds, setNewCollectionCategoryIds] = useState<string[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscountType, setNewPromoDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newPromoValue, setNewPromoValue] = useState(0);

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

  const startEditCategory = (category: Category) => {
      setEditingCategoryId(category.id);
      setEditingCategoryName(category.name);
      setEditingCategoryImageFile(null);
  }

  const cancelEditCategory = () => {
      setEditingCategoryId(null);
      setEditingCategoryName('');
      setEditingCategoryImageFile(null);
  }

  const handleUpdateCategory = async (category: Category) => {
      const normalizedName = editingCategoryName.trim();
      if (!normalizedName) {
          toast({ title: 'Champs manquants', description: 'Le nom de la catégorie est requis.', variant: 'destructive' });
          return;
      }

      setIsSubmitting(true);
      const payload: Partial<Omit<Category, 'id'>> = { name: normalizedName };

      if (editingCategoryImageFile) {
        const formData = new FormData();
        formData.append('image', editingCategoryImageFile);
        const uploadResult = await uploadImage(formData);
        if (uploadResult.error || !uploadResult.secure_url) {
          toast({ title: "Erreur d'upload", description: uploadResult.error, variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        payload.imageUrl = uploadResult.secure_url;
        payload.imageId = category.imageId || 'cloud';
      }

      const result = await updateCategory(category.id, payload);
      if (result.success) {
          toast({ title: 'Succès', description: 'Catégorie modifiée.' });
          cancelEditCategory();
          fetchData();
      } else {
          toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
      setIsSubmitting(false);
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewShoeImageFiles(files);
    setNewShoeImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShoeName || !newShoeDescription || !newShoeCategoryId || newShoePrice <= 0 || newShoeImageFiles.length === 0) {
      toast({ title: 'Champs manquants', description: 'Veuillez remplir tous les champs du produit.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const imageFile of newShoeImageFiles) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const uploadResult = await uploadImage(fd);
        if (uploadResult.error || !uploadResult.secure_url) {
          toast({ title: 'Erreur d\'upload', description: uploadResult.error, variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        uploadedUrls.push(uploadResult.secure_url);
      }

      const parsedSizes = newShoeSizes
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n) && n > 0);

      if (parsedSizes.length === 0) {
        toast({ title: 'Pointures invalides', description: 'Entrez des pointures valides séparées par des virgules.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const detailImages = uploadedUrls.map((url, idx) => ({ id: `img-${idx}`, url, hint: newShoeName }));
      const payload: Omit<Shoe, 'id'> = {
        name: newShoeName,
        description: newShoeDescription,
        price: newShoePrice,
        categoryId: newShoeCategoryId,
        collectionIds: newShoeCollectionIds,
        gridImage: detailImages[0],
        detailImages,
        availableSizes: parsedSizes,
        availableColors: newShoeColors,
      };

      const result = await createProduct(payload);
      if (!result.success) {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Succès', description: 'Produit créé avec succès.' });
        setNewShoeName('');
        setNewShoeDescription('');
        setNewShoePrice(0);
        setNewShoeCategoryId('');
        setNewShoeCollectionIds([]);
        setNewShoeSizes('');
        setNewShoeColors([]);
        setNewShoeImageFiles([]);
        setNewShoeImagePreviews([]);
        fetchData();
      }
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleAddColor = () => {
    if (!newColorName.trim()) return;
    setNewShoeColors((prev) => [...prev, { name: newColorName.trim(), hex: newColorHex }]);
    setNewColorName('');
    setNewColorHex('#000000');
  };

  const handleRemoveColor = (colorName: string) => {
    setNewShoeColors((prev) => prev.filter((color) => color.name !== colorName));
  };

  const handleOrderStatusChange = async (orderId: string, status: OrderStatus) => {
    const result = await updateOrderStatus(orderId, status);
    if (result.success) {
      toast({ title: 'Succès', description: 'Statut de commande mis à jour.' });
      fetchData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim() || newPromoValue <= 0) {
      toast({ title: 'Champs manquants', description: 'Veuillez renseigner un code et une valeur.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await createPromoCode({
      code: newPromoCode.toUpperCase().trim(),
      discountType: newPromoDiscountType,
      value: newPromoValue,
      isActive: true,
    });
    if (result.success) {
      toast({ title: 'Succès', description: 'Code promo créé.' });
      setNewPromoCode('');
      setNewPromoValue(0);
      fetchData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handlePromoStatusToggle = async (promo: PromoCode) => {
    const result = await updatePromoCode(promo.id, { isActive: !promo.isActive });
    if (result.success) {
      toast({ title: 'Succès', description: 'Statut promo mis à jour.' });
      fetchData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    const result = await deletePromoCode(promoId);
    if (result.success) {
      toast({ title: 'Succès', description: 'Code promo supprimé.' });
      fetchData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
  };

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'all') return orders;
    return orders.filter((order) => order.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><CardDescription>Produits</CardDescription><CardTitle>{shoes.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Commandes</CardDescription><CardTitle>{orders.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Catégories</CardDescription><CardTitle>{categories.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Promotions</CardDescription><CardTitle>{promoCodes.length}</CardTitle></CardHeader></Card>
          </div>
        );
      
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
            <CardHeader><CardTitle>Créer un produit</CardTitle><CardDescription>Ajoutez un nouveau produit au catalogue.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nom</Label><Input value={newShoeName} onChange={(e) => setNewShoeName(e.target.value)} required/></div>
                  <div className="space-y-2"><Label>Prix (XOF)</Label><Input type="number" min={0} value={newShoePrice} onChange={(e) => setNewShoePrice(Number(e.target.value))} required/></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={newShoeDescription} onChange={(e) => setNewShoeDescription(e.target.value)} required/></div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select value={newShoeCategoryId} onValueChange={setNewShoeCategoryId}>
                      <SelectTrigger><SelectValue placeholder="Choisir une catégorie"/></SelectTrigger>
                      <SelectContent>{categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Pointures (ex: 40,41,42)</Label><Input value={newShoeSizes} onChange={(e) => setNewShoeSizes(e.target.value)} required/></div>
                </div>
                <div className="space-y-2">
                  <Label>Collections</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                    {collections.map((col) => (
                      <label key={col.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={newShoeCollectionIds.includes(col.id)} onCheckedChange={(checked) => setNewShoeCollectionIds((prev) => checked ? [...prev, col.id] : prev.filter((id) => id !== col.id))}/>
                        <span>{col.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Couleurs</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Nom couleur" value={newColorName} onChange={(e) => setNewColorName(e.target.value)} />
                    <Input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-16 p-1"/>
                    <Button type="button" variant="outline" onClick={handleAddColor}>Ajouter</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newShoeColors.map((color) => (
                      <Badge key={color.name} variant="secondary" className="gap-2">{color.name}<button type="button" onClick={() => handleRemoveColor(color.name)}><X className="h-3 w-3"/></button></Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Images</Label>
                  <Input type="file" accept="image/*" multiple onChange={handleImageFileChange} required/>
                  <div className="flex flex-wrap gap-2">{newShoeImagePreviews.map((src, i) => <Image key={i} src={src} alt={`preview-${i}`} width={64} height={64} className="rounded-md object-cover"/>)}</div>
                </div>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Créer le produit'}</Button>
              </form>
            </CardContent>
          </Card>
        );

      case 'orders':
         return (
          <Card>
            <CardHeader>
              <CardTitle>Commandes</CardTitle>
              <CardDescription>Gérez les statuts des commandes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Select value={orderStatusFilter} onValueChange={(v) => setOrderStatusFilter(v as OrderStatus | 'all')}>
                  <SelectTrigger><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="En attente">En attente</SelectItem>
                    <SelectItem value="Prêt">Prêt</SelectItem>
                    <SelectItem value="Livré">Livré</SelectItem>
                    <SelectItem value="Annulé">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Total</TableHead><TableHead>Statut</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                      </TableCell>
                      <TableCell>{order.total.toLocaleString('fr-FR')} XOF</TableCell>
                      <TableCell>
                        <Select value={order.status} onValueChange={(v) => handleOrderStatusChange(order.id, v as OrderStatus)}>
                          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="En attente">En attente</SelectItem>
                            <SelectItem value="Prêt">Prêt</SelectItem>
                            <SelectItem value="Livré">Livré</SelectItem>
                            <SelectItem value="Annulé">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{new Date(order.date).toLocaleDateString('fr-FR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
         );

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
                            <TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Nom</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {categories.map(cat => (
                                    <TableRow key={cat.id}>
                                        <TableCell>
                                          <div className="space-y-2">
                                            {cat.imageUrl ? (
                                              <Image src={cat.imageUrl} alt={cat.name} width={52} height={52} className="rounded-md object-cover" />
                                            ) : (
                                              <div className="h-[52px] w-[52px] rounded-md bg-muted" />
                                            )}
                                            {editingCategoryId === cat.id && (
                                              <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setEditingCategoryImageFile(e.target.files ? e.target.files[0] : null)}
                                                className="max-w-xs"
                                              />
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          {editingCategoryId === cat.id ? (
                                            <Input
                                              value={editingCategoryName}
                                              onChange={(e) => setEditingCategoryName(e.target.value)}
                                              className="max-w-xs"
                                            />
                                          ) : (
                                            cat.name
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-2">
                                            {editingCategoryId === cat.id ? (
                                              <>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => handleUpdateCategory(cat)}
                                                  disabled={isSubmitting}
                                                >
                                                  Enregistrer
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={cancelEditCategory}>
                                                  Annuler
                                                </Button>
                                              </>
                                            ) : (
                                              <Button variant="ghost" size="icon" onClick={() => startEditCategory(cat)}>
                                                <Pencil className="h-4 w-4" />
                                              </Button>
                                            )}
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
                                          </div>
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
                            <TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Nom</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
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

      case 'promotions':
        return (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Créer un code promo</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePromoCode} className="space-y-4">
                  <div className="space-y-2"><Label>Code</Label><Input value={newPromoCode} onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())} required/></div>
                  <div className="space-y-2">
                    <Label>Type de remise</Label>
                    <Select value={newPromoDiscountType} onValueChange={(v) => setNewPromoDiscountType(v as 'percentage' | 'fixed')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                        <SelectItem value="fixed">Montant fixe (XOF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Valeur</Label><Input type="number" min={1} value={newPromoValue} onChange={(e) => setNewPromoValue(Number(e.target.value))} required/></div>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Créer le code'}</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Codes existants</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Remise</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {promoCodes.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell className="font-medium">{promo.code}</TableCell>
                        <TableCell>{promo.discountType === 'percentage' ? `${promo.value}%` : `${promo.value.toLocaleString('fr-FR')} XOF`}</TableCell>
                        <TableCell><Badge variant={promo.isActive ? 'default' : 'secondary'}>{promo.isActive ? 'Actif' : 'Inactif'}</Badge></TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handlePromoStatusToggle(promo)}>{promo.isActive ? 'Désactiver' : 'Activer'}</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeletePromo(promo.id)}>Supprimer</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
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
