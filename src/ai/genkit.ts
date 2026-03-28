// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Inicializar Genkit con los plugins de IA.
// La API key para Google AI se pasará dinámicamente en cada llamada desde Firestore.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});

console.log('✅ Genkit inicializado con soporte para Google AI.');
console.log('📝 Las API keys de Google AI se obtendrán desde Firestore por cada solicitud.\n');
