
'use server';

import { getShoeRecommendations } from '@/ai/flows/shoe-style-recommendation';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import type { Shoe, Category, PromoCode, Order, Collection, OrderStatus } from '@/lib/types';
import { adminDb } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============ AI ACTIONS ============
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

// ============ IMAGE UPLOAD ============
export async function uploadImage(formData: FormData) {
  const file = formData.get('image') as File | null;
  if (!file || file.size === 0) return { error: 'Aucun fichier valide fourni.' };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const results = await new Promise<{ secure_url: string } | { error: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: 'auto', quality: 'auto' }, (error, result) => {
        if (error) reject(error);
        else if (result) resolve({ secure_url: result.secure_url });
        else reject(new Error('Le résultat de l\'upload de Cloudinary est indéfini.'));
      }).end(buffer);
    });
    return 'secure_url' in results ? { secure_url: results.secure_url } : { error: results.error?.message };
  } catch (error: any) {
    return { error: `Échec de l'upload: ${error.message}` };
  }
}

// ============ PRODUCT (SHOE) ACTIONS ============
export async function getProducts() {
    if (!adminDb) return [];
    const snapshot = await adminDb.collection('shoes').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shoe[];
}

export async function createProduct(newShoeData: Omit<Shoe, 'id'>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        const docRef = await adminDb.collection('shoes').add(newShoeData);
        return { success: true, productId: docRef.id };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function updateProduct(shoeId: string, updatedShoeData: Partial<Shoe>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await adminDb.collection('shoes').doc(shoeId).update(updatedShoeData);
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function deleteProduct(shoeId: string) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await adminDb.collection('shoes').doc(shoeId).delete();
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

// ============ CATEGORY ACTIONS ============
export async function getCategories() {
    if (!adminDb) return [];
    const snapshot = await adminDb.collection('categories').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
}

export async function createCategory(categoryData: Omit<Category, 'id'>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        const docRef = await adminDb.collection('categories').add(categoryData);
        return { success: true, categoryId: docRef.id };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function deleteCategory(categoryId: string) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await adminDb.collection('categories').doc(categoryId).delete();
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

// ============ COLLECTION ACTIONS ============
export async function getCollections() {
    if (!adminDb) return [];
    const snapshot = await adminDb.collection('collections').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Collection[];
}

export async function createCollection(collectionData: Omit<Collection, 'id'>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        const docRef = await adminDb.collection('collections').add(collectionData);
        return { success: true, collectionId: docRef.id };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function deleteCollection(collectionId: string) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await adminDb.collection('collections').doc(collectionId).delete();
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

// ============ PROMO CODE ACTIONS ============
export async function getPromoCodes() {
    if (!adminDb) return [];
    const snapshot = await adminDb.collection('promoCodes').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PromoCode[];
}

export async function createPromoCode(promoCodeData: Omit<PromoCode, 'id'>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        const docRef = await adminDb.collection('promoCodes').add(promoCodeData);
        return { success: true, promoCodeId: docRef.id };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function updatePromoCode(promoCodeId: string, data: Partial<Omit<PromoCode, 'id'>>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await adminDb.collection('promoCodes').doc(promoCodeId).update(data);
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function deletePromoCode(promoCodeId: string) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await adminDb.collection('promoCodes').doc(promoCodeId).delete();
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}


// ============ ORDER ACTIONS ============
export async function getOrders() {
    if (!adminDb) return [];
    const snapshot = await adminDb.collection('orders').orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, date: data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString() } as Order;
    });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await adminDb.collection('orders').doc(orderId).update({ status });
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}


export async function getOrderByCodeForValidation(code: string): Promise<{ order: Order | null; error?: string }> {
  if (!adminDb) return { order: null, error: 'DB connection failed.' };
  try {
    const snapshot = await adminDb.collection('orders').where('validationCode', '==', code.trim()).limit(1).get();
    if (snapshot.empty) return { order: null, error: 'Aucune commande trouvée avec ce code.' };
    const doc = snapshot.docs[0];
    const data = doc.data();
    const date = data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString();
    return { order: { ...data, id: doc.id, date } as Order };
  } catch (error: any) { return { order: null, error: 'Impossible de récupérer la commande.' }; }
}

export async function validateOrderDelivery(orderId: string): Promise<{ success: boolean; error?: string }> {
    if (!adminDb) return { success: false, error: "DB connection failed." };
    try {
        const orderDocRef = adminDb.collection('orders').doc(orderId);
        const docSnap = await orderDocRef.get();
        if (!docSnap.exists) return { success: false, error: "Commande non trouvée." };
        const order = docSnap.data() as Order;
        if (order.status === 'Livré') return { success: false, error: 'Cette commande a déjà été validée comme livrée.' };
        if (order.status === 'Annulé') return { success: false, error: 'Cette commande a été annulée.' };
        await orderDocRef.update({ status: 'Livré' });
        return { success: true };
    } catch (error: any) { return { success: false, error: "Échec de la validation." }; }
}

// ============ USER-FACING ACTIONS (UNCHANGED) ============


export async function sendContactMessage(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const name = formData.get('name')?.toString().trim() || '';
  const email = formData.get('email')?.toString().trim() || '';
  const subject = formData.get('subject')?.toString().trim() || '';
  const message = formData.get('message')?.toString().trim() || '';

  if (!name || !email || !subject || !message) {
    return { success: false, error: 'Tous les champs sont requis.' };
  }

  const emailSchema = z.string().email();
  const emailValidation = emailSchema.safeParse(email);
  if (!emailValidation.success) {
    return { success: false, error: 'Adresse e-mail invalide.' };
  }

  if (!adminDb) return { success: false, error: 'DB connection failed.' };

  try {
    await adminDb.collection('contactMessages').add({
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Impossible d'envoyer votre message pour le moment." };
  }
}

export async function getOrdersForUser(userId: string): Promise<{ orders: Order[] | null; error?: string }> {
  if (!adminDb) return { orders: null, error: 'DB connection failed.' };
  try {
    const snapshot = await adminDb.collection('orders').where('userId', '==', userId).get();
    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return { ...data, id: doc.id, date: data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString() } as Order;
    });
    return { orders };
  } catch (error: any) { return { orders: null, error: 'Impossible de récupérer vos commandes.' }; }
}

export async function validatePromoCode(code: string): Promise<{ success: boolean; promoCode?: PromoCode; error?: string; }> {
  if (!adminDb) return { success: false, error: 'DB connection failed.' };
  const snapshot = await adminDb.collection('promoCodes').where('code', '==', code.toUpperCase()).limit(1).get();
  if (snapshot.empty) return { success: false, error: 'Code promo invalide.' };
  const promoDoc = snapshot.docs[0];
  const promoCode = { id: promoDoc.id, ...promoDoc.data() } as PromoCode;
  if (!promoCode.isActive) return { success: false, error: 'Ce code promo n\'est plus actif.' };
  return { success: true, promoCode };
}
