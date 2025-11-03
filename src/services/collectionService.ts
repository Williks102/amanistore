
'use client'

import { db } from '@/firebase';
import type { Collection } from '@/lib/types';
import { deleteDoc, doc } from 'firebase/firestore';
// Import the new getCollections function and alias it to avoid name collision
import { getCollections as getCollectionsAction, createCollection as createCollectionAction, deleteCollection as deleteCollectionAction } from '@/app/actions';

/**
 * Fetches all collections from the backend.
 * This is a client-side service function that calls a server action.
 */
export const getCollections = async (): Promise<Collection[]> => {
    try {
        // The getCollectionsAction now directly returns the array of collections.
        const collections = await getCollectionsAction();
        return collections;
    } catch (error) {
        console.error("Error fetching collections in service:", error);
        return []; // Return empty array on error to prevent app crash
    }
};

/**
 * Creates a new collection.
 * This is a client-side service function that calls a server action.
 */
export const createCollection = async (collectionData: Omit<Collection, 'id'>): Promise<{ success: boolean; collectionId?: string; error?: string }> => {
    return await createCollectionAction(collectionData);
};

/**
 * Deletes a collection.
 * This is a client-side service function that calls a server action.
 */
export const deleteCollection = async (id: string): Promise<{ success: boolean; error?: string }> => {
    return await deleteCollectionAction(id);
}
