'use server';

import { getShoeRecommendations } from '@/ai/flows/shoe-style-recommendation';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';

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

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const results = await new Promise<{ secure_url: string } | { error: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream({}, (error, result) => {
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
       // This part might be redundant due to the promise rejection but kept for safety.
       console.error('Cloudinary upload error:', results.error);
       return { error: `Échec de l'upload sur Cloudinary. Détails : ${results.error?.message || 'Erreur inconnue'}` };
    }

  } catch (error: any) {
    console.error('Image upload failed:', error);
    return { error: `Échec de la conversion du fichier ou de l'upload. Détails : ${error.message || 'Erreur inconnue'}` };
  }
}