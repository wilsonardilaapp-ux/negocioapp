// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1',  // ← fuerza API estable, no preview
    }),
  ],
  model: 'googleai/gemini-2.0-flash',  // ← modelo por defecto global
});

console.log('✅ Genkit inicializado con soporte para Google AI.');
console.log('📝 Las API keys de Google AI se obtendrán desde Firestore por cada solicitud.\n');