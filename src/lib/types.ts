export type ShoeColor = {
  name: string;
  hex: string;
};

export type ShoeImage = {
  id: string;
  url: string;
  hint: string;
};

export type Category = {
  id: number;
  name: string;
};

export type Shoe = {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  gridImage: ShoeImage;
  availableSizes: number[];
  availableColors: ShoeColor[];
  detailImages: ShoeImage[];
};

export type CartItem = {
  id: string; // Unique ID for the cart item instance
  product: Shoe;
  quantity: number;
  size: number;
  color: string;
};

export type OrderStatus = 'En attente' | 'Prêt' | 'Livré' | 'Annulé';

export type Order = {
  id: string;
  customerName: string;
  date: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
};
