
'use client';

import React, { useState } from 'react';
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
import { initialOrders } from '@/lib/orders';
import type { Order, OrderStatus, Shoe } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { shoes as initialShoes } from '@/lib/data';
import Image from 'next/image';

const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [shoes, setShoes] = useState<Shoe[]>(initialShoes);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

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

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Tableau de bord administrateur</h1>

      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="orders">Commandes</TabsTrigger>
          <TabsTrigger value="products">Produit</TabsTrigger>
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
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
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
                          <p className="font-semibold">{order.id} - {order.customerName}</p>
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
                        <Button variant="outline" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon">
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
              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Nom du produit</Label>
                  <Input id="product-name" placeholder="Ex: Urban Stride Sneaker" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-description">Description</Label>
                  <Textarea id="product-description" placeholder="Description détaillée du produit..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-price">Prix (XOF)</Label>
                      <Input id="product-price" type="number" placeholder="Ex: 45000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-category">Catégorie</Label>
                      <Select>
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
                    <Input placeholder="Ex: 39, 40, 41, 42" />
                    <p className="text-sm text-muted-foreground">Séparez les tailles par des virgules.</p>
                </div>
                 <div className="space-y-2">
                    <Label>Couleurs disponibles</Label>
                    <Input placeholder="Ex: Onyx Black:#353839, Cloud White:#F5F5F5" />
                    <p className="text-sm text-muted-foreground">Format: Nom:code_hexa, séparés par des virgules.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-image">URL de l'image principale</Label>
                  <Input id="product-image" placeholder="https://..." />
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
