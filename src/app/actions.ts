'use server';

import { getShoeRecommendations } from '@/ai/flows/shoe-style-recommendation';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import type { Shoe, Category, PromoCode, Order, Collection } from '@/lib/types';
import { adminDb } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ShoeRecommendationInputSchema = z.object({
  shoeDescription: z.string(),
});

export async function fetchShoeRecommendations(
  input: z.infer<typeof ShoeRecommendationInputSchema>
) {
  try {
    const validatedInput = ShoeRecommendationInputSchema.parse(input);
    const result = await getShoeRecommendations(validatedInput);
    return { recommendations: result.recommendations };
  } catch (error) {
    console.error('Error fetching shoe recommendations:', error);
    return { recommendations: [], error: 'Failed to fetch recommendations.' };
  }
}

export async function uploadImage(formData: FormData) {
  const file = formData.get('image') as File | null;

  if (!file) {
    return { error: 'Aucun fichier fourni.' };
  }
   if (file.size === 0) {
    return { error: 'Le fichier est vide.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const results = await new Promise<{ secure_url: string } | { error: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        resource_type: 'auto',
        quality: 'auto'
      }, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (result) {
          resolve({ secure_url: result.secure_url });
        } else {
           reject(new Error('Le résultat de l\'upload de Cloudinary est indéfini.'));
        }
      }).end(buffer);
    });

    if ('secure_url' in results) {
       return { secure_url: results.secure_url };
    } else {
       console.error('Cloudinary upload error:', results.error);
       return { error: `Échec de l'upload sur Cloudinary. Détails : ${results.error?.message || 'Erreur inconnue'}` };
    }

  } catch (error: any) {
    console.error('Image upload failed:', error);
    return { error: `Échec de la conversion du fichier ou de l'upload. Détails : ${error.message || 'Erreur inconnue'}` };
  }
}

// ============ PRODUCT ACTIONS ============
export async function createProduct(newShoeData: Omit<Shoe, 'id'>) {
    try {
        if (!adminDb) {
            return { success: false, error: 'Connexion à la base de données administrateur a échoué.' };
        }
        const docRef = await adminDb.collection('shoes').add(newShoeData);
        return { success: true, productId: docRef.id };
    } catch (error: any) {
        console.error('Error creating product:', error);
        return { success: false, error: error.message || 'Erreur lors de la création du produit' };
    }
}

export async function updateProduct(shoeId: string, updatedShoeData: Partial<Shoe>) {
    try {
        if (!adminDb) {
            return { success: false, error: 'Connexion à la base de données administrateur a échoué.' };
        }
        await adminDb.collection('shoes').doc(shoeId).update(updatedShoeData);
        return { success: true };
    } catch (error: any) {
        console.error('Error updating product:', error);
        return { success: false, error: error.message || 'Erreur lors de la mise à jour du produit' };
    }
}

// ============ CATEGORY ACTIONS ============
export async function createCategory(categoryData: Omit<Category, 'id'>) {
    try {
        if (!adminDb) {
            return { success: false, error: 'Connexion à la base de données administrateur a échoué.' };
        }
        const docRef = await adminDb.collection('categories').add(categoryData);
        return { success: true, categoryId: docRef.id };
    } catch (error: any) {
        console.error("Erreur lors de la création de la catégorie:", error);
        return { success: false, error: error.message || 'Impossible de créer la catégorie.' };
    }
}

// ============ COLLECTION ACTIONS ============
export async function createCollection(collectionData: Omit<Collection, 'id'>) {
    if (!adminDb) {
        return { success: false, error: 'Connexion à la base de données administrateur a échoué.' };
    }
    try {
        const docRef = await adminDb.collection('collections').add(collectionData);
        return { success: true, collectionId: docRef.id };
    } catch (error: any) {
        console.error("Erreur lors de la création de la collection:", error);
        return { success: false, error: error.message || 'Impossible de créer la collection.' };
    }
}

export async function deleteCollection(collectionId: string) {
    try {
        if (!adminDb) {
            return { success: false, error: 'Connexion à la base de données administrateur a échoué.' };
        }
        await adminDb.collection('collections').doc(collectionId).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Erreur lors de la suppression de la collection:", error);
        return { success: false, error: error.message || 'Impossible de supprimer la collection.' };
    }
}

export async function getCollectionsForClient(): Promise<{ collections: Collection[] | null; error?: string }> {
  if (!adminDb) {
    return { collections: null, error: 'Connexion à la base de données administrateur a échoué.' };
  }
  try {
    const snapshot = await adminDb.collection('collections').get();
    const collections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Collection[];
    return { collections };
  } catch (error: any) {
    console.error("Erreur lors de la récupération des collections:", error);
    return { collections: null, error: 'Impossible de récupérer les collections.' };
  }
}

// ============ PROMO CODE ACTIONS ============
export async function createPromoCode(promoCodeData: Omit<PromoCode, 'id'>) {
    try {
        if (!adminDb) {
            return { success: false, error: 'Connexion à la base de données administrateur a échoué.' };
        }
        const docRef = await adminDb.collection('promoCodes').add(promoCodeData);
        return { success: true, promoCodeId: docRef.id };
    } catch (error: any) {
        console.error("Erreur lors de la création du code promo:", error);
        return { success: false, error: error.message || 'Impossible de créer le code promo.' };
    }
}

export async function togglePromoCodeStatus(promoCodeId: string, isActive: boolean) {
    try {
        if (!adminDb) {
            return { success: false, error: 'Connexion à la base de données administrateur a échoué.' };
        }
        await adminDb.collection('promoCodes').doc(promoCodeId).update({ isActive });
        return { success: true };
    } catch (error: any) {
        console.error("Erreur lors de la mise à jour du statut du code promo:", error);
        return { success: false, error: error.message || 'Impossible de mettre à jour le statut.' };
    }
}

export async function removePromoCode(promoCodeId: string) {
    try {
        if (!adminDb) {
            return { success: false, error: 'Connexion à la base de données administrateur a échoué.' };
        }
        await adminDb.collection('promoCodes').doc(promoCodeId).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Erreur lors de la suppression du code promo:", error);
        return { success: false, error: error.message || 'Impossible de supprimer le code promo.' };
    }
}

export async function validatePromoCode(code: string): Promise<{
  success: boolean;
  promoCode?: PromoCode;
  error?: string;
}> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Connexion à la base de données administrateur a échoué.' };
    }
    
    const snapshot = await adminDb.collection('promoCodes')
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: 'Code promo invalide.' };
    }

    const promoDoc = snapshot.docs[0];
    const promoCode = { id: promoDoc.id, ...promoDoc.data() } as PromoCode;

    if (!promoCode.isActive) {
      return { success: false, error: 'Ce code promo n\'est plus actif.' };
    }

    return { success: true, promoCode };
  } catch (error: any) {
    console.error('Erreur lors de la validation du code promo:', error);
    return { success: false, error: 'Une erreur est survenue lors de la validation du code promo.' };
  }
}

export async function applyPromoCode(code: string, cartTotal: number): Promise<{
  success: boolean;
  discount?: number;
  error?: string;
}> {
  try {
    if (!adminDb) {
        return { success: false, error: 'Connexion à la base de données administrateur a échoué.' };
    }
    
    const snapshot = await adminDb.collection('promoCodes')
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: 'Code promo invalide.' };
    }

    const promoDoc = snapshot.docs[0];
    const promo = { id: promoDoc.id, ...promoDoc.data() } as PromoCode;

    if (!promo.isActive) {
      return { success: false, error: 'Ce code promo n\'est plus actif.' };
    }

    let discount = 0;
    if (promo.discountType === 'percentage') {
      discount = (cartTotal * promo.value) / 100;
    } else {
      discount = promo.value;
    }

    return { success: true, discount };
  } catch (error: any) {
    console.error('Erreur lors de l\'application du code promo:', error);
    return { success: false, error: 'Une erreur est survenue lors de l\'application du code promo.' };
  }
}

// ============ CONTACT FORM ============
export async function submitContactForm(formData: { 
  name: string; 
  email: string; 
  subject: string; 
  message: string; 
}) {
  const { name, email, subject, message } = formData;
  
  if (!name || !email || !subject || !message) {
    return { success: false, error: 'Tous les champs sont requis.' };
  }
  
  console.log('New contact message:', { name, email, subject, message });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { success: true };
}

// ============ ORDER ACTIONS ============
export async function getOrderByCodeForValidation(code: string): Promise<{ order: Order | null; error?: string }> {
  if (!adminDb) {
    const errorMessage = 'La connexion à la base de données administrateur a échoué.';
    console.error(errorMessage);
    return { order: null, error: errorMessage };
  }
  try {
    const snapshot = await adminDb.collection('orders').where('validationCode', '==', code.trim()).limit(1).get();

    if (snapshot.empty) {
      return { order: null };
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    const date = data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString();
    
    const order = {
      ...data,
      id: doc.id,
      date: date,
    } as Order;

    return { order };
  } catch (error: any) {
    console.error("Erreur détaillée côté serveur lors de la recherche de commande:", error);
    return { order: null, error: 'Impossible de récupérer la commande.' };
  }
}

export async function validateOrderDelivery(orderId: string, code: string): Promise<{ success: boolean; error?: string }> {
    if (!adminDb) {
        return { success: false, error: "La connexion à la base de données administrateur a échoué." };
    }

    const orderDocRef = adminDb.collection('orders').doc(orderId);
    
    try {
        const docSnap = await orderDocRef.get();

        if (!docSnap.exists) {
            return { success: false, error: "Commande non trouvée." };
        }
        
        const order = docSnap.data() as Order;

        if (order.validationCode !== code.trim()) {
            return { success: false, error: "Le code de validation est incorrect." };
        }
        if (order.status === 'Livré') {
            return { success: false, error: 'Erreur : code déjà utilisé.' };
        }
        if (order.status === 'Annulé') {
            return { success: false, error: 'Cette commande a été annulée.' };
        }
        
        await orderDocRef.update({ status: 'Livré' });
        return { success: true };

    } catch (error: any) {
        console.error("Error validating delivery:", error);
        return { success: false, error: "Échec de la recherche ou de la mise à jour de la commande." };
    }
}

export async function getOrdersForUser(userId: string): Promise<{ orders: Order[] | null; error?: string }> {
  if (!userId) {
    return { orders: null, error: 'User ID non fourni.' };
  }
   if (!adminDb) {
    const errorMessage = 'La connexion à la base de données administrateur a échoué.';
    console.error(errorMessage);
    return { orders: null, error: errorMessage };
  }
  try {
    const snapshot = await adminDb.collection('orders').where('userId', '==', userId).get();

    if (snapshot.empty) {
      return { orders: [] };
    }

    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      const date = data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString();
      return {
        ...data,
        id: doc.id,
        date: date,
        validationCode: String(data.validationCode || '').trim()
      } as Order;
    });

    return { orders };
  } catch (error: any) {
    console.error("Erreur détaillée côté serveur lors de la récupération des commandes:", error);
    return { orders: null, error: 'Impossible de récupérer vos commandes.' };
  }
}

async function checkAdminPrivileges(uid: string): Promise<boolean> {
  if (!adminDb) return false;
  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (userDoc.exists && userDoc.data()?.role === 'admin') {
    return true;
  }
  const userAuth = await getAuth().getUser(uid);
  return userAuth.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
}