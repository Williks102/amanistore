
export type ShoeColor = {
  name: string;
  hex: string;
};

export type ShoeImage = {
  id: string;
  url: string;
  hint: string;
};

/** Attribut de produit créé dans l'admin (Pointure, Taille, Couleur, Matière…). */
export type AttributeKind = 'text' | 'color';
export type AttributeValue = { label: string; hex?: string };
export type Attribute = {
  id: string;
  name: string;
  kind: AttributeKind;
  values: AttributeValue[];
  position?: number;
};
/** Attribut utilisé par un produit, avec les valeurs proposées (nom copié: un renommage n'abîme pas les produits). */
export type ProductOption = {
  attributeId: string;
  name: string;
  kind: AttributeKind;
  values: string[];
  /** Codes couleur des valeurs (attribut de type couleur hors palette). */
  hexes?: Record<string, string>;
};
/** « Stock par combinaison » ou « par valeur du premier attribut » (partagé entre les valeurs du second). */
export type StockScope = 'combination' | 'attribute1';
/** Choix d'une cliente: une valeur par attribut du produit, ex: [{ name: 'Pointure', value: '40' }]. */
export type Selection = Array<{ name: string; value: string }>;

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
  /** Attributs du produit (0 à 2). Absent = produit ancien, lu à partir de availableSizes et availableColors. */
  options?: ProductOption[];
  stockScope?: StockScope;
  /** Stock par clé de combinaison (voir variantKey). Présent avec `options`; absent = stock non suivi. */
  variantStock?: Record<string, number>;
  /** « Coup de cœur »: mis en avant dans la sélection de l'accueil. */
  featured?: boolean;
  createdAt?: string;
};

export type CartItem = {
  id: string; 
  product: Shoe;
  quantity: number;
  /** Pointure et couleur (anciennes lignes, ou produit à Pointure + Couleur). Absents ou 0 / '' sinon (voir `selection`). */
  size?: number;
  color?: string;
  /** Choix par attribut, copie figée au moment de la commande (nom + valeur). */
  selection?: Selection;
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
