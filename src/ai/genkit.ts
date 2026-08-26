// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from 'genkitx-openai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1',  // ← fuerza API estable, no preview
    }),
    openAI(), // Registro del plugin de OpenAI para modelos compatibles (DeepSeek, etc)
  ],
  model: 'googleai/gemini-3.6-flash',  // ← modelo por defecto global actualizado
});

console.log('✅ Genkit inicializado con soporte para Google AI y OpenAI.');
console.log('📝 Las API keys se obtendrán dinámicamente según el proveedor configurado.\n');