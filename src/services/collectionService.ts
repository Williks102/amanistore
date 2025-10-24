
import { db } from '@/firebase';
import type { Collection } from '@/lib/types';
import { collection, getDocs, addDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const getCollectionRef = () => collection(db, 'collections');

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): Collection => {
    const data = snapshot.data();
    return {
        ...data,
        id: snapshot.id,
    } as Collection;
}

export const getCollections = async (): Promise<Collection[]> => {
    try {
        const snapshot = await getDocs(getCollectionRef());
        return snapshot.docs.map(fromFirestore);
    } catch (e) {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: getCollectionRef().path,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw contextualError;
    }
};

export const addCollection = async (collectionData: Omit<Collection, 'id'>) => {
    try {
        const docRef = await addDoc(getCollectionRef(), collectionData);
        return docRef.id;
    } catch (e) {
         const contextualError = new FirestorePermissionError({
          operation: 'create',
          path: getCollectionRef().path,
          requestResourceData: collectionData,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw contextualError;
    }
};

export const deleteCollection = async (id: string) => {
    const collectionDoc = doc(db, 'collections', id);
    try {
        await deleteDoc(collectionDoc);
    } catch (e) {
        const contextualError = new FirestorePermissionError({
            operation: 'delete',
            path: collectionDoc.path,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw contextualError;
    }
};
