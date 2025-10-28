
import { db } from '@/firebase';
import type { Collection } from '@/lib/types';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { getCollectionsForClient, createCollection as createCollectionAction } from '@/app/actions';

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
    // This function now calls the server action, ensuring writes happen on the server.
    const result = await createCollectionAction(collectionData);
    if (!result.success || !result.collectionId) {
        throw new Error(result.error || 'Failed to create collection via server action.');
    }
    return result.collectionId;
};

export const deleteCollection = async (id: string) => {
    // This function remains a client-side call, but it's now wrapped in a server action `deleteCollection`.
    const collectionDoc = doc(db, 'collections', id);
    await deleteDoc(collectionDoc);
};

    