
import { db } from '@/firebase';
import type { Order, OrderStatus } from '@/lib/types';
import { collection, getDocs, addDoc, updateDoc, doc, DocumentData, QueryDocumentSnapshot, query, where, serverTimestamp, getDoc } from 'firebase/firestore';
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
