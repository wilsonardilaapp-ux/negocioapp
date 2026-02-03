// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Inicializar Genkit con el plugin de Google AI.
// La API key se pasará dinámicamente en cada llamada desde Firestore.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});

console.log('✅ Genkit inicializado con soporte para Google AI.');
console.log('📝 Las API keys se obtendrán desde Firestore por cada solicitud.\n');
