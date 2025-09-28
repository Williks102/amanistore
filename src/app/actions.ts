'use server';

import { getShoeRecommendations } from '@/ai/flows/shoe-style-recommendation';
import { z } from 'zod';

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
