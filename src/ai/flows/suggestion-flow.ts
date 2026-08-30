'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { SuggestionRule, DayOfWeek } from '@/models/suggestion-rule';
import type { Product } from '@/models/product';
import type { SuggestionInput, SuggestionOutput } from '@/models/suggestion-io';

// ============================================
// LÓGICA CON RESOLUCIÓN DE IDENTIDAD HÍBRIDA (ID/NOMBRE)
// ============================================

export async function getSuggestion(input: SuggestionInput): Promise<SuggestionOutput> {
  try {
    const { businessId, productId } = input;

    if (!businessId || !productId) return createEmptyResponse();

    const firestore = await getAdminFirestore();

    // --- PASO 1: RESOLUCIÓN DE IDENTIDAD (Convertir Nombre a ID si es necesario) ---
    let triggerId = productId;
    
    // Intentar obtener el producto directamente por ID
    const productRef = firestore.doc(`businesses/${businessId}/products/${productId}`);
    const productSnap = await productRef.get();
    
    if (!productSnap.exists) {
        // Si no existe el ID, buscamos por Nombre Exacto (Normalizado)
        const nameQuery = await firestore.collection(`businesses/${businessId}/products`)
            .where('name', '==', productId)
            .limit(1)
            .get();
        
        if (!nameQuery.empty) {
            triggerId = nameQuery.docs[0].id;
        }
    }

    // --- PASO 2: BUSCAR REGLA ACTIVA USANDO EL ID CANÓNICO ---
    const rulesPath = `businesses/${businessId}/suggestionRules`;
    const rulesQuery = firestore
      .collection(rulesPath)
      .where('triggerItem', '==', triggerId) // triggerItem en DB siempre es ID
      .where('active', '==', true);
                                                      
    const rulesSnap = await rulesQuery.get();
                                                              
    if (rulesSnap.empty) {
      return createEmptyResponse();
    }

    const allRules = rulesSnap.docs.map(d => ({ ...d.data(), id: d.id } as SuggestionRule));

    // --- PASO 3: FILTRAR POR CONDICIONES DE TIEMPO/DÍA ---
    const validRules = allRules.filter(rule => {
      const ruleTimezone = rule.timezone || 'America/Bogota';
      const now = new Date();
      const localTime = now.toLocaleTimeString('en-US', { timeZone: ruleTimezone, hour12: true, hour: '2-digit', minute: '2-digit' });
      const localDay = now.toLocaleDateString('es-ES', { timeZone: ruleTimezone, weekday: 'long' }).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (rule.conditions?.daysOfWeek?.length) {
        const normalizedDBDays = rule.conditions.daysOfWeek.map(d => d.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        if (!normalizedDBDays.includes(localDay as any)) return false;
      }
                                                                                                                          
      if (rule.conditions?.timeRange?.start && rule.conditions?.timeRange?.end) {
        if (!isTimeInRange(localTime, rule.conditions.timeRange.start, rule.conditions.timeRange.end)) return false;
      }
                                                                                                                  
      return true;
    });
                                                                                                                                      
    // --- PASO 4: OBTENER PRODUCTO SUGERIDO ---
    if (validRules.length > 0) {
      validRules.sort((a, b) => (a.priority || 10) - (b.priority || 10));
      const bestRule = validRules[0];

      const suggestedDoc = await firestore.doc(`businesses/${businessId}/products/${bestRule.suggestedItem}`).get();
      if (suggestedDoc.exists) {
        const result: SuggestionOutput = {
          suggestedProduct: { ...suggestedDoc.data(), id: suggestedDoc.id } as Product,
          suggestionType: bestRule.suggestionType,
          reason: 'Sugerencia especial para ti',
          ruleId: bestRule.id,
        };
        return result;
      }
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

function parseTime(timeStr: string): number {
  if (!timeStr) return -1;
  const clean = timeStr.toLowerCase().replace(/\./g, '').trim(); 
  const isPM = clean.includes('pm') || clean.includes('p m');
  const numbers = clean.replace(/[^0-9:]/g, '');
  if (!numbers.includes(':')) return -1;
  let [hours, minutes] = numbers.split(':').map(Number);
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  return (hours * 60) + (minutes || 0);
}

function isTimeInRange(current: string, start: string, end: string): boolean {
  try {
    const c = parseTime(current);
    const s = parseTime(start);
    const e = parseTime(end);
    if (c === -1 || s === -1 || e === -1) return false;
    if (s <= e) return c >= s && c <= e;
    else return c >= s || c <= e;
  } catch { return false; }
}
