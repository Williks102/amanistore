
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
  /**
   * Stock par pointure (toutes couleurs confondues), ex: { "39": 5, "40": 0 }.
   * Absent = stock non suivi (illimité). Présent: une pointure absente de la table vaut 0.
   */
  stock?: Record<string, number>;
  /** « Coup de cœur »: mis en avant dans la sélection de l'accueil. */
  featured?: boolean;
  createdAt?: string;
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
  subtotal?: number;
  discount?: number;
  promoCode?: string;
  promoCodeId?: string;
  /** Commande passée sans compte. */
  guest?: boolean;
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
  /** Date d'expiration (ISO). Absent = n'expire pas. */
  expiresAt?: string;
  /** Nombre maximal d'utilisations. Absent = illimité. */
  maxUses?: number;
  usedCount?: number;
  /** Montant minimal du sous-total (XOF). */
  minOrderAmount?: number;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
};
