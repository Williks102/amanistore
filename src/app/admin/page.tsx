
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import type { Order, OrderStatus, Shoe, ShoeColor, Category, PromoCode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, X, ImageIcon, Loader2, DollarSign, Package, ShoppingCart, Ticket, LayoutDashboard, ListOrdered, Tag, Home, ArrowLeft, KeyRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { getOrders, updateOrderStatus, validateOrderDelivery } from '@/services/orderService';
import { getProducts, deleteProduct } from '@/services/productService';
import { getCategories, deleteCategory } from '@/services/categoryService';
import { getPromoCodes } from '@/services/promoCodeService';
import { useToast } from '@/hooks/use-toast';
import { uploadImage, createProduct, createCategory, updateProduct, createPromoCode, togglePromoCodeStatus, removePromoCode } from '@/app/actions';
import { EditProductModal } from '@/components/EditProductModal';
import { Switch } from '@/components/ui/switch';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';

type AdminView = 'dashboard' | 'orders' | 'products' | 'create' | 'categories' | 'promo';

const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [newProductColors, setNewProductColors] = useState<ShoeColor[]>([]);
  const [currentColorName, setCurrentColorName] = useState('');
  const [currentColorHex, setCurrentColorHex] = useState('#000000');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [validationCodes, setValidationCodes] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const [editingShoe, setEditingShoe] = useState<Shoe | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>('dashboard');

  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedCategories, fetchedPromoCodes, fetchedProducts] = await Promise.all([
        getOrders(),
        getCategories(),
        getPromoCodes(),
        getProducts()
      ]);
      setOrders(fetchedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setShoes(fetchedProducts);
      setCategories(fetchedCategories);
      setPromoCodes(fetchedPromoCodes);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.push('/login');
      } else {
        const isAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAIL === user.email;
        if (isAdmin) {
          setIsAuthorized(true);
        } else {
          toast({
            title: 'Accès non autorisé',
            description: "Vous n'avez pas les droits pour accéder à cette page.",
            variant: 'destructive',
          });
          router.push('/');
        }
      }
    }
  }, [user, isUserLoading, router, toast]);

  useEffect(() => {
    if (isAuthorized) {
      fetchAllData();
    }
  }, [isAuthorized, fetchAllData]);


  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter(order => order.status === 'Livré')
      .reduce((acc, order) => acc + order.total, 0);
    
    const pendingOrders = orders.filter(order => order.status === 'En attente').length;
    
    const totalProducts = shoes.length;

    return { totalRevenue, pendingOrders, totalProducts };
  }, [orders, shoes]);


  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
        await updateOrderStatus(orderId, newStatus);
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
        toast({ title: 'Succès', description: 'Statut de la commande mis à jour.' });
    } catch (error) {
        console.error("Failed to update order status:", error);
        toast({ title: 'Erreur', description: 'La mise à jour a échoué.', variant: 'destructive' });
    }
  };
  
  const handleDeleteProduct = async (shoeId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      await deleteProduct(shoeId);
      setShoes(prevShoes => prevShoes.filter(s => s.id !== shoeId));
      toast({ title: 'Succès', description: 'Produit supprimé.' });
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast({ title: 'Erreur', description: 'La suppression a échoué.', variant: 'destructive' });
    }
  }

  const handleEditProduct = (shoe: Shoe) => {
    setEditingShoe(shoe);
    setIsEditModalOpen(true);
  }

  const handleAddColor = () => {
    if (!currentColorName.trim()) {
        toast({ title: 'Nom de couleur manquant', description: 'Veuillez donner un nom à la couleur.', variant: 'destructive' });
        return;
    }
    if (newProductColors.some(c => c.name === currentColorName.trim())) {
        toast({ title: 'Couleur déjà ajoutée', description: 'Cette couleur existe déjà dans la liste.', variant: 'destructive' });
        return;
    }
    setNewProductColors([...newProductColors, { name: currentColorName.trim(), hex: currentColorHex }]);
    setCurrentColorName('');
    setCurrentColorHex('#000000');
  }

  const handleRemoveColor = (colorNameToRemove: string) => {
    setNewProductColors(newProductColors.filter(c => c.name !== colorNameToRemove));
  }
  
  const handleCreateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!selectedCategoryId) {
        toast({ title: 'Erreur de validation', description: 'Veuillez sélectionner une catégorie.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    const currentForm = formRef.current;
    if (!currentForm) {
      setIsSubmitting(false);
      return;
    }
      
    const formData = new FormData(currentForm);
    const name = formData.get('product-name') as string;
    const description = formData.get('product-description') as string;
    const priceStr = formData.get('product-price') as string;
    const sizesStr = formData.get('product-sizes') as string;
    const imageFile = formData.get('product-image') as File;

    if (!name || !description || !priceStr || !sizesStr) {
      toast({ title: 'Formulaire incomplet', description: 'Veuillez remplir tous les champs de texte.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    if (imageFile.size === 0) {
      toast({ title: 'Image manquante', description: 'Veuillez sélectionner une image pour le produit.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const price = Number(priceStr);
    if (isNaN(price) || price <= 0) {
      toast({ title: 'Erreur de validation', description: 'Veuillez entrer un prix valide et supérieur à zéro.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    const availableSizes = sizesStr.split(',').map(s => Number(s.trim())).filter(s => !isNaN(s) && s > 0);
    if (availableSizes.length === 0) {
        toast({ title: 'Erreur de validation', description: 'Veuillez entrer au moins une taille valide (nombres séparés par des virgules).', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    if (newProductColors.length === 0) {
      toast({ title: 'Aucune couleur', description: 'Veuillez ajouter au moins une couleur disponible.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    
    const uploadFormData = new FormData();
    uploadFormData.append('image', imageFile);
    const uploadResult = await uploadImage(uploadFormData);

    if (uploadResult.error || !uploadResult.secure_url) {
        toast({
            title: 'Échec de l\'upload',
            description: uploadResult.error || 'Impossible d\'obtenir l\'URL de l\'image depuis Cloudinary.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }

    const imageUrl = uploadResult.secure_url;

    const newShoeData: Omit<Shoe, 'id'> = {
        name: name,
        description: description,
        price: price,
        categoryId: selectedCategoryId,
        availableSizes: availableSizes,
        availableColors: newProductColors,
        gridImage: { id: "placeholder", url: imageUrl, hint: "shoe" },
        detailImages: [{ id: "placeholder", url: imageUrl, hint: "shoe" }]
    };

    const creationResult = await createProduct(newShoeData);

    if (creationResult.success) {
        toast({ title: 'Succès', description: 'Produit créé avec succès !' });
        currentForm.reset();
        setSelectedCategoryId('');
        setNewProductColors([]);
        fetchAllData(); 
    } else {
        toast({ title: 'Erreur', description: creationResult.error || 'La création du produit a échoué.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  }

  const handleCreateCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const name = formData.get('category-name') as string;
    const imageFile = formData.get('category-image') as File;

    if (!name.trim()) {
      toast({ title: 'Nom manquant', description: 'Veuillez donner un nom à la catégorie.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
     if (!imageFile || imageFile.size === 0) {
      toast({ title: 'Image manquante', description: 'Veuillez sélectionner une image pour la catégorie.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    
    const uploadFormData = new FormData();
    uploadFormData.append('image', imageFile);
    const uploadResult = await uploadImage(uploadFormData);
    if (uploadResult.error || !uploadResult.secure_url) {
        toast({ title: 'Échec de l\'upload', description: uploadResult.error || 'Impossible de téléverser l\'image.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    const newCategoryData: Omit<Category, 'id'> = {
      name: name.trim(),
      imageId: `category-${name.toLowerCase().replace(/\s+/g, '-')}`,
      imageUrl: uploadResult.secure_url,
    };

    const creationResult = await createCategory(newCategoryData);
    if(creationResult.success){
      toast({ title: 'Succès', description: `La catégorie "${newCategoryData.name}" a été créée.` });
      setNewCategoryName('');
      (event.target as HTMLFormElement).reset();
      fetchAllData();
    } else {
      toast({ title: 'Erreur', description: creationResult.error || 'La création de la catégorie a échoué.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Cela pourrait affecter les produits existants.')) return;
    try {
      await deleteCategory(categoryId);
      toast({ title: 'Succès', description: 'Catégorie supprimée.' });
      fetchAllData();
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast({ title: 'Erreur', description: 'La suppression de la catégorie a échoué.', variant: 'destructive' });
    }
  };

  const handleCreatePromoCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const code = (formData.get('promo-code') as string).toUpperCase();
    const type = formData.get('promo-type') as 'percentage' | 'fixed';
    const value = Number(formData.get('promo-value'));

    if (!code || !type || isNaN(value) || value <= 0) {
      toast({ title: 'Données invalides', description: 'Veuillez remplir tous les champs correctement.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    
    const newPromoCode: Omit<PromoCode, 'id'> = {
      code,
      discountType: type,
      value,
      isActive: true,
    };

    const result = await createPromoCode(newPromoCode);

    if (result.success) {
      toast({ title: 'Succès', description: 'Code promo créé.' });
      (event.target as HTMLFormElement).reset();
      fetchAllData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }

    setIsSubmitting(false);
  }

  const handleTogglePromoCode = async (id: string, currentStatus: boolean) => {
    const result = await togglePromoCodeStatus(id, currentStatus);
    if (result.success) {
      toast({ title: 'Succès', description: 'Statut du code promo mis à jour.' });
      fetchAllData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
  }

  const handleDeletePromoCode = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) return;
    const result = await removePromoCode(id);
    if (result.success) {
      toast({ title: 'Succès', description: 'Code promo supprimé.' });
      fetchAllData();
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    }
  }

  const handleValidationCodeChange = (orderId: string, code: string) => {
    setValidationCodes(prev => ({ ...prev, [orderId]: code }));
  }

  const handleValidateDelivery = async (orderId: string) => {
    const code = validationCodes[orderId];
    if (!code || code.length !== 6) {
      toast({ title: 'Code invalide', description: 'Veuillez entrer un code à 6 chiffres.', variant: 'destructive' });
      return;
    }

    try {
      const result = await validateOrderDelivery(orderId, code);
      if (result.success) {
        toast({ title: 'Succès', description: 'Livraison validée et statut mis à jour.' });
        fetchAllData();
      } else {
        toast({ title: 'Échec', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error("Failed to validate delivery:", error);
      toast({ title: 'Erreur', description: 'La validation a échoué.', variant: 'destructive' });
    }
  }

  const getStatusVariant = (status: OrderStatus) => {
    switch (status) {
      case 'Prêt':
        return 'default';
      case 'Livré':
        return 'secondary';
      case 'Annulé':
        return 'destructive';
      case 'En attente':
      default:
        return 'outline';
    }
  };

  const renderContent = () => {
    if (isLoading) {
       return (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    switch(activeView) {
      case 'dashboard':
        return (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">XOF {stats.totalRevenue.toLocaleString('fr-FR')}</div>
                      <p className="text-xs text-muted-foreground">Basé sur les commandes livrées</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Commandes en attente</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                      <p className="text-xs text-muted-foreground">Commandes à préparer</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{stats.totalProducts}</div>
                      <p className="text-xs text-muted-foreground">Articles dans la boutique</p>
                  </CardContent>
              </Card>
          </div>
        );
      case 'orders':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Commandes en cours</CardTitle>
                <CardDescription>Visualisez et mettez à jour le statut des commandes récentes.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Accordion type="single" collapsible className="w-full">
                  {orders.filter((o) => o.status === 'En attente' || o.status === 'Prêt').map((order) => (
                    <AccordionItem value={order.id} key={order.id} className="border-b">
                      <AccordionTrigger className="flex justify-between items-center w-full p-4 hover:bg-muted/50">
                        <div className="flex-1 text-left">
                          <span className="font-medium">#{order.id.substring(0, 6)}...</span> - <span>{order.customerName}</span>
                        </div>
                        <div className="flex-1 text-left hidden md:block">{new Date(order.date).toLocaleDateString('fr-FR')}</div>
                        <div className="flex-1 text-left hidden sm:block">{`XOF ${order.total.toLocaleString('fr-FR')}`}</div>
                        <div className="flex-1 text-center"><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 bg-muted/20">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <h4 className="font-semibold mb-2">Informations client</h4>
                              <p><strong>Adresse:</strong> {order.customerAddress}</p>
                              <p><strong>Téléphone:</strong> {order.customerPhone}</p>
                              {order.customerEmail && <p><strong>Email:</strong> {order.customerEmail}</p>}
                            </div>
                             <div>
                              <h4 className="font-semibold mb-2">Changer le statut</h4>
                               <Select
                                  value={order.status}
                                  onValueChange={(newStatus: OrderStatus) =>
                                    handleStatusChange(order.id, newStatus)
                                  }
                                >
                                  <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="Changer statut" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="En attente">En attente</SelectItem>
                                    <SelectItem value="Prêt">Prêt</SelectItem>
                                    <SelectItem value="Livré">Livré</SelectItem>
                                    <SelectItem value="Annulé">Annulé</SelectItem>
                                  </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Validation Livraison</h4>
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="text"
                                    placeholder="Code..."
                                    maxLength={6}
                                    value={validationCodes[order.id] || ''}
                                    onChange={(e) => handleValidationCodeChange(order.id, e.target.value)}
                                  />
                                  <Button onClick={() => handleValidateDelivery(order.id)}>Valider</Button>
                                </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Articles commandés</h4>
                            <div className="space-y-2">
                              {order.items.map(item => (
                                <div key={item.id} className="flex items-center gap-4 text-sm p-2 rounded-md bg-background">
                                    <Image src={item.product.gridImage.url} alt={item.product.name} width={40} height={40} className="rounded-md object-cover" />
                                    <div>
                                        <p className="font-medium">{item.product.name}</p>
                                        <p className="text-muted-foreground">Taille: {item.size} | Couleur: {item.color} | Qté: {item.quantity}</p>
                                    </div>
                                    <p className="ml-auto font-medium">{`XOF ${item.product.price.toLocaleString('fr-FR')}`}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                 </Accordion>
                 {orders.filter((o) => o.status === 'En attente' || o.status === 'Prêt').length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Aucune commande en cours.</p>
                 )}
              </CardContent>
            </Card>
            
            <Card className="mt-8">
              <CardHeader>
                  <CardTitle>Historique des commandes</CardTitle>
                  <CardDescription>Consultez les commandes terminées ou annulées.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {orders
                      .filter((o) => o.status === 'Livré' || o.status === 'Annulé')
                      .map((order) => (
                        <AccordionItem value={order.id} key={order.id} className="border-b">
                           <AccordionTrigger className="flex justify-between items-center w-full p-4 hover:bg-muted/50">
                                <div className="flex-1 text-left">
                                  <span className="font-medium">#{order.id.substring(0, 6)}...</span> - <span>{order.customerName}</span>
                                </div>
                                <div className="flex-1 text-left hidden md:block">{new Date(order.date).toLocaleDateString('fr-FR')}</div>
                                <div className="flex-1 text-left hidden sm:block">{`XOF ${order.total.toLocaleString('fr-FR')}`}</div>
                                <div className="flex-1 text-center"><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></div>
                           </AccordionTrigger>
                           <AccordionContent className="p-4 bg-muted/20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                    <h4 className="font-semibold mb-2">Informations client</h4>
                                    <p><strong>Adresse de livraison:</strong> {order.customerAddress}</p>
                                    <p><strong>Téléphone:</strong> {order.customerPhone}</p>
                                    {order.customerEmail && <p><strong>Email:</strong> {order.customerEmail}</p>}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2">Statut final</h4>
                                        <Badge variant={getStatusVariant(order.status)} className="text-base">{order.status}</Badge>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <h4 className="font-semibold mb-2">Articles commandés</h4>
                                    <div className="space-y-2">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-center gap-4 text-sm p-2 rounded-md bg-background">
                                            <Image src={item.product.gridImage.url} alt={item.product.name} width={40} height={40} className="rounded-md object-cover" />
                                            <div>
                                                <p className="font-medium">{item.product.name}</p>
                                                <p className="text-muted-foreground">Taille: {item.size} | Couleur: {item.color} | Qté: {item.quantity}</p>
                                            </div>
                                            <p className="ml-auto font-medium">{`XOF ${item.product.price.toLocaleString('fr-FR')}`}</p>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                           </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                  {orders.filter((o) => o.status === 'Livré' || o.status === 'Annulé').length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Aucun historique de commande.</p>
                  )}
              </CardContent>
            </Card>
          </>
        );
      case 'products':
         return (
            <Card>
              <CardHeader>
                  <CardTitle>Tous les produits</CardTitle>
                  <CardDescription>Gérez les produits existants dans votre boutique.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Nom du Produit</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Tailles</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shoes.map((shoe) => (
                      <TableRow key={shoe.id}>
                        <TableCell>
                          {imageErrors[shoe.id] || !shoe.gridImage?.url ? (
                            <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          ) : (
                            <Image
                              src={shoe.gridImage.url}
                              alt={shoe.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                              onError={() => setImageErrors(prev => ({...prev, [shoe.id]: true}))}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{shoe.name}</TableCell>
                        <TableCell>{`XOF ${shoe.price.toLocaleString('fr-FR')}`}</TableCell>
                        <TableCell>{shoe.availableSizes.join(', ')}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleEditProduct(shoe)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteProduct(shoe.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
         );
      case 'create':
        return (
            <Card>
              <CardHeader>
                  <CardTitle>Ajouter un nouveau produit</CardTitle>
                  <CardDescription>Remplissez le formulaire ci-dessous pour créer un nouveau produit.</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={formRef} className="space-y-6" onSubmit={handleCreateProduct}>
                  <div className="space-y-2">
                    <Label htmlFor="product-name">Nom du produit</Label>
                    <Input id="product-name" name="product-name" placeholder="Ex: Urban Stride Sneaker" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-description">Description</Label>
                    <Textarea id="product-description" name="product-description" placeholder="Description détaillée du produit..." />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="product-price">Prix (XOF)</Label>
                        <Input id="product-price" name="product-price" type="number" placeholder="Ex: 45000" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product-category">Catégorie</Label>
                        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                          <SelectTrigger id="product-category">
                            <SelectValue placeholder="Sélectionner une catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label>Tailles disponibles</Label>
                      <Input name="product-sizes" placeholder="Ex: 39, 40, 41, 42" />
                      <p className="text-sm text-muted-foreground">Séparez les tailles par des virgules.</p>
                  </div>
                  
                  <div className="space-y-4 rounded-md border p-4">
                      <Label className="font-semibold">Couleurs disponibles</Label>
                      <div className="flex items-center gap-4">
                          <div className="flex-grow space-y-2">
                              <Label htmlFor="color-name">Nom de la couleur</Label>
                              <Input 
                                  id="color-name"
                                  placeholder="Ex: Onyx Black" 
                                  value={currentColorName} 
                                  onChange={e => setCurrentColorName(e.target.value)} 
                              />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="color-hex">Nuancier</Label>
                              <Input 
                                  id="color-hex"
                                  type="color" 
                                  value={currentColorHex} 
                                  onChange={e => setCurrentColorHex(e.target.value)}
                                  className="p-1 h-10"
                              />
                          </div>
                          <Button type="button" onClick={handleAddColor} className="self-end">Ajouter</Button>
                      </div>
                      {newProductColors.length > 0 && (
                          <div className="space-y-2">
                              <p className="text-sm font-medium">Couleurs ajoutées :</p>
                              <div className="flex flex-wrap gap-2">
                                  {newProductColors.map(color => (
                                      <Badge key={color.name} variant="secondary" className="flex items-center gap-2">
                                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.hex }} />
                                          <span>{color.name}</span>
                                          <button onClick={() => handleRemoveColor(color.name)} className="rounded-full hover:bg-muted-foreground/20">
                                              <X className="h-3 w-3" />
                                          </button>
                                      </Badge>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-image">Image principale</Label>
                    <Input id="product-image" name="product-image" type="file" accept="image/*" />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : 'Créer le produit'}
                    </Button>
                </form>
              </CardContent>
            </Card>
        );
      case 'categories':
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Ajouter une catégorie</CardTitle>
                  <CardDescription>Créez une nouvelle catégorie de produits.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-name">Nom de la catégorie</Label>
                      <Input 
                        id="category-name" 
                        name="category-name"
                        placeholder="Ex: Sandales"
                      />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="category-image">Image de la catégorie</Label>
                        <Input id="category-image" name="category-image" type="file" accept="image/*" />
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : 'Créer la catégorie'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Catégories existantes</CardTitle>
                  <CardDescription>Gérez les catégories actuelles.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell>
                              {category.imageUrl ? (
                                <Image
                                  src={category.imageUrl}
                                  alt={category.name}
                                  width={40}
                                  height={40}
                                  className="rounded-md object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md">
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="destructive" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
        );
      case 'promo':
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                  <CardHeader>
                      <CardTitle>Créer un code promo</CardTitle>
                      <CardDescription>Configurez de nouveaux codes de réduction pour votre boutique.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <form onSubmit={handleCreatePromoCode} className="space-y-6">
                          <div className="space-y-2">
                              <Label htmlFor="promo-code">Code Promo</Label>
                              <Input id="promo-code" name="promo-code" placeholder="Ex: SUMMER20" className="uppercase"/>
                          </div>
                           <div className="space-y-2">
                              <Label htmlFor="promo-type">Type de réduction</Label>
                              <Select name="promo-type" defaultValue="percentage">
                                  <SelectTrigger id="promo-type">
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                                      <SelectItem value="fixed">Montant Fixe (XOF)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                           <div className="space-y-2">
                              <Label htmlFor="promo-value">Valeur</Label>
                              <Input id="promo-value" name="promo-value" type="number" placeholder="Ex: 10 ou 5000" />
                          </div>
                          <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : 'Créer le code promo'}
                          </Button>
                      </form>
                  </CardContent>
              </Card>
               <Card>
                <CardHeader>
                  <CardTitle>Codes promo existants</CardTitle>
                  <CardDescription>Activez, désactivez ou supprimez les codes de réduction.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Valeur</TableHead>
                        <TableHead>Actif</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promoCodes.map((promo) => (
                        <TableRow key={promo.id}>
                          <TableCell className="font-medium uppercase">{promo.code}</TableCell>
                          <TableCell>
                            {promo.discountType === 'percentage' 
                              ? `${promo.value}%` 
                              : `${promo.value.toLocaleString('fr-FR')} XOF`}
                          </TableCell>
                           <TableCell>
                            <Switch
                              checked={promo.isActive}
                              onCheckedChange={() => handleTogglePromoCode(promo.id, promo.isActive)}
                              aria-label="Activer ou désactiver le code promo"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                              <Button variant="destructive" size="icon" onClick={() => handleDeletePromoCode(promo.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {promoCodes.length === 0 && <p className="text-center text-muted-foreground pt-4">Aucun code promo créé.</p>}
                </CardContent>
              </Card>
            </div>
        );
      default:
        return null;
    }
  }

  if (isUserLoading || !isAuthorized) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <SidebarProvider>
        <Sidebar>
            <SidebarHeader>
                 <h1 className="text-xl font.headline font-bold text-primary">Amani'store</h1>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild variant="outline">
                           <Link href="/">
                              <Home />
                              Retour à l'accueil
                           </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarSeparator />
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => setActiveView('dashboard')} isActive={activeView === 'dashboard'}>
                            <LayoutDashboard />
                            Tableau de bord
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton onClick={() => setActiveView('orders')} isActive={activeView === 'orders'}>
                            <ListOrdered />
                            Commandes
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton onClick={() => setActiveView('products')} isActive={activeView === 'products'}>
                           <ShoppingCart />
                           Produits
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton onClick={() => setActiveView('create')} isActive={activeView === 'create'}>
                            <Package />
                            Créer un produit
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton onClick={() => setActiveView('categories')} isActive={activeView === 'categories'}>
                            <Tag />
                            Catégories
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton onClick={() => setActiveView('promo')} isActive={activeView === 'promo'}>
                            <Ticket />
                            Codes Promo
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>

        <SidebarInset>
            <div className="container mx-auto py-10 px-4 md:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-6">
                     <h1 className="text-3xl font-bold capitalize">{activeView.replace('create', 'Créer un produit')}</h1>
                     <SidebarTrigger className="md:hidden"/>
                </div>
                {renderContent()}
            </div>
        </SidebarInset>

        {editingShoe && (
            <EditProductModal
            shoe={editingShoe}
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            categories={categories}
            onProductUpdate={() => {
                fetchAllData();
                setIsEditModalOpen(false);
            }}
            />
        )}
    </SidebarProvider>
  );
};

export default AdminDashboard;
