

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
  id: string; // Changed to string for Firestore ID
  name: string;
  imageId: string;
  imageUrl?: string;
};

export type Shoe = {
  id: string; // Changed to string for Firestore ID
  name:string;
  description: string;
  price: number;
  categoryId: string; // Changed to string for Firestore ID
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
  customerPhone: string; // Ajout du téléphone
  customerEmail?: string; // Email optionnel
  customerAddress: string; // Ajout de l'adresse
  date: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
};

    
