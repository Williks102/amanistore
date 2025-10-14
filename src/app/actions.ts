
'use server';

import { getShoeRecommendations } from '@/ai/flows/shoe-style-recommendation';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import { updateProduct as updateProductInDb, addProduct as addProductInDb } from '@/services/productService';
import { addCategory as addCategoryInDb } from '@/services/categoryService';
import { getPromoCodeByCode, addPromoCode as addPromoCodeInDb, updatePromoCode as updatePromoCodeInDb, deletePromoCode as deletePromoCodeInDb } from '@/services/promoCodeService';
import type { Shoe, Category, PromoCode, Order } from '@/lib/types';
import { adminDb } from '@/firebase/admin';


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

export async function createProduct(newShoeData: Omit<Shoe, 'id'>) {
    try {
        const productId = await addProductInDb(newShoeData);
        return { success: true, productId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateProduct(shoeId: string, updatedShoeData: Partial<Shoe>) {
    try {
        await updateProductInDb(shoeId, updatedShoeData);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function createCategory(categoryData: Omit<Category, 'id'>) {
    try {
        const categoryId = await addCategoryInDb(categoryData);
        return { success: true, categoryId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function validatePromoCode(code: string) {
    try {
        const promoCode = await getPromoCodeByCode(code);
        if (promoCode && promoCode.isActive) {
            return { success: true, promoCode };
        }
        return { success: false, error: 'Code promo invalide ou expiré.' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createPromoCode(promoCodeData: Omit<PromoCode, 'id'>) {
    try {
        const existingCode = await getPromoCodeByCode(promoCodeData.code);
        if (existingCode) {
            return { success: false, error: 'Ce code promo existe déjà.' };
        }
        const promoCodeId = await addPromoCodeInDb(promoCodeData);
        return { success: true, promoCodeId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function togglePromoCodeStatus(id: string, currentStatus: boolean) {
    try {
        await updatePromoCodeInDb(id, { isActive: !currentStatus });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function removePromoCode(id: string) {
    try {
        await deletePromoCodeInDb(id);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendContactMessage(formData: FormData) {
  const name = formData.get('name');
  const email = formData.get('email');
  const subject = formData.get('subject');
  const message = formData.get('message');
  
  if (!name || !email || !subject || !message) {
    return { success: false, error: 'Veuillez remplir tous les champs.' };
  }
  
  console.log('New contact message:', { name, email, subject, message });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { success: true };
}


// This action runs on the server and has elevated privileges.
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


// This action runs on the server and has elevated privileges.
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
      // Firestore Timestamps need to be converted to serializable format (ISO string)
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
