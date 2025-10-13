
import { db } from '@/firebase';
import type { Order, OrderStatus } from '@/lib/types';
import { collection, getDocs, addDoc, updateDoc, doc, DocumentData, QueryDocumentSnapshot, query, where, serverTimestamp, getDoc, limit } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const getOrderCollection = () => collection(db, 'orders');

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): Order => {
    const data = snapshot.data();
    const date = data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString();
    return {
        ...data,
        id: snapshot.id,
        date: date,
        validationCode: String(data.validationCode || '').trim()
    } as Order;
}

export const getOrderById = async (orderId: string): Promise<Order | null> => {
    const orderDocRef = doc(db, 'orders', orderId);
    try {
        const docSnap = await getDoc(orderDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const date = data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString();
            return { ...data, id: docSnap.id, date } as Order;
        }
        return null;
    } catch (e) {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: orderDocRef.path,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw contextualError;
    }
}

export const getOrdersByUserId = async (userId: string): Promise<Order[]> => {
    const q = query(getOrderCollection(), where("userId", "==", userId));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(fromFirestore);
    } catch (e) {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: getOrderCollection().path,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw contextualError;
    }
};

export const getOrders = async (): Promise<Order[]> => {
    try {
        const snapshot = await getDocs(getOrderCollection());
        return snapshot.docs.map(fromFirestore);
    } catch (e) {
         const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: getOrderCollection().path,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw contextualError;
    }
};

export const addOrder = async (order: Omit<Order, 'id' | 'date' | 'status' | 'validationCode'>): Promise<Order> => {
    const validationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newOrderData = {
        ...order,
        date: serverTimestamp(),
        status: 'En attente' as OrderStatus,
        validationCode,
    };

    try {
        const docRef = await addDoc(getOrderCollection(), newOrderData);
        return {
            ...newOrderData,
            id: docRef.id,
            date: new Date().toISOString(), // Use client date for immediate object return
        };
    } catch (e) {
        const contextualError = new FirestorePermissionError({
          operation: 'create',
          path: getOrderCollection().path,
          requestResourceData: newOrderData,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw contextualError;
    }
};

export const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const orderDoc = doc(db, 'orders', id);
    try {
      await updateDoc(orderDoc, { status });
    } catch(e) {
        const contextualError = new FirestorePermissionError({
            operation: 'update',
            path: orderDoc.path,
            requestResourceData: { status },
        });
        errorEmitter.emit('permission-error', contextualError);
        throw contextualError;
    }
};


export const validateOrderDelivery = async (orderId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    const orderDocRef = doc(db, 'orders', orderId);
    try {
        const docSnap = await getDoc(orderDocRef);
        if (!docSnap.exists()) {
            return { success: false, error: "Commande non trouvée." };
        }
        
        const order = fromFirestore(docSnap as QueryDocumentSnapshot<DocumentData>);

        if (order.validationCode !== code.trim()) {
            return { success: false, error: "Le code de validation est incorrect." };
        }
        if (order.status === 'Livré') {
            return { success: false, error: 'Erreur : code déjà utilisé.' };
        }
        if (order.status === 'Annulé') {
            return { success: false, error: 'Cette commande a été annulée.' };
        }
        
        await updateOrderStatus(order.id, 'Livré');
        return { success: true };

    } catch (error: any) {
        console.error("Error validating delivery:", error);
        // This function is called from the admin panel, so permission errors should be handled.
        const contextualError = new FirestorePermissionError({
          operation: 'get', // Or 'update' depending on where it failed
          path: orderDocRef.path,
        });
        errorEmitter.emit('permission-error', contextualError);
        return { success: false, error: "Échec de la recherche ou de la mise à jour de la commande." };
    }
};

export const getOrderByValidationCode = async (code: string): Promise<Order | null> => {
    const q = query(collection(db, "orders"), where("validationCode", "==", code));
    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return null;
        }
        return fromFirestore(snapshot.docs[0]);
    } catch (e) {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: getOrderCollection().path,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw contextualError;
    }
}
