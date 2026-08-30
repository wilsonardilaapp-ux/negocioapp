'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { SuggestionRule } from '@/models/suggestion-rule';
import type { Product } from '@/models/product';
import type { SuggestionInput, SuggestionOutput } from '@/models/suggestion-io';

/**
 * @fileOverview Motor de Sugerencias con Resolución Híbrida y Logs de Auditoría.
 */

export async function getSuggestion(input: SuggestionInput): Promise<SuggestionOutput> {
  const { businessId, productId } = input;
  console.log('🔴 [DEBUG getSuggestion INPUT]:', { businessId, productId });

  try {
    if (!businessId || !productId) return createEmptyResponse();

    const firestore = await getAdminFirestore();

    // --- PASO 1: RESOLUCIÓN DE IDENTIDAD (Nombre -> ID) ---
    // El Dashboard guarda 'triggerItem' como ID. Si recibimos un nombre, debemos traducirlo.
    let triggerId = productId;
    
    // Si no parece un ID de Firestore (20 caracteres), buscamos por nombre
    if (productId.length !== 20 || productId.includes(' ')) {
        const nameQuery = await firestore.collection(`businesses/${businessId}/products`)
            .get();
        
        const matchedProduct = nameQuery.docs.find(d => 
            d.data().name?.toLowerCase().trim() === productId.toLowerCase().trim()
        );
        
        if (matchedProduct) {
            triggerId = matchedProduct.id;
            console.log(`🎯 [ID RESOLVED]: ${productId} -> ${triggerId}`);
        }
    }

    // --- PASO 2: BUSCAR REGLA ACTIVA (Alineado con el Dashboard) ---
    const rulesPath = `businesses/${businessId}/suggestionRules`;
    const rulesQuery = firestore
      .collection(rulesPath)
      .where('triggerItem', '==', triggerId)
      .where('active', '==', true);
                                                      
    const rulesSnap = await rulesQuery.get();
    
    // Log solicitado para auditoría de terminal
    console.log('✅ [FIRESTORE RULES FOUND]:', rulesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    if (rulesSnap.empty) {
      const fallback = createEmptyResponse();
      console.log('🔴 [DEBUG getSuggestion RESULT]:', fallback);
      return fallback;
    }

    // --- PASO 3: OBTENER PRODUCTO SUGERIDO ---
    // Tomamos la regla con mayor prioridad (menor número)
    const allRules = rulesSnap.docs.map(d => ({ ...d.data(), id: d.id } as SuggestionRule));
    allRules.sort((a, b) => (a.priority || 10) - (b.priority || 10));
    const bestRule = allRules[0];

    const suggestedDoc = await firestore.doc(`businesses/${businessId}/products/${bestRule.suggestedItem}`).get();
    
    if (suggestedDoc.exists) {
      const suggestion: SuggestionOutput = {
        suggestedProduct: { ...suggestedDoc.data(), id: suggestedDoc.id } as Product,
        suggestionType: bestRule.suggestionType,
        reason: 'Sugerencia especial para ti',
        ruleId: bestRule.id,
      };
      console.log('🔴 [DEBUG getSuggestion RESULT]:', suggestion);
      return suggestion;
    }

    return createEmptyResponse();

  } catch (error) {
    console.error(`[SUGGESTION] ❌ Error crítico:`, error);
    return createEmptyResponse();
  }
}

function createEmptyResponse(): SuggestionOutput {
  return { suggestedProduct: null, suggestionType: 'none', reason: '', ruleId: null };
}
