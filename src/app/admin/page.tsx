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
import type { Order, OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

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

      <div className="rounded-lg border">
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
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Historique des commandes</h2>
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
      </div>
    </div>
  );
};

export default AdminDashboard;
