
'use server';

import { getShoeRecommendations } from '@/ai/flows/shoe-style-recommendation';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import type { Shoe, Category, PromoCode, Order, Collection, OrderStatus, CartItem } from '@/lib/types';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import { rateLimit } from '@/lib/rate-limit';
import { AuthError, requireRole, requireUser, getRolesForUid, verifyToken, type Roles } from '@/lib/server-auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============ AI ACTIONS ============
const ShoeRecommendationInputSchema = z.object({
  shoeDescription: z.string().trim().min(1).max(500),
});

export async function fetchShoeRecommendations(
  input: z.infer<typeof ShoeRecommendationInputSchema>
) {
  if (!(await rateLimit('ai-recommendations', 10, 60_000))) {
    return { recommendations: [], error: 'Trop de requêtes. Réessayez dans un instant.' };
  }
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
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo

export async function uploadImage(idToken: string, formData: FormData) {
  try { await requireRole(idToken, ['productManager']); } catch { return { error: 'Accès refusé.' }; }
  if (!(await rateLimit('upload-image', 20, 60_000))) {
    return { error: 'Trop de requêtes. Réessayez dans un instant.' };
  }
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) return { error: 'Aucun fichier valide fourni.' };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: 'Format non supporté (JPEG, PNG, WebP ou GIF uniquement).' };
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Image trop volumineuse (5 Mo maximum).' };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const results = await new Promise<{ secure_url: string } | { error: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: 'image', quality: 'auto', allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }, (error, result) => {
        if (error) reject(error);
        else if (result) resolve({ secure_url: result.secure_url });
        else reject(new Error('Le résultat de l\'upload de Cloudinary est indéfini.'));
      }).end(buffer);
    });
    return 'secure_url' in results ? { secure_url: results.secure_url } : { error: "Échec de l'upload." };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { error: "Échec de l'upload." };
  }
}

// ============ HELPERS ============
const GENERIC = 'Opération impossible pour le moment.';

function fail(error: unknown): { success: false; error: string } {
  if (error instanceof AuthError) return { success: false, error: error.message };
  console.error(error);
  return { success: false, error: GENERIC };
}

const ORDER_STATUSES: OrderStatus[] = ['En attente', 'Prêt', 'Livré', 'Annulé'];

function orderFromDoc(id: string, data: FirebaseFirestore.DocumentData): Order {
  const date = data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString();
  return { ...data, id, date } as Order;
}

// ============ SESSION ============
export async function getMyRoles(idToken: string): Promise<{ roles: Roles | null; error?: string }> {
  try {
    const uid = await verifyToken(idToken);
    return { roles: await getRolesForUid(uid) };
  } catch (error: any) {
    return { roles: null, error: error instanceof AuthError ? error.message : GENERIC };
  }
}

// ============ PRODUCT (SHOE) ACTIONS ============
// Lecture publique, écriture réservée aux admins / gestionnaires de produits.
export async function getProducts() {
    if (!adminDb) return [];
    const snapshot = await adminDb.collection('shoes').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Shoe).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export async function createProduct(idToken: string, newShoeData: Omit<Shoe, 'id'>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, ['productManager']);
        const docRef = await adminDb.collection('shoes').add({ ...newShoeData, createdAt: new Date().toISOString() });
        return { success: true, productId: docRef.id };
    } catch (error) { return fail(error); }
}

export async function updateProduct(idToken: string, shoeId: string, updatedShoeData: Partial<Shoe>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, ['productManager']);
        const { id: _ignored, ...data } = updatedShoeData;
        await adminDb.collection('shoes').doc(shoeId).update(data);
        return { success: true };
    } catch (error) { return fail(error); }
}

export async function deleteProduct(idToken: string, shoeId: string) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, ['productManager']);
        await adminDb.collection('shoes').doc(shoeId).delete();
        return { success: true };
    } catch (error) { return fail(error); }
}

// ============ CATEGORY ACTIONS (admin) ============
export async function getCategories() {
    if (!adminDb) return [];
    const snapshot = await adminDb.collection('categories').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
}

export async function createCategory(idToken: string, categoryData: Omit<Category, 'id'>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, []);
        const docRef = await adminDb.collection('categories').add(categoryData);
        return { success: true, categoryId: docRef.id };
    } catch (error) { return fail(error); }
}

export async function deleteCategory(idToken: string, categoryId: string) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, []);
        await adminDb.collection('categories').doc(categoryId).delete();
        return { success: true };
    } catch (error) { return fail(error); }
}

// ============ COLLECTION ACTIONS (admin) ============
export async function getCollections() {
    if (!adminDb) return [];
    const snapshot = await adminDb.collection('collections').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Collection[];
}

export async function createCollection(idToken: string, collectionData: Omit<Collection, 'id'>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, []);
        const docRef = await adminDb.collection('collections').add(collectionData);
        return { success: true, collectionId: docRef.id };
    } catch (error) { return fail(error); }
}

export async function deleteCollection(idToken: string, collectionId: string) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, []);
        await adminDb.collection('collections').doc(collectionId).delete();
        return { success: true };
    } catch (error) { return fail(error); }
}

// ============ PROMO CODE ACTIONS (admin) ============
export async function getPromoCodes(idToken: string) {
    if (!adminDb) return [];
    try {
        await requireRole(idToken, []);
        const snapshot = await adminDb.collection('promoCodes').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PromoCode[];
    } catch (error) {
        if (!(error instanceof AuthError)) console.error(error);
        return [];
    }
}

const PromoInputSchema = z.object({
  code: z.string().trim().min(2).max(50),
  discountType: z.enum(['percentage', 'fixed']),
  value: z.number().positive().max(10_000_000),
  isActive: z.boolean(),
}).refine((p) => p.discountType !== 'percentage' || p.value <= 100, { message: 'Un pourcentage ne peut pas dépasser 100.' });

export async function createPromoCode(idToken: string, promoCodeData: Omit<PromoCode, 'id'>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, []);
        const parsed = PromoInputSchema.safeParse(promoCodeData);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Données invalides.' };
        const docRef = await adminDb.collection('promoCodes').add({ ...parsed.data, code: parsed.data.code.toUpperCase() });
        return { success: true, promoCodeId: docRef.id };
    } catch (error) { return fail(error); }
}

export async function updatePromoCode(idToken: string, promoCodeId: string, data: Partial<Omit<PromoCode, 'id'>>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, []);
        const update: Partial<Omit<PromoCode, 'id'>> = {};
        if (typeof data.isActive === 'boolean') update.isActive = data.isActive;
        if (Object.keys(update).length === 0) return { success: false, error: 'Aucune modification valide.' };
        await adminDb.collection('promoCodes').doc(promoCodeId).update(update);
        return { success: true };
    } catch (error) { return fail(error); }
}

export async function deletePromoCode(idToken: string, promoCodeId: string) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, []);
        await adminDb.collection('promoCodes').doc(promoCodeId).delete();
        return { success: true };
    } catch (error) { return fail(error); }
}

// ============ ORDER ACTIONS ============
// Création: entièrement côté serveur. Les prix, la remise, le statut et le code
// de livraison sont recalculés/générés ici, jamais pris du client.
const CreateOrderSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(9).max(30),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  address: z.string().trim().min(10).max(500),
  promoCode: z.string().trim().max(50).optional(),
  items: z.array(z.object({
    productId: z.string().min(1).max(128),
    quantity: z.number().int().min(1).max(20),
    size: z.number(),
    color: z.string().max(50),
  })).min(1).max(50),
});

export async function createOrder(
  idToken: string,
  input: z.infer<typeof CreateOrderSchema>
): Promise<{ success: boolean; orderId?: string; validationCode?: string; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB connection failed.' };
  try {
    const uid = await requireUser(idToken);
    if (!(await rateLimit('create-order', 10, 10 * 60_000))) {
      return { success: false, error: 'Trop de commandes. Réessayez plus tard.' };
    }
    const parsed = CreateOrderSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Informations de commande invalides.' };
    const data = parsed.data;

    // Prix et produits lus depuis la base.
    const uniqueIds = Array.from(new Set(data.items.map((i) => i.productId)));
    const snaps = await Promise.all(uniqueIds.map((id) => adminDb.collection('shoes').doc(id).get()));
    const products = new Map<string, Shoe>();
    snaps.forEach((s) => { if (s.exists) products.set(s.id, { id: s.id, ...s.data() } as Shoe); });

    const items: CartItem[] = [];
    for (const it of data.items) {
      const product = products.get(it.productId);
      if (!product) return { success: false, error: 'Un produit de votre panier n\'existe plus.' };
      if (product.availableSizes?.length && !product.availableSizes.includes(it.size)) {
        return { success: false, error: `Taille indisponible pour ${product.name}.` };
      }
      if (product.availableColors?.length && !product.availableColors.some((c) => c.name === it.color)) {
        return { success: false, error: `Couleur indisponible pour ${product.name}.` };
      }
      items.push({ id: `${product.id}-${it.size}-${it.color}`, product, quantity: it.quantity, size: it.size, color: it.color });
    }

    const subtotal = items.reduce((acc, i) => acc + i.product.price * i.quantity, 0);

    let discount = 0;
    if (data.promoCode) {
      const promoSnap = await adminDb.collection('promoCodes').where('code', '==', data.promoCode.toUpperCase()).limit(1).get();
      if (promoSnap.empty || promoSnap.docs[0].data().isActive !== true) {
        return { success: false, error: 'Code promo invalide ou inactif.' };
      }
      const promo = promoSnap.docs[0].data() as PromoCode;
      const raw = promo.discountType === 'percentage'
        ? subtotal * (Math.min(Math.max(promo.value, 0), 100) / 100)
        : Math.max(promo.value, 0);
      discount = Math.min(raw, subtotal);
    }
    const total = Math.max(subtotal - discount, 0);

    const validationCode = randomInt(100000, 1000000).toString();
    const docRef = await adminDb.collection('orders').add({
      userId: uid,
      customerName: data.name,
      customerPhone: data.phone,
      customerEmail: data.email || '',
      customerAddress: data.address,
      items,
      subtotal,
      discount,
      total,
      status: 'En attente' as OrderStatus,
      validationCode,
      date: FieldValue.serverTimestamp(),
    });
    return { success: true, orderId: docRef.id, validationCode };
  } catch (error) { return fail(error); }
}

export async function getOrders(idToken: string) {
    if (!adminDb) return [];
    try {
        await requireRole(idToken, ['orderManager']);
        const snapshot = await adminDb.collection('orders').orderBy('date', 'desc').get();
        return snapshot.docs.map(doc => orderFromDoc(doc.id, doc.data()));
    } catch (error) {
        if (!(error instanceof AuthError)) console.error(error);
        return [];
    }
}

export async function updateOrderStatus(idToken: string, orderId: string, status: OrderStatus) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, ['orderManager']);
        if (!ORDER_STATUSES.includes(status)) return { success: false, error: 'Statut invalide.' };
        await adminDb.collection('orders').doc(orderId).update({ status });
        return { success: true };
    } catch (error) { return fail(error); }
}

export async function getOrderByCodeForValidation(idToken: string, code: string): Promise<{ order: Order | null; error?: string }> {
  try {
    await requireRole(idToken, ['orderManager']);
  } catch (error) {
    return { order: null, error: error instanceof AuthError ? error.message : GENERIC };
  }
  if (!/^\d{6}$/.test(code.trim())) return { order: null, error: 'Code invalide.' };
  if (!(await rateLimit('validation-code', 5, 15 * 60_000))) {
    return { order: null, error: 'Trop de tentatives. Réessayez plus tard.' };
  }
  if (!adminDb) return { order: null, error: 'DB connection failed.' };
  try {
    const snapshot = await adminDb.collection('orders').where('validationCode', '==', code.trim()).limit(1).get();
    if (snapshot.empty) return { order: null, error: 'Aucune commande trouvée avec ce code.' };
    const doc = snapshot.docs[0];
    return { order: orderFromDoc(doc.id, doc.data()) };
  } catch (error: any) { console.error(error); return { order: null, error: 'Impossible de récupérer la commande.' }; }
}

export async function validateOrderDelivery(idToken: string, orderId: string): Promise<{ success: boolean; error?: string }> {
    if (!adminDb) return { success: false, error: "DB connection failed." };
    try {
        await requireRole(idToken, ['orderManager']);
        const orderDocRef = adminDb.collection('orders').doc(orderId);
        const docSnap = await orderDocRef.get();
        if (!docSnap.exists) return { success: false, error: "Commande non trouvée." };
        const order = docSnap.data() as Order;
        if (order.status === 'Livré') return { success: false, error: 'Cette commande a déjà été validée comme livrée.' };
        if (order.status === 'Annulé') return { success: false, error: 'Cette commande a été annulée.' };
        await orderDocRef.update({ status: 'Livré' });
        return { success: true };
    } catch (error) { return fail(error); }
}

// L'UID vient du jeton vérifié, jamais d'un paramètre fourni par le client.
export async function getOrdersForUser(idToken: string): Promise<{ orders: Order[] | null; error?: string }> {
  if (!adminDb) return { orders: null, error: 'DB connection failed.' };
  try {
    const uid = await requireUser(idToken);
    const snapshot = await adminDb.collection('orders').where('userId', '==', uid).get();
    return { orders: snapshot.docs.map(doc => orderFromDoc(doc.id, doc.data())) };
  } catch (error: any) {
    if (!(error instanceof AuthError)) console.error(error);
    return { orders: null, error: error instanceof AuthError ? error.message : 'Impossible de récupérer vos commandes.' };
  }
}

// ============ PUBLIC ACTIONS ============
export async function sendContactMessage(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const name = formData.get('name')?.toString().trim() || '';
  const email = formData.get('email')?.toString().trim() || '';
  const subject = formData.get('subject')?.toString().trim() || '';
  const message = formData.get('message')?.toString().trim() || '';

  if (!name || !email || !subject || !message) {
    return { success: false, error: 'Tous les champs sont requis.' };
  }
  if (name.length > 100 || email.length > 254 || subject.length > 200 || message.length > 5000) {
    return { success: false, error: 'Un des champs est trop long.' };
  }
  if (!(await rateLimit('contact', 3, 10 * 60_000))) {
    return { success: false, error: 'Trop de messages envoyés. Réessayez plus tard.' };
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

export async function validatePromoCode(code: string): Promise<{ success: boolean; promoCode?: PromoCode; error?: string; }> {
  if (typeof code !== 'string' || code.length === 0 || code.length > 50) return { success: false, error: 'Code promo invalide.' };
  if (!(await rateLimit('promo-code', 15, 60_000))) return { success: false, error: 'Trop de tentatives. Réessayez dans un instant.' };
  if (!adminDb) return { success: false, error: 'DB connection failed.' };
  const snapshot = await adminDb.collection('promoCodes').where('code', '==', code.toUpperCase()).limit(1).get();
  if (snapshot.empty) return { success: false, error: 'Code promo invalide.' };
  const promoDoc = snapshot.docs[0];
  const promoCode = { id: promoDoc.id, ...promoDoc.data() } as PromoCode;
  if (!promoCode.isActive) return { success: false, error: 'Ce code promo n\'est plus actif.' };
  return { success: true, promoCode };
}
