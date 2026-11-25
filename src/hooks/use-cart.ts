
'use client';

import { create } from 'zustand';
import type { Shoe, CartItem, Selection } from '@/lib/types';
import { lineKey } from '@/lib/cart-line';
import { persist, createJSONStorage } from 'zustand/middleware';


interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isCheckoutOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  addItem: (product: Shoe, quantity: number, selection: Selection) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCart = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            isCheckoutOpen: false,
            onOpen: () => set({ isOpen: true }),
            onClose: () => set({ isOpen: false }),
            openCheckout: () => set({ isCheckoutOpen: true }),
            closeCheckout: () => set({ isCheckoutOpen: false }),
            addItem: (product, quantity, selection) => {
                const { items } = get();
                const candidate: CartItem = { id: `${product.id}-${selection.map((s) => s.value).join('-')}`, product, quantity, selection };
                const key = lineKey(candidate);
                const existingItemIndex = items.findIndex((item) => lineKey(item) === key);

                if (existingItemIndex > -1) {
                    const updatedItems = [...items];
                    updatedItems[existingItemIndex] = { ...updatedItems[existingItemIndex], quantity: updatedItems[existingItemIndex].quantity + quantity };
                    set({ items: updatedItems });
                } else {
                    set({ items: [...items, candidate] });
                }
            },
            removeItem: (itemId) => {
                set({ items: get().items.filter((item) => item.id !== itemId) });
            },
            updateItemQuantity: (itemId: string, quantity: number) => {
                set({
                    items: get().items.map((item) =>
                        item.id === itemId ? { ...item, quantity: Math.max(0, quantity) } : item
                    ).filter(item => item.quantity > 0)
                });
            },
            clearCart: () => set({ items: [] }),
        }),
        {
            name: 'cart-storage',
            storage: createJSONStorage(() => localStorage)
        }
    )
);
