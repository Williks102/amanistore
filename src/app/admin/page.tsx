
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
import { Loader2, PlusCircle, Box, ShoppingBag, Users, BarChart2, Tag, Truck, CheckCircle, XCircle, Clock, Archive, X, Trash2, ShieldCheck, ListOrdered, Shapes, Menu, Mail, Inbox, ListChecks } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Image from 'next/image';

import type { Shoe, Category, Collection, Order, OrderStatus, PromoCode, ShoeColor, ContactMessage } from '@/lib/types';
import { newSizeRow, parseSizeRows, type SizeRow } from '@/lib/size-rows';
import { AdminPromoList } from '@/components/admin/AdminPromoList';
import { SizeStockEditor } from '@/components/admin/SizeStockEditor';
import { duplicateNames, productIssues } from '@/lib/product-validation';
import type { ColorNormalizationItem } from '@/app/actions';
import { 
    getProducts, getCategories, getCollections, createProduct, updateProduct, deleteProduct, 
    uploadImage, getOrders, updateOrderStatus, getPromoCodes, createPromoCode, 
    updatePromoCode, deletePromoCode, createCategory, deleteCategory, createCollection, 
    deleteCollection, getOrderByCodeForValidation, validateOrderDelivery, getMyRoles,
    getContactMessages, deleteContactMessage, previewColorNormalization, applyColorNormalization
} from '@/app/actions';
import { getIdToken } from '@/lib/get-id-token';
import { RoleGate } from '@/components/RoleGate';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { ColorPicker } from '@/components/ColorPicker';
import { AdminProductList } from '@/components/admin/AdminProductList';
import { DashboardView } from '@/components/admin/DashboardView';
import { AdminOrderList } from '@/components/admin/AdminOrderList';
import { OrderDetailDialog } from '@/components/admin/OrderDetailDialog';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { HomeButton, LogoutButton } from '@/components/DashboardActions';
import type { Roles } from '@/lib/server-auth';
import { EditProductModal } from '@/components/EditProductModal';

type View = 'dashboard' | 'products' | 'create-product' | 'orders' | 'categories' | 'collections' | 'promotions' | 'messages' | 'quality' | 'delivery-validation';

const VIEW_ROLES: Record<View, Array<keyof Roles>> = {
  // Un tableau vide = réservé aux admins (l'admin passe toujours).
  dashboard: ['orderManager', 'productManager'],
  orders: ['orderManager'],
  products: ['productManager'],
  'create-product': ['productManager'],
  categories: [],
  collections: [],
  promotions: [],
  messages: [],
  quality: ['productManager'],
  'delivery-validation': ['orderManager'],
};
const VIEW_ORDER: View[] = ['dashboard', 'orders', 'products', 'create-product', 'categories', 'collections', 'promotions', 'messages', 'quality', 'delivery-validation'];

const AdminPage = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [roles, setRoles] = useState<Roles | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const can = (view: View) => !!roles && (roles.admin || VIEW_ROLES[view].some((r) => roles[r]));

  useEffect(() => {
    (async () => {
      const { roles: fetched } = await getMyRoles(await getIdToken());
      if (!fetched) {
        // Sans droits connus on ne peut rien charger: on le dit au lieu de rester sur un chargement sans fin.
        setFailedSources(['vos droits d’accès (session expirée ?)']);
        setIsLoading(false);
        return;
      }
      setRoles(fetched);
    })();
  }, []);

  useEffect(() => {
    if (roles && !can(activeView)) {
      const first = VIEW_ORDER.find((v) => can(v));
      if (first) setActiveView(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);
  // Data states
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [colorPreview, setColorPreview] = useState<ColorNormalizationItem[] | null>(null);
  const [isColorBusy, setIsColorBusy] = useState(false);
  const [featuredBusyId, setFeaturedBusyId] = useState<string | null>(null);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newShoeName, setNewShoeName] = useState('');
  const [newShoeDescription, setNewShoeDescription] = useState('');
  const [newShoePrice, setNewShoePrice] = useState(0);
  const [newShoeCategoryId, setNewShoeCategoryId] = useState('');
  const [newShoeCollectionIds, setNewShoeCollectionIds] = useState<string[]>([]);
  const [newShoeRows, setNewShoeRows] = useState<SizeRow[]>(() => [newSizeRow()]);
  const [newShoeTracked, setNewShoeTracked] = useState(true);
  const [newShoeColors, setNewShoeColors] = useState<ShoeColor[]>([]);
  const [newShoeImageFiles, setNewShoeImageFiles] = useState<File[]>([]);
  const [newShoeImagePreviews, setNewShoeImagePreviews] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionImageFile, setNewCollectionImageFile] = useState<File | null>(null);
  const [newCollectionCategoryIds, setNewCollectionCategoryIds] = useState<string[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscountType, setNewPromoDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newPromoValue, setNewPromoValue] = useState(0);
  const [newPromoExpiresAt, setNewPromoExpiresAt] = useState('');
  const [newPromoMaxUses, setNewPromoMaxUses] = useState('');
  const [newPromoMinAmount, setNewPromoMinAmount] = useState('');
  const [newShoeFeatured, setNewShoeFeatured] = useState(false);

  // Edit Modal states
  const [selectedShoe, setSelectedShoe] = useState<Shoe | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Order states
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [openOrderId, setOpenOrderId] = useState<string | null>(null); // fiche ouverte (relue dans la liste: elle se met à jour après un changement de statut)

  // Delivery Validation states
  const [validationCode, setValidationCode] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidationLoading, setIsValidationLoading] = useState(false);

  /**
   * Charge chaque source séparément: si l'une échoue, les autres s'affichent quand même et on dit laquelle manque
   * (avant, une seule erreur vidait tout l'admin). On ne demande que ce que le rôle permet de lire.
   */
  const fetchData = async () => {
    setIsLoading(true);
    const token = await getIdToken();
    const wantOrders = !!roles && (roles.admin || roles.orderManager);
    const wantAdminData = !!roles?.admin;
    const jobs: Array<[string, Promise<unknown>]> = [
      ['produits', getProducts()],
      ['catégories', getCategories()],
      ['collections', getCollections()],
      ['commandes', wantOrders ? getOrders(token) : Promise.resolve(null)],
      ['codes promo', wantAdminData ? getPromoCodes(token) : Promise.resolve(null)],
      ['messages', wantAdminData ? getContactMessages(token) : Promise.resolve(null)],
    ];
    const results = await Promise.allSettled(jobs.map(([, job]) => job));
    const failed: string[] = [];
    const value = <T,>(index: number): T | null => {
      const result = results[index];
      if (result.status === 'rejected') { failed.push(jobs[index][0]); return null; }
      return result.value as T | null;
    };
    const shoesData = value<Shoe[]>(0);
    const categoriesData = value<Category[]>(1);
    const collectionsData = value<Collection[]>(2);
    const ordersData = value<Order[]>(3);
    const promoData = value<PromoCode[]>(4);
    const messagesData = value<ContactMessage[]>(5);
    // Une source qui a échoué garde ses dernières données connues.
    if (shoesData) setShoes(shoesData);
    if (categoriesData) setCategories(categoriesData);
    if (collectionsData) setCollections(collectionsData);
    if (ordersData) setOrders(ordersData);
    if (promoData) setPromoCodes(promoData);
    if (messagesData) setMessages(messagesData);
    if (!token) failed.push('votre session (reconnectez-vous)');
    failed.forEach((name) => console.error(`Chargement admin impossible: ${name}`));
    setFailedSources(failed);
    setIsLoading(false);
  };

  useEffect(() => { if (roles) fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  // ---- ENTITY HANDLERS (Create, Delete) ----

  const handleToggleFeatured = async (shoe: Shoe) => {
    setFeaturedBusyId(shoe.id);
    const next = !shoe.featured;
    const result = await updateProduct(await getIdToken(), shoe.id, { featured: next });
    if (result.success) {
      setShoes((prev) => prev.map((s) => (s.id === shoe.id ? { ...s, featured: next } : s)));
      toast({ title: next ? 'Ajouté à la sélection' : 'Retiré de la sélection', description: shoe.name });
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
    setFeaturedBusyId(null);
  };

  const handleDeleteProduct = async (shoeId: string) => {
    const result = await deleteProduct(await getIdToken(), shoeId);
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
      const uploadResult = await uploadImage(await getIdToken(), formData);
      if (uploadResult.error || !uploadResult.secure_url) {
          toast({ title: 'Erreur d\'upload', description: uploadResult.error, variant: 'destructive' });
          setIsSubmitting(false);
          return;
      }
      const result = await createCategory(await getIdToken(), { name: newCategoryName, imageId: 'cloud', imageUrl: uploadResult.secure_url });
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
      const result = await deleteCategory(await getIdToken(), categoryId);
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
      const uploadResult = await uploadImage(await getIdToken(), formData);
       if (uploadResult.error || !uploadResult.secure_url) {
          toast({ title: 'Erreur d\'upload', description: uploadResult.error, variant: 'destructive' });
          setIsSubmitting(false);
          return;
      }
      const result = await createCollection(await getIdToken(), { name: newCollectionName, imageUrl: uploadResult.secure_url, categoryIds: newCollectionCategoryIds });
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
      const result = await deleteCollection(await getIdToken(), collectionId);
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
    const { order, error } = await getOrderByCodeForValidation(await getIdToken(), validationCode);
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
    const { success, error } = await validateOrderDelivery(await getIdToken(), orderId);
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
        const uploadResult = await uploadImage(await getIdToken(), fd);
        if (uploadResult.error || !uploadResult.secure_url) {
          toast({ title: 'Erreur d\'upload', description: uploadResult.error, variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        uploadedUrls.push(uploadResult.secure_url);
      }

      const parsedRows = parseSizeRows(newShoeRows, newShoeTracked);
      if (parsedRows.error) {
        toast({ title: 'Pointures et stock', description: parsedRows.error, variant: 'destructive' });
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
        availableSizes: parsedRows.sizes,
        availableColors: newShoeColors,
        ...(parsedRows.stock ? { stock: parsedRows.stock } : {}),
        ...(newShoeFeatured ? { featured: true } : {}),
      };

      const result = await createProduct(await getIdToken(), payload);
      if (!result.success) {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Succès', description: 'Produit créé avec succès.' });
        setNewShoeName('');
        setNewShoeDescription('');
        setNewShoePrice(0);
        setNewShoeCategoryId('');
        setNewShoeCollectionIds([]);
        setNewShoeRows([newSizeRow()]);
        setNewShoeTracked(true);
        setNewShoeFeatured(false);
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

  const handleOrderStatusChange = async (orderId: string, status: OrderStatus) => {
    const result = await updateOrderStatus(await getIdToken(), orderId, status);
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
    const result = await createPromoCode(await getIdToken(), {
      code: newPromoCode.toUpperCase().trim(),
      discountType: newPromoDiscountType,
      value: newPromoValue,
      isActive: true,
      ...(newPromoExpiresAt ? { expiresAt: new Date(`${newPromoExpiresAt}T23:59:59`).toISOString() } : {}),
      ...(newPromoMaxUses ? { maxUses: Number(newPromoMaxUses) } : {}),
      ...(newPromoMinAmount ? { minOrderAmount: Number(newPromoMinAmount) } : {}),
    });
    if (result.success) {
      toast({ title: 'Succès', description: 'Code promo créé.' });
      setNewPromoCode('');
      setNewPromoValue(0);
      setNewPromoExpiresAt('');
      setNewPromoMaxUses('');
      setNewPromoMinAmount('');
      fetchData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handlePromoStatusToggle = async (promo: PromoCode) => {
    const result = await updatePromoCode(await getIdToken(), promo.id, { isActive: !promo.isActive });
    if (result.success) {
      toast({ title: 'Succès', description: 'Statut promo mis à jour.' });
      fetchData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    const result = await deletePromoCode(await getIdToken(), promoId);
    if (result.success) {
      toast({ title: 'Succès', description: 'Code promo supprimé.' });
      fetchData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
  };

  const handlePreviewColors = async () => {
    setIsColorBusy(true);
    const result = await previewColorNormalization(await getIdToken());
    if (result.error) toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    else setColorPreview(result.items);
    setIsColorBusy(false);
  };

  const handleApplyColors = async () => {
    setIsColorBusy(true);
    const result = await applyColorNormalization(await getIdToken());
    if (result.success) {
      toast({ title: 'Couleurs normalisées', description: `${result.updated} produit(s) corrigé(s)${result.skipped.length ? `, ${result.skipped.length} à corriger à la main` : ''}.` });
      setColorPreview(result.skipped);
      fetchData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
    setIsColorBusy(false);
  };

  const catalogIssues = useMemo(
    () => shoes.map((shoe) => ({ shoe, issues: productIssues(shoe, categories) })).filter((row) => row.issues.length > 0),
    [shoes, categories]
  );
  const duplicates = useMemo(() => duplicateNames(shoes), [shoes]);

  const handleDeleteMessage = async (messageId: string) => {
    const result = await deleteContactMessage(await getIdToken(), messageId);
    if (result.success) {
      toast({ title: 'Succès', description: 'Message supprimé.' });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
  };

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'all') return orders;
    return orders.filter((order) => order.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const renderContent = () => {
    if (!can(activeView)) return null;
    if (isLoading) {
      return (
        <div aria-busy="true" aria-label="Chargement" className="space-y-3">
          <Skeleton className="h-8 w-48" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            orders={orders}
            shoes={shoes}
            categories={categories}
            promoCodes={promoCodes}
            messages={messages}
            roles={roles}
            onNavigate={setActiveView}
          />
        );

      case 'products':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Produits</CardTitle>
              <CardDescription>Gérez vos produits.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminProductList
                shoes={shoes}
                onEdit={(shoe) => { setSelectedShoe(shoe); setIsEditModalOpen(true); }}
                onDelete={handleDeleteProduct}
                onToggleFeatured={handleToggleFeatured}
                busyId={featuredBusyId}
              />
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
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-primary/30 bg-primary/10 px-3 text-sm font-medium">
                    <input type="checkbox" className="h-5 w-5 accent-primary" checked={newShoeFeatured} onChange={(e) => setNewShoeFeatured(e.target.checked)} />
                    Coup de cœur: mis en avant sur l&apos;accueil
                  </label>
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
                </div>
                <SizeStockEditor idPrefix="new-product" rows={newShoeRows} onRowsChange={setNewShoeRows} tracked={newShoeTracked} onTrackedChange={setNewShoeTracked} />
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
                  <ColorPicker value={newShoeColors} onChange={setNewShoeColors} />
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
              <AdminOrderList orders={filteredOrders} filter={orderStatusFilter} onOpen={(order) => setOpenOrderId(order.id)} />
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
                            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {categories.map(cat => (
                                    <TableRow key={cat.id}>
                                        <TableCell className="font-medium">{cat.name}</TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Supprimer la catégorie ${cat.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
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
                        {categories.length === 0 && <EmptyState title="Aucune catégorie" hint="Ajoutez-en une avec le formulaire." />}
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
                                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Supprimer la collection ${col.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
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
                        {collections.length === 0 && <EmptyState title="Aucune collection" hint="Ajoutez-en une avec le formulaire." />}
                    </CardContent>
                </Card>
            </div>
        );

        case 'quality':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Qualité du catalogue</CardTitle>
                <CardDescription>
                  {catalogIssues.length === 0 ? 'Aucune anomalie: tous vos produits sont complets.' : `${catalogIssues.length} produit(s) sur ${shoes.length} à vérifier.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {catalogIssues.length === 0 && <EmptyState title="Rien à corriger" hint="Les prix, pointures, couleurs, photos et descriptions sont conformes." />}
                {catalogIssues.map(({ shoe, issues }) => (
                  <div key={shoe.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{shoe.name}</p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                        {issues.map((issue) => <li key={issue.code}>{issue.label}</li>)}
                      </ul>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedShoe(shoe); setIsEditModalOpen(true); }}>Modifier</Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Normaliser les couleurs</CardTitle>
                <CardDescription>
                  Remplace les couleurs écrites à la main (« noir », « Noire », « Maron »…) par la palette officielle, avec le bon code couleur. Vous voyez tous les changements avant de confirmer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" onClick={handlePreviewColors} disabled={isColorBusy}>
                  {isColorBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Voir les changements'}
                </Button>
                {colorPreview && colorPreview.length === 0 && <p className="text-sm text-muted-foreground">Toutes les couleurs sont déjà conformes à la palette.</p>}
                {colorPreview && colorPreview.length > 0 && (
                  <>
                    <ul className="space-y-2">
                      {colorPreview.map((item) => (
                        <li key={item.id} className="rounded-md border p-3 text-sm">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground">{item.before.join(', ')} → <span className="text-foreground">{item.after.join(', ')}</span></p>
                          {item.unmapped.length > 0 && <p className="text-destructive">À corriger à la main (hors palette): {item.unmapped.join(', ')}. Ce produit ne sera pas modifié.</p>}
                        </li>
                      ))}
                    </ul>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button disabled={isColorBusy || colorPreview.every((i) => i.unmapped.length > 0)}>Appliquer ces changements</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Appliquer la normalisation ?</AlertDialogTitle>
                          <AlertDialogDescription>Les couleurs de {colorPreview.filter((i) => i.unmapped.length === 0).length} produit(s) seront modifiées dans votre base. Les commandes déjà passées ne changent pas.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={handleApplyColors}>Appliquer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </CardContent>
            </Card>

            {duplicates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Noms en double</CardTitle>
                  <CardDescription>Plusieurs produits portent le même nom: dans la boutique, les cartes se ressemblent. Ajoutez la couleur ou une référence au nom.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-wrap gap-2">
                    {duplicates.map((d) => <li key={d.name}><Badge variant="secondary" className="capitalize">{d.name} ×{d.count}</Badge></li>)}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        );
        case 'messages':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Messages de contact</CardTitle>
              <CardDescription>{messages.length} message(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.length === 0 && <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>}
              {messages.map((m) => (
                <div key={m.id} className="rounded-md border p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{m.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {m.name} · <a className="underline" href={`mailto:${encodeURIComponent(m.email)}`}>{m.email}</a> · {new Date(m.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteMessage(m.id)} aria-label={`Supprimer le message de ${m.name}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {/* Rendu en texte brut: React échappe le contenu (pas de HTML injecté). */}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
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
                                    <p><strong>Statut actuel :</strong> <OrderStatusBadge status={foundOrder.status} /></p>
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
                  <div className="space-y-2"><Label>Date d&apos;expiration (optionnel)</Label><Input type="date" value={newPromoExpiresAt} onChange={(e) => setNewPromoExpiresAt(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Nombre d&apos;utilisations maximum (optionnel)</Label><Input type="number" min={1} value={newPromoMaxUses} onChange={(e) => setNewPromoMaxUses(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Montant minimum de commande en XOF (optionnel)</Label><Input type="number" min={0} value={newPromoMinAmount} onChange={(e) => setNewPromoMinAmount(e.target.value)} /></div>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Créer le code'}</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Codes existants</CardTitle></CardHeader>
              <CardContent>
                <AdminPromoList promoCodes={promoCodes} onToggle={handlePromoStatusToggle} onDelete={handleDeletePromo} />
              </CardContent>
            </Card>
          </div>
        );

      default:
        return <div>Sélectionnez une vue</div>;
    }
  };

  const NAV_ITEMS: Record<View, { label: string; icon: React.ReactNode }> = {
    dashboard: { label: 'Dashboard', icon: <BarChart2 className="mr-2 h-4 w-4" /> },
    orders: { label: 'Commandes', icon: <ListOrdered className="mr-2 h-4 w-4" /> },
    'delivery-validation': { label: 'Valider Livraison', icon: <ShieldCheck className="mr-2 h-4 w-4" /> },
    promotions: { label: 'Promotions', icon: <Tag className="mr-2 h-4 w-4" /> },
    products: { label: 'Produits', icon: <Box className="mr-2 h-4 w-4" /> },
    'create-product': { label: 'Créer un produit', icon: <PlusCircle className="mr-2 h-4 w-4" /> },
    categories: { label: 'Catégories', icon: <Archive className="mr-2 h-4 w-4" /> },
    collections: { label: 'Collections', icon: <Shapes className="mr-2 h-4 w-4" /> },
    messages: { label: 'Messages', icon: <Mail className="mr-2 h-4 w-4" /> },
    quality: { label: 'Qualité du catalogue', icon: <ListChecks className="mr-2 h-4 w-4" /> },
  };

  // Navigation groupée: l'essentiel d'abord, puis les ventes, la boutique, les clients.
  const NAV_GROUPS: Array<{ label: string; views: View[] }> = [
    { label: "Vue d'ensemble", views: ['dashboard'] },
    { label: 'Ventes', views: ['orders', 'delivery-validation', 'promotions'] },
    { label: 'Boutique', views: ['products', 'create-product', 'quality', 'categories', 'collections'] },
    { label: 'Clients', views: ['messages'] },
  ];

  const renderNav = (onSelect?: () => void) => (
    <nav aria-label="Navigation de l'administration" className="flex flex-col">
      {NAV_GROUPS.map((group) => {
        const visible = group.views.filter((v) => can(v));
        if (visible.length === 0) return null;
        return (
          <div key={group.label} className="pb-2">
            <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
            <div className="flex flex-col space-y-1">
              {visible.map((view) => (
                <Button
                  key={view}
                  variant={activeView === view ? 'secondary' : 'ghost'}
                  aria-current={activeView === view ? 'page' : undefined}
                  onClick={() => { setActiveView(view); onSelect?.(); }}
                  className="justify-start"
                >
                  {NAV_ITEMS[view].icon} {NAV_ITEMS[view].label}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
      {roles?.admin && (
        <div className="pb-2">
          <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Équipe</p>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin/roles" onClick={onSelect}><Users className="mr-2 h-4 w-4" /> Rôles et accès</Link>
          </Button>
        </div>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="w-64 bg-background border-r p-4 flex-col hidden md:flex">
        <h1 className="text-2xl font-bold mb-8">Amani<span className="text-primary">.</span> Admin</h1>
        {renderNav()}
        <div className="mt-auto pt-4 border-t flex flex-col space-y-1.5">
          <HomeButton />
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b bg-background px-4 py-3">
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetTitle className="text-2xl font-bold mb-8">Amani<span className="text-primary">.</span> Admin</SheetTitle>
              {renderNav(() => setIsMobileNavOpen(false))}
              <div className="mt-6 pt-4 border-t flex flex-col space-y-1.5">
                <HomeButton onNavigate={() => setIsMobileNavOpen(false)} />
                <LogoutButton onNavigate={() => setIsMobileNavOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold">Amani<span className="text-primary">.</span> Admin</span>
          <div className="ml-auto flex items-center gap-1">
            <HomeButton iconOnly />
            <LogoutButton iconOnly />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {failedSources.length > 0 && !isLoading && (
            <div role="alert" className="mb-6 flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p>
                <strong>Certaines données n&apos;ont pas pu être chargées:</strong> {failedSources.join(', ')}. Les chiffres affichés peuvent être incomplets.
              </p>
              <Button variant="outline" size="sm" className="shrink-0" onClick={fetchData}>Réessayer</Button>
            </div>
          )}
          {renderContent()}
        </main>
      </div>
      <OrderDetailDialog
        order={orders.find((o) => o.id === openOrderId) ?? null}
        onClose={() => setOpenOrderId(null)}
        onStatusChange={handleOrderStatusChange}
      />
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

export default function ProtectedAdminPage() {
  return (
    <RoleGate allow={['admin', 'productManager', 'orderManager']}>
      <AdminPage />
    </RoleGate>
  );
}
