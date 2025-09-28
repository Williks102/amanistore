'use client';

import { create } from 'zustand';
import type { Shoe, CartItem } from '@/lib/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  addItem: (product: Shoe, quantity: number, size: number, color: string) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
  addItem: (product, quantity, size, color) => {
    const { items } = get();
    const existingItemIndex = items.findIndex(
      (item) => item.product.id === product.id && item.size === size && item.color === color
    );

    if (existingItemIndex > -1) {
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += quantity;
      set({ items: updatedItems });
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${size}-${color}`,
        product,
        quantity,
        size,
        color,
      };
      set({ items: [...items, newItem] });
    }
  },
  removeItem: (itemId) => {
    set({ items: get().items.filter((item) => item.id !== itemId) });
  },
  clearCart: () => set({ items: [] }),
}));
