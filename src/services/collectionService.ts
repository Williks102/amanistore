
import { db } from '@/firebase';
import type { Collection } from '@/lib/types';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { getCollectionsForClient } from '@/app/actions';

const getCollectionRef = () => collection(db, 'collections');

export const getCollections = async (): Promise<Collection[]> => {
    const { collections, error } = await getCollectionsForClient();
    if (error) {
        console.error(error);
        // On an error, we'll return an empty array to prevent the app from crashing.
        // The error is already logged in the server action.
        return [];
    }
    return collections || [];
};

export const addCollection = async (collectionData: Omit<Collection, 'id'>) => {
    // This function remains a client-side call, but it's now wrapped in a server action `createCollection`.
    // It's kept here for structural consistency.
    const docRef = await addDoc(getCollectionRef(), collectionData);
    return docRef.id;
};

export const deleteCollection = async (id: string) => {
    // This function remains a client-side call, but it's now wrapped in a server action `deleteCollection`.
    const collectionDoc = doc(db, 'collections', id);
    await deleteDoc(collectionDoc);
};
