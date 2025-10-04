
'use server';

import { getShoeRecommendations } from '@/ai/flows/shoe-style-recommendation';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import { updateProduct as updateProductInDb, addProduct as addProductInDb } from '@/services/productService';
import { addCategory as addCategoryInDb } from '@/services/categoryService';
import { getPromoCodeByCode, addPromoCode as addPromoCodeInDb, updatePromoCode as updatePromoCodeInDb, deletePromoCode as deletePromoCodeInDb } from '@/services/promoCodeService';
import type { Shoe, Category, PromoCode, Order } from '@/lib/types';
import { getAdminApp } from '@/firebase/server-config';
import { getFirestore, collection, query, where, limit, getDocs, DocumentSnapshot, DocumentData } from 'firebase/firestore/lite';


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

const fromFirestoreToOrder = (snapshot: DocumentSnapshot<DocumentData>): Order => {
    const data = snapshot.data();
    if (!data) throw new Error("Document data is undefined.");
    const date = data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString();
    return {
        ...data,
        id: snapshot.id,
        date: date,
    } as Order;
};

const getOrderByValidationCode = async (code: string): Promise<Order | null> => {
    if (!code || code.length !== 6) return null;
    
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const orderCollection = collection(db, 'orders');

    const q = query(orderCollection, where("validationCode", "==", code), limit(1));
    
    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return null;
        }
        // Found a document with the code. Now check its status.
        const order = fromFirestoreToOrder(snapshot.docs[0]);
        if (order.status !== 'Prêt') {
            throw new Error(`Cette commande a déjà le statut "${order.status}" et ne peut pas être validée.`);
        }
        return order;
    } catch (e: any) {
        console.error("Server-side getOrderByValidationCode failed:", e.message);
        // Rethrow specific, user-friendly messages
        if (e.message.includes("Cette commande a déjà le statut")) {
            throw e;
        }
        // For other errors, return a generic error
        throw new Error("Erreur lors de la recherche de la commande.");
    }
};

export async function getOrderByCodeAction(code: string): Promise<{ success: boolean; order?: Order, error?: string; }> {
  try {
    const order = await getOrderByValidationCode(code);
    if (order) {
      return { success: true, order: order as Order };
    }
    // If order is null without an error, it means no order was found with that code.
    return { success: false, error: 'Aucune commande prête à être livrée trouvée avec ce code.' };
  } catch (error: any) {
    // Catch the specific error thrown from the service
    return { success: false, error: error.message };
  }
}
