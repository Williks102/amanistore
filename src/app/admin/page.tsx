
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import type { Order, OrderStatus, Shoe, ShoeColor } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { getOrders, updateOrderStatus } from '@/services/orderService';
import { getProducts, addProduct, deleteProduct } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [newProductColors, setNewProductColors] = useState<ShoeColor[]>([]);
  const [currentColorName, setCurrentColorName] = useState('');
  const [currentColorHex, setCurrentColorHex] = useState('#000000');
  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedProducts] = await Promise.all([
        getOrders(),
        getProducts()
      ]);
      setOrders(fetchedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setShoes(fetchedProducts);
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
    fetchAllData();
  }, [fetchAllData]);

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
      
    const formData = new FormData(event.currentTarget);
    const name = formData.get('product-name') as string;
    const description = formData.get('product-description') as string;
    const priceStr = formData.get('product-price') as string;
    const sizesStr = formData.get('product-sizes') as string;
    const imageUrl = formData.get('product-image') as string;

    // --- Validation renforcée ---
    if (!name || !description || !priceStr || !sizesStr || !imageUrl) {
      toast({ title: 'Formulaire incomplet', description: 'Veuillez remplir tous les champs.', variant: 'destructive' });
      return;
    }
    if (!selectedCategoryId) {
        toast({ title: 'Erreur de validation', description: 'Veuillez sélectionner une catégorie.', variant: 'destructive' });
        return;
    }
    const price = Number(priceStr);
    if (isNaN(price) || price <= 0) {
      toast({ title: 'Erreur de validation', description: 'Veuillez entrer un prix valide.', variant: 'destructive' });
      return;
    }
    const availableSizes = sizesStr.split(',').map(s => Number(s.trim())).filter(s => !isNaN(s) && s > 0);
    if (availableSizes.length === 0) {
        toast({ title: 'Erreur de validation', description: 'Veuillez entrer au moins une taille valide.', variant: 'destructive' });
        return;
    }
    if (newProductColors.length === 0) {
      toast({ title: 'Aucune couleur', description: 'Veuillez ajouter au moins une couleur disponible.', variant: 'destructive' });
      return;
    }
    // --- Fin de la validation ---

    const newShoeData = {
        name: name,
        description: description,
        price: price,
        categoryId: Number(selectedCategoryId),
        availableSizes: availableSizes,
        availableColors: newProductColors,
        gridImage: { id: "placeholder", url: imageUrl, hint: "shoe" },
        detailImages: [{ id: "placeholder", url: imageUrl, hint: "shoe" }]
    };

    try {
        await addProduct(newShoeData as any);
        toast({ title: 'Succès', description: 'Produit créé avec succès !' });
        event.currentTarget.reset();
        setSelectedCategoryId('');
        setNewProductColors([]);
        fetchAllData(); // Re-fetch all data to show the new product
    } catch (error) {
        console.error("Failed to create product:", error);
        toast({ title: 'Erreur', description: 'La création du produit a échoué. Vérifiez la console pour les détails.', variant: 'destructive' });
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

  if (isLoading) {
    return <div className="container mx-auto py-10">Chargement du tableau de bord...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Tableau de bord administrateur</h1>

      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Commandes</TabsTrigger>
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger value="create">Créer un produit</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Commandes en cours</CardTitle>
              <CardDescription>Visualisez et mettez à jour le statut des commandes récentes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commande ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.filter((o) => o.status === 'En attente' || o.status === 'Prêt').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id.substring(0,6)}...</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{new Date(order.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{`XOF ${order.total.toLocaleString('fr-FR')}`}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={order.status}
                          onValueChange={(newStatus: OrderStatus) =>
                            handleStatusChange(order.id, newStatus)
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Changer statut" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="En attente">En attente</SelectItem>
                            <SelectItem value="Prêt">Prêt</SelectItem>
                            <SelectItem value="Livré">Livré</SelectItem>
                            <SelectItem value="Annulé">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
           <Card className="mt-8">
            <CardHeader>
                <CardTitle>Historique des commandes</CardTitle>
                 <CardDescription>Consultez les commandes terminées ou annulées.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                  {orders
                    .filter((o) => o.status === 'Livré' || o.status === 'Annulé')
                    .map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{order.id.substring(0,6)}... - {order.customerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.date).toLocaleDateString('fr-FR')} - {`XOF ${order.total.toLocaleString('fr-FR')}`}
                          </p>
                        </div>
                         <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                      </div>
                    ))}
                </div>
            </CardContent>
           </Card>

        </TabsContent>

        <TabsContent value="products" className="mt-6">
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
                        <Image
                          src={shoe.gridImage.url}
                          alt={shoe.name}
                          width={40}
                          height={40}
                          className="rounded-md object-cover"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{shoe.name}</TableCell>
                      <TableCell>{`XOF ${shoe.price.toLocaleString('fr-FR')}`}</TableCell>
                      <TableCell>{shoe.availableSizes.join(', ')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" disabled>
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
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <Card>
             <CardHeader>
                <CardTitle>Ajouter un nouveau produit</CardTitle>
                 <CardDescription>Remplissez le formulaire ci-dessous pour créer un nouveau produit.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleCreateProduct}>
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
                          <SelectItem value="1">Sneakers</SelectItem>
                          <SelectItem value="2">Formal</SelectItem>
                          <SelectItem value="3">Sport</SelectItem>
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
                  <Label htmlFor="product-image">URL de l'image principale</Label>
                  <Input id="product-image" name="product-image" placeholder="https://..." />
                </div>
                 <Button type="submit">Créer le produit</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;

    