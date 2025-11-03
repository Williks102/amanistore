
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
  id: string; 
  name: string;
  imageId: string;
  imageUrl?: string;
};

export type Collection = {
  id: string;
  name: string;
  imageUrl: string;
  categoryIds: string[];
};

export type Shoe = {
  id: string; 
  name:string;
  description: string;
  price: number;
  categoryId: string; 
  collectionIds: string[]; // Made this field mandatory
  gridImage: ShoeImage;
  availableSizes: number[];
  availableColors: ShoeColor[];
  detailImages: ShoeImage[];
};

export type CartItem = {
  id: string; 
  product: Shoe;
  quantity: number;
  size: number;
  color: string;
};

export type OrderStatus = 'En attente' | 'Prêt' | 'Livré' | 'Annulé';

export type Order = {
  id: string;
  userId: string; 
  customerName: string;
  customerPhone: string; 
  customerEmail?: string; 
  customerAddress: string; 
  date: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  validationCode: string; 
};

export type PromoCode = {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
};
