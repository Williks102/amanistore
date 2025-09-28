import type { Order } from './types';
import { shoes } from './data';

// Mock data for orders
export const initialOrders: Order[] = [
  {
    id: 'ORD001',
    customerName: 'Arona Ndiaye',
    date: '2024-08-14',
    items: [
      {
        id: `${shoes[0].id}-42-Onyx Black`,
        product: shoes[0],
        quantity: 1,
        size: 42,
        color: 'Onyx Black',
      },
      {
        id: `${shoes[2].id}-41-Crimson Red`,
        product: shoes[2],
        quantity: 1,
        size: 41,
        color: 'Crimson Red',
      },
    ],
    total: 107000,
    status: 'En attente',
  },
  {
    id: 'ORD002',
    customerName: 'Awa Fall',
    date: '2024-08-13',
    items: [
      {
        id: `${shoes[1].id}-43-Mahogany Brown`,
        product: shoes[1],
        quantity: 1,
        size: 43,
        color: 'Mahogany Brown',
      },
    ],
    total: 75000,
    status: 'Prêt',
  },
  {
    id: 'ORD003',
    customerName: 'Moussa Diop',
    date: '2024-08-12',
    items: [
      {
        id: `${shoes[0].id}-40-Cloud White`,
        product: shoes[0],
        quantity: 2,
        size: 40,
        color: 'Cloud White',
      },
    ],
    total: 90000,
    status: 'Livré',
  },
  {
    id: 'ORD004',
    customerName: 'Fatou Sene',
    date: '2024-08-11',
    items: [
      {
        id: `${shoes[2].id}-39-Ocean Blue`,
        product: shoes[2],
        quantity: 1,
        size: 39,
        color: 'Ocean Blue',
      },
    ],
    total: 62000,
    status: 'Annulé',
  },
];
