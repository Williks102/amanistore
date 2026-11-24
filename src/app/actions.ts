
'use server';

import { getShoeRecommendations } from '@/ai/flows/shoe-style-recommendation';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import type { Shoe, Category, PromoCode, Order, Collection, OrderStatus, CartItem, ContactMessage } from '@/lib/types';
import { computeDiscount, promoProblem } from '@/lib/promo';
import { availableStock } from '@/lib/stock';
import { canonicalColorName, normalizeColors } from '@/lib/colors';
import { isPriceValid, validateProductFields } from '@/lib/product-validation';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { after } from 'next/server';
import { buildOrderNotification, configuredChannels, diagnoseNotifications, explainChannelError, sendNotification, type NotifyResult } from '@/lib/notify';
import { SITE } from '@/lib/site';
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

/** Erreur métier dont le message peut être montré tel quel au client. */
class OrderError extends Error {}

function fail(error: unknown): { success: false; error: string } {
  if (error instanceof AuthError || error instanceof OrderError) return { success: false, error: error.message };
  console.error(error);
  return { success: false, error: GENERIC };
}

const ORDER_STATUSES: OrderStatus[] = ['En attente', 'Prêt', 'Livré', 'Annulé'];

/**
 * Rend une valeur Firestore sérialisable par Next (seuls les objets simples traversent une Server Action):
 * Timestamp → chaîne ISO, référence → son chemin, toute autre classe → retirée.
 * Sans cela, un champ Timestamp (ex. `claimedAt`) faisait échouer tout l'admin et « Mon compte ».
 */
function toPlain(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(toPlain);
  const v = value as { toDate?: () => Date; path?: unknown };
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (Object.getPrototypeOf(value) !== Object.prototype) return typeof v.path === 'string' ? v.path : undefined;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      const plain = toPlain(item);
      return plain === undefined ? [] : [[key, plain]];
    })
  );
}

/** Document Firestore → objet simple `{ id, ...champs }`. */
const plainDoc = <T,>(id: string, data: FirebaseFirestore.DocumentData): T => ({ id, ...(toPlain(data) as object) }) as T;

/** Champs d'une commande qui sortent du serveur (liste blanche: un champ interne ajouté plus tard ne fuit pas). */
const ORDER_FIELDS = ['userId', 'customerName', 'customerPhone', 'customerEmail', 'customerAddress', 'items', 'subtotal', 'discount', 'promoCode', 'promoCodeId', 'guest', 'total', 'status', 'validationCode'] as const;

function orderFromDoc(id: string, data: FirebaseFirestore.DocumentData): Order {
  const plain = toPlain(data) as Record<string, unknown>;
  const date = typeof plain.date === 'string' ? plain.date : new Date().toISOString();
  // Jamais de secret d'invité ni de champ technique (guestSecret, claimedAt…): seulement la liste blanche.
  const picked = Object.fromEntries(ORDER_FIELDS.filter((key) => plain[key] !== undefined).map((key) => [key, plain[key]]));
  return { ...picked, id, date } as Order;
}

/** Nettoie une table de stock: pointures numériques, quantités entières >= 0. */
function sanitizeStock(stock: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [size, qty] of Object.entries(stock)) {
    const n = Number(qty);
    if (Number(size) > 0 && Number.isInteger(n) && n >= 0 && n <= 100000) out[String(Number(size))] = n;
  }
  return out;
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
    return snapshot.docs.map(doc => plainDoc<Shoe>(doc.id, doc.data())).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export async function createProduct(idToken: string, newShoeData: Omit<Shoe, 'id'>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, ['productManager']);
        const { stock, featured, ...rest } = newShoeData;
        const problem = validateProductFields(rest);
        if (problem) return { success: false, error: problem };
        const docRef = await adminDb.collection('shoes').add({
            ...rest,
            availableColors: normalizeColors(rest.availableColors).colors,
            ...(stock ? { stock: sanitizeStock(stock) } : {}),
            ...(typeof featured === 'boolean' ? { featured } : {}),
            createdAt: new Date().toISOString(),
        });
        return { success: true, productId: docRef.id };
    } catch (error) { return fail(error); }
}

// `stock: null` supprime le suivi de stock (illimité).
export async function updateProduct(idToken: string, shoeId: string, updatedShoeData: Omit<Partial<Shoe>, 'stock'> & { stock?: Record<string, number> | null }) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, ['productManager']);
        const { id: _ignored, stock, featured, ...rest } = updatedShoeData;
        const problem = validateProductFields(rest);
        if (problem) return { success: false, error: problem };
        const data: Record<string, unknown> = { ...rest };
        if (rest.availableColors) data.availableColors = normalizeColors(rest.availableColors).colors;
        if (typeof featured === 'boolean') data.featured = featured;
        if (stock === null) data.stock = FieldValue.delete();
        else if (stock !== undefined) data.stock = sanitizeStock(stock);
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

// ============ NORMALISATION DES COULEURS (admin produits) ============
export type ColorNormalizationItem = { id: string; name: string; before: string[]; after: string[]; unmapped: string[] };

/** Calcul (sans rien écrire) des changements de couleurs à appliquer à tous les produits. */
async function computeColorNormalization(): Promise<ColorNormalizationItem[]> {
    if (!adminDb) return [];
    const snapshot = await adminDb.collection('shoes').get();
    const items: ColorNormalizationItem[] = [];
    for (const doc of snapshot.docs) {
        const shoe = doc.data() as Shoe;
        const colors = shoe.availableColors ?? [];
        const result = normalizeColors(colors);
        if (!result.changed && result.unmapped.length === 0) continue;
        items.push({ id: doc.id, name: shoe.name, before: colors.map((c) => c.name), after: result.colors.map((c) => c.name), unmapped: result.unmapped });
    }
    return items;
}

/** Aperçu: ce qui changerait, produit par produit. Aucune écriture. */
export async function previewColorNormalization(idToken: string): Promise<{ items: ColorNormalizationItem[]; error?: string }> {
    try {
        await requireRole(idToken, ['productManager']);
        return { items: await computeColorNormalization() };
    } catch (error) {
        const failure = fail(error);
        return { items: [], error: failure.error };
    }
}

/**
 * Applique la normalisation (recalculée côté serveur, jamais d'après le client).
 * Les produits qui ont une couleur sans équivalent dans la palette sont ignorés et listés.
 */
export async function applyColorNormalization(idToken: string): Promise<{ success: boolean; updated: number; skipped: ColorNormalizationItem[]; error?: string }> {
    if (!adminDb) return { success: false, updated: 0, skipped: [], error: 'DB connection failed.' };
    try {
        await requireRole(idToken, ['productManager']);
        const items = await computeColorNormalization();
        const skipped = items.filter((i) => i.unmapped.length > 0);
        let updated = 0;
        for (const item of items.filter((i) => i.unmapped.length === 0)) {
            const ref = adminDb.collection('shoes').doc(item.id);
            const snap = await ref.get();
            const colors = (snap.data() as Shoe | undefined)?.availableColors ?? [];
            await ref.update({ availableColors: normalizeColors(colors).colors });
            updated += 1;
        }
        return { success: true, updated, skipped };
    } catch (error) {
        const failure = fail(error);
        return { success: false, updated: 0, skipped: [], error: failure.error };
    }
}

// ============ CATEGORY ACTIONS (admin) ============
export async function getCategories() {
    if (!adminDb) return [];
    const snapshot = await adminDb.collection('categories').get();
    return snapshot.docs.map(doc => plainDoc<Category>(doc.id, doc.data()));
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
    return snapshot.docs.map(doc => plainDoc<Collection>(doc.id, doc.data()));
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
        return snapshot.docs.map(doc => plainDoc<PromoCode>(doc.id, doc.data()));
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
  expiresAt: z.string().datetime({ offset: true }).optional(),
  maxUses: z.number().int().min(1).max(10_000_000).optional(),
  minOrderAmount: z.number().min(0).max(100_000_000).optional(),
}).refine((p) => p.discountType !== 'percentage' || p.value <= 100, { message: 'Un pourcentage ne peut pas dépasser 100.' });

export async function createPromoCode(idToken: string, promoCodeData: Omit<PromoCode, 'id'>) {
    if (!adminDb) return { success: false, error: 'DB connection failed.' };
    try {
        await requireRole(idToken, []);
        const parsed = PromoInputSchema.safeParse(promoCodeData);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Données invalides.' };
        const docRef = await adminDb.collection('promoCodes').add({ ...parsed.data, code: parsed.data.code.toUpperCase(), usedCount: 0 });
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
  /** Champ piège invisible: un humain ne le remplit jamais, un robot si. */
  website: z.string().max(0).optional(),
  items: z.array(z.object({
    productId: z.string().min(1).max(128),
    quantity: z.number().int().min(1).max(20),
    size: z.number(),
    color: z.string().max(50),
  })).min(1).max(50),
});

const MAX_PENDING_ORDERS_PER_PHONE = 3;

/**
 * Crée une commande. `idToken` absent (null ou vide) = commande d'invité, sans compte: limites plus strictes,
 * et un secret propre à la commande (renvoyé une seule fois) permet de la relire sur la page de confirmation.
 * Un jeton fourni mais invalide est refusé: il n'est jamais traité comme un invité.
 */
export async function createOrder(
  idToken: string | null,
  input: z.infer<typeof CreateOrderSchema>
): Promise<{ success: boolean; orderId?: string; validationCode?: string; guestSecret?: string; error?: string }> {
  if (!adminDb) return { success: false, error: 'DB connection failed.' };
  const db = adminDb;
  try {
    const isGuest = !idToken;
    const uid = isGuest ? '' : await requireUser(idToken);
    const allowed = isGuest ? await rateLimit('create-order-guest', 3, 10 * 60_000) : await rateLimit('create-order', 10, 10 * 60_000);
    if (!allowed) return { success: false, error: 'Trop de commandes. Réessayez plus tard.' };
    const parsed = CreateOrderSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Informations de commande invalides.' };
    if (parsed.data.website) return { success: false, error: 'Informations de commande invalides.' };
    const data = parsed.data;

    // Anti-spam: pas plus de commandes en attente par numéro de téléphone.
    const samePhone = await db.collection('orders').where('customerPhone', '==', data.phone).get();
    if (samePhone.docs.filter((d) => d.data().status === 'En attente').length >= MAX_PENDING_ORDERS_PER_PHONE) {
      return { success: false, error: 'Vous avez déjà plusieurs commandes en attente avec ce numéro. Contactez-nous sur WhatsApp.' };
    }
    const guestSecret = isGuest ? randomBytes(16).toString('hex') : undefined;
    let orderTotal = 0;

    const uniqueIds = Array.from(new Set(data.items.map((i) => i.productId)));
    const orderRef = db.collection('orders').doc();
    const validationCode = randomInt(100000, 1000000).toString();
    const promoCode = data.promoCode?.toUpperCase();

    // Tout se passe dans une transaction: le stock et le compteur du code promo
    // ne peuvent pas être dépassés par deux commandes simultanées.
    await db.runTransaction(async (tx) => {
      // 1. Lectures (obligatoirement avant toute écriture)
      const productRefs = uniqueIds.map((id) => db.collection('shoes').doc(id));
      const productSnaps = await Promise.all(productRefs.map((r) => tx.get(r)));
      const promoSnap = promoCode
        ? await tx.get(db.collection('promoCodes').where('code', '==', promoCode).limit(1))
        : null;

      const products = new Map<string, Shoe>();
      productSnaps.forEach((snap) => { if (snap.exists) products.set(snap.id, { id: snap.id, ...snap.data() } as Shoe); });

      // 2. Validation des lignes (prix lus en base, jamais depuis le client)
      const items: CartItem[] = [];
      const requested = new Map<string, number>(); // `${productId}|${size}` -> quantité totale
      for (const it of data.items) {
        const product = products.get(it.productId);
        if (!product) throw new OrderError("Un produit de votre panier n'existe plus.");
        if (!isPriceValid(product.price)) throw new OrderError(`${product.name} est momentanément indisponible.`);
        if (product.availableSizes?.length && !product.availableSizes.includes(it.size)) {
          throw new OrderError(`Taille indisponible pour ${product.name}.`);
        }
        if (product.availableColors?.length && !product.availableColors.some((c) => canonicalColorName(c.name) === canonicalColorName(it.color))) {
          throw new OrderError(`Couleur indisponible pour ${product.name}.`);
        }
        const key = `${product.id}|${it.size}`;
        requested.set(key, (requested.get(key) ?? 0) + it.quantity);
        items.push({ id: `${product.id}-${it.size}-${it.color}`, product, quantity: it.quantity, size: it.size, color: it.color });
      }

      // 3. Stock (pour les produits dont le stock est suivi)
      const newStock = new Map<string, Record<string, number>>();
      for (const [key, qty] of requested) {
        const [productId, sizeStr] = key.split('|');
        const product = products.get(productId)!;
        const available = availableStock(product, Number(sizeStr));
        if (available === null) continue;
        if (qty > available) {
          throw new OrderError(
            available === 0
              ? `${product.name} (pointure ${sizeStr}) est épuisé.`
              : `Stock insuffisant pour ${product.name} (pointure ${sizeStr}): ${available} restant(s).`
          );
        }
        const current = newStock.get(productId) ?? { ...(product.stock ?? {}) };
        current[sizeStr] = available - qty;
        newStock.set(productId, current);
      }

      // 4. Prix et code promo
      const subtotal = items.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
      let discount = 0;
      let promoRef: FirebaseFirestore.DocumentReference | null = null;
      let promoUsed = 0;
      if (promoCode) {
        const promoDoc = promoSnap && !promoSnap.empty ? promoSnap.docs[0] : null;
        if (!promoDoc) throw new OrderError('Code promo invalide ou inactif.');
        const promo = promoDoc.data() as PromoCode;
        const problem = promoProblem(promo, subtotal);
        if (problem) throw new OrderError(problem);
        discount = computeDiscount(promo, subtotal);
        promoRef = promoDoc.ref;
        promoUsed = promo.usedCount ?? 0;
      }
      const total = Math.max(subtotal - discount, 0);
      orderTotal = total;

      // 5. Écritures
      tx.set(orderRef, {
        userId: uid,
        ...(guestSecret ? { guest: true, guestSecret } : {}),
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email || '',
        customerAddress: data.address,
        items,
        subtotal,
        discount,
        total,
        ...(promoRef ? { promoCode, promoCodeId: promoRef.id } : {}),
        status: 'En attente' as OrderStatus,
        validationCode,
        date: FieldValue.serverTimestamp(),
      });
      for (const [productId, stock] of newStock) {
        tx.update(db.collection('shoes').doc(productId), { stock });
      }
      if (promoRef) tx.update(promoRef, { usedCount: promoUsed + 1 });
    });

    // Prévient la boutique APRÈS la réponse à la cliente (la commande ne dépend jamais de la notification).
    const notification = buildOrderNotification(
      { id: orderRef.id, customerName: data.name, total: orderTotal, itemCount: data.items.reduce((n, i) => n + i.quantity, 0), guest: isGuest },
      SITE.url
    );
    const work = () => sendNotification(notification).then(() => undefined, () => undefined);
    try { after(work); } catch { void work(); }

    return { success: true, orderId: orderRef.id, validationCode, guestSecret };
  } catch (error) { return fail(error); }
}

const ClaimsSchema = z.array(z.object({
  orderId: z.string().regex(/^[A-Za-z0-9_-]{6,60}$/),
  secret: z.string().regex(/^[a-f0-9]{32}$/),
})).max(10);

/**
 * Rattache à son compte les commandes passées sans compte sur cet appareil. La preuve est le secret
 * reçu à la création (seul l'appareil qui a commandé le connaît). Le secret est supprimé ensuite:
 * une commande rattachée ne peut plus être réclamée par personne d'autre.
 * Retourne les commandes désormais au compte de la cliente (y compris celles déjà rattachées à elle).
 */
export async function claimGuestOrders(idToken: string, claims: unknown): Promise<{ success: boolean; claimed: string[]; failed: number; error?: string }> {
  if (!adminDb) return { success: false, claimed: [], failed: 0, error: 'DB connection failed.' };
  const db = adminDb;
  try {
    const uid = await requireUser(idToken);
    if (!(await rateLimit('claim-guest-orders', 10, 60_000))) return { success: false, claimed: [], failed: 0, error: 'Trop de tentatives. Réessayez dans un instant.' };
    const parsed = ClaimsSchema.safeParse(claims);
    if (!parsed.success) return { success: false, claimed: [], failed: 0, error: 'Demande invalide.' };

    const claimed: string[] = [];
    let failed = 0;
    for (const { orderId, secret } of parsed.data) {
      const ok = await db.runTransaction(async (tx) => {
        const ref = db.collection('orders').doc(orderId);
        const snap = await tx.get(ref);
        const data = snap.data();
        if (!snap.exists || !data) return false;
        const stored: unknown = data.guestSecret;
        if (typeof stored !== 'string') return data.userId === uid; // déjà rattachée à cette cliente: rien à refaire
        if (data.userId !== '' || stored.length !== secret.length) return false;
        if (!timingSafeEqual(Buffer.from(stored), Buffer.from(secret))) return false;
        tx.update(ref, { userId: uid, guestSecret: FieldValue.delete(), guest: FieldValue.delete(), claimedAt: FieldValue.serverTimestamp() });
        return true;
      });
      if (ok) claimed.push(orderId);
      else failed += 1;
    }
    return { success: true, claimed, failed };
  } catch (error) {
    const failure = fail(error);
    return { success: false, claimed: [], failed: 0, error: failure.error };
  }
}

/** Relit la commande d'un invité grâce au secret reçu à la création (compte tenu du code de validation qu'elle contient). */
export async function getGuestOrder(orderId: string, secret: string): Promise<{ order: Order | null; error?: string }> {
  if (!/^[A-Za-z0-9_-]{6,60}$/.test(orderId) || !/^[a-f0-9]{32}$/.test(secret)) return { order: null, error: 'Commande introuvable.' };
  if (!(await rateLimit('guest-order', 20, 60_000))) return { order: null, error: 'Trop de tentatives. Réessayez dans un instant.' };
  if (!adminDb) return { order: null, error: 'DB connection failed.' };
  try {
    const snap = await adminDb.collection('orders').doc(orderId).get();
    const data = snap.data();
    const stored: unknown = data?.guestSecret;
    if (!snap.exists || !data || typeof stored !== 'string' || stored.length !== secret.length) return { order: null, error: 'Commande introuvable.' };
    if (!timingSafeEqual(Buffer.from(stored), Buffer.from(secret))) return { order: null, error: 'Commande introuvable.' };
    return { order: orderFromDoc(snap.id, data) };
  } catch (error) {
    console.error(error);
    return { order: null, error: 'Impossible de récupérer la commande.' };
  }
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
    const db = adminDb;
    try {
        await requireRole(idToken, ['orderManager']);
        if (!ORDER_STATUSES.includes(status)) return { success: false, error: 'Statut invalide.' };
        await db.runTransaction(async (tx) => {
            const ref = db.collection('orders').doc(orderId);
            const snap = await tx.get(ref);
            if (!snap.exists) throw new OrderError('Commande non trouvée.');
            const order = snap.data() as Order;
            if (order.status === status) return;
            if (order.status === 'Annulé') throw new OrderError('Une commande annulée ne peut pas être rouverte.');

            if (status === 'Annulé') {
                // Annulation: on remet le stock et on libère l'utilisation du code promo.
                const lines = new Map<string, Map<string, number>>(); // productId -> size -> quantité
                for (const it of order.items ?? []) {
                    const sizes = lines.get(it.product.id) ?? new Map<string, number>();
                    sizes.set(String(it.size), (sizes.get(String(it.size)) ?? 0) + it.quantity);
                    lines.set(it.product.id, sizes);
                }
                const productRefs = Array.from(lines.keys()).map((id) => db.collection('shoes').doc(id));
                const productSnaps = await Promise.all(productRefs.map((r) => tx.get(r)));
                const promoRef = order.promoCodeId ? db.collection('promoCodes').doc(order.promoCodeId) : null;
                const promoSnap = promoRef ? await tx.get(promoRef) : null;

                productSnaps.forEach((p) => {
                    const stock = p.exists ? (p.data() as Shoe).stock : undefined;
                    if (!stock) return; // produit supprimé ou stock non suivi
                    const restored = { ...stock };
                    for (const [size, qty] of lines.get(p.id)!) restored[size] = (restored[size] ?? 0) + qty;
                    tx.update(p.ref, { stock: restored });
                });
                if (promoRef && promoSnap?.exists) {
                    tx.update(promoRef, { usedCount: Math.max(((promoSnap.data() as PromoCode).usedCount ?? 0) - 1, 0) });
                }
            }
            tx.update(ref, { status });
        });
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

export async function validatePromoCode(code: string, subtotal?: number): Promise<{ success: boolean; promoCode?: PromoCode; error?: string; }> {
  if (typeof code !== 'string' || code.length === 0 || code.length > 50) return { success: false, error: 'Code promo invalide.' };
  if (!(await rateLimit('promo-code', 15, 60_000))) return { success: false, error: 'Trop de tentatives. Réessayez dans un instant.' };
  if (!adminDb) return { success: false, error: 'DB connection failed.' };
  const snapshot = await adminDb.collection('promoCodes').where('code', '==', code.toUpperCase()).limit(1).get();
  if (snapshot.empty) return { success: false, error: 'Code promo invalide.' };
  const promoDoc = snapshot.docs[0];
  const full = plainDoc<PromoCode>(promoDoc.id, promoDoc.data());
  const problem = promoProblem(full, typeof subtotal === 'number' ? subtotal : undefined);
  if (problem) return { success: false, error: problem };
  // On ne divulgue pas le compteur d'utilisation.
  const { usedCount: _u, ...publicPromo } = full;
  return { success: true, promoCode: publicPromo as PromoCode };
}

// ============ NOTIFICATIONS DE COMMANDE (admin) ============
/** Quels canaux sont configurés et, sinon, pourquoi (noms des variables et formats seulement: jamais les valeurs). */
export async function getNotificationStatus(idToken: string): Promise<{ telegram: boolean; email: boolean; hints: string[]; error?: string }> {
  try {
    await requireRole(idToken, []);
    return { ...configuredChannels(), hints: diagnoseNotifications() };
  } catch (error) {
    return { telegram: false, email: false, hints: [], error: fail(error).error };
  }
}

/** Envoie un message de test sur les canaux configurés; en cas d'échec, explique en français ce qu'il faut corriger. */
export async function sendTestNotification(idToken: string): Promise<{ success: boolean; result?: NotifyResult; hints?: string[]; error?: string }> {
  try {
    await requireRole(idToken, []);
    if (!(await rateLimit('test-notification', 5, 60_000))) return { success: false, error: 'Trop de tests. Réessayez dans un instant.' };
    const channels = configuredChannels();
    if (!channels.telegram && !channels.email) {
      return { success: false, error: 'Aucun canal configuré (Telegram ou e-mail).', hints: diagnoseNotifications() };
    }
    const result = await sendNotification({ subject: `Test — ${SITE.name}`, text: `Test de notification ${SITE.name}.\nSi vous lisez ce message, les nouvelles commandes vous seront signalées ici.` });
    const hints = [
      ...(result.telegram === 'failed' ? [explainChannelError('telegram', result.errors?.telegram)] : []),
      ...(result.email === 'failed' ? [explainChannelError('email', result.errors?.email)] : []),
    ];
    return { success: result.telegram === 'sent' || result.email === 'sent', result, hints };
  } catch (error) {
    return { success: false, error: fail(error).error };
  }
}

// ============ CONTACT MESSAGES (admin) ============
export async function getContactMessages(idToken: string): Promise<ContactMessage[]> {
  if (!adminDb) return [];
  try {
    await requireRole(idToken, []);
    const snapshot = await adminDb.collection('contactMessages').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((d) => plainDoc<ContactMessage>(d.id, d.data()));
  } catch (error) {
    if (!(error instanceof AuthError)) console.error(error);
    return [];
  }
}

export async function deleteContactMessage(idToken: string, messageId: string) {
  if (!adminDb) return { success: false, error: 'DB connection failed.' };
  try {
    await requireRole(idToken, []);
    await adminDb.collection('contactMessages').doc(messageId).delete();
    return { success: true };
  } catch (error) { return fail(error); }
}
