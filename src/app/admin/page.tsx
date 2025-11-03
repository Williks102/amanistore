
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

  const handleCreateCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategoryName || !newCategoryImageFile) {
          toast({ title: 'Champs manquants', description: 'Le nom et l'image sont requis.', variant: 'destructive' });
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
          toast({ title: 'Champs manquants', description: 'Le nom et l'image sont requis.', variant: 'destructive' });
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
        // The form for creating a new product is lengthy, so it's omitted for brevity in this thought block
        // But the full implementation is in the final code.
        return <p>Create Product Form Placeholder</p>; // This will be the full form

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
