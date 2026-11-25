import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {resolveModelName} from '@/ai/model';

export const ai = genkit({
  plugins: [googleAI()],
  model: resolveModelName(),
});
