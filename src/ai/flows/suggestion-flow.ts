
'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { SuggestionRule, DayOfWeek } from '@/models/suggestion-rule';
import type { Product } from '@/models/product';
import type { SuggestionInput, SuggestionOutput } from '@/models/suggestion-io';

// ============================================
// LÓGICA CON ZONA HORARIA Y RESPALDO IA POR REGLA
// ============================================

export async function getSuggestion(input: SuggestionInput): Promise<SuggestionOutput> {
  const reqId = Date.now().toString().slice(-4);
  const logPrefix = `[SUGGESTION-${reqId}]`;

  console.log(`\n${logPrefix} 🚀 INICIANDO ANÁLISIS PARA: ${input.productId}`);

  try {
    const { businessId, productId } = input;
    if (!businessId || !productId) return createEmptyResponse();

    const firestore = await getAdminFirestore();

    // 1. BUSCAR TODAS LAS REGLAS ACTIVAS PARA EL PRODUCTO
    const rulesPath = `businesses/${businessId}/suggestionRules`;
    const rulesQuery = firestore
      .collection(rulesPath)
      .where('triggerItem', '==', productId)
      .where('active', '==', true);
    
    const rulesSnap = await rulesQuery.get();
    
    if (rulesSnap.empty) {
      console.log(`${logPrefix} ℹ️ No hay reglas manuales para este producto. Terminando flujo.`);
      return createEmptyResponse();
    }

    const allRules = rulesSnap.docs.map(d => ({ ...d.data(), id: d.id } as SuggestionRule));
    console.log(`${logPrefix} 📋 Se encontraron ${allRules.length} regla(s) activa(s).`);

    // 2. FILTRAR REGLAS VÁLIDAS SEGÚN CONDICIONES DE TIEMPO/DÍA
    const validRules = allRules.filter(rule => {
      const ruleTimezone = rule.timezone || 'America/Bogota';
      const localTime = new Date().toLocaleTimeString('en-US', { timeZone: ruleTimezone, hour12: true, hour: '2-digit', minute: '2-digit' });
      const localDay = new Date().toLocaleDateString('es-ES', { timeZone: ruleTimezone, weekday: 'long' }).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      console.log(`${logPrefix}    🌍 Validando Regla ${rule.id} | Zona: ${ruleTimezone} | Hora Local: ${localTime} | Día: ${localDay}`);

      if (rule.conditions?.daysOfWeek?.length) {
        const normalizedDBDays = rule.conditions.daysOfWeek.map(d => d.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        if (!normalizedDBDays.includes(localDay as any)) {
          console.log(`${logPrefix}       ❌ Día incorrecto.`);
          return false;
        }
      }
      
      if (rule.conditions?.timeRange?.start && rule.conditions?.timeRange?.end) {
        if (!isTimeInRange(localTime, rule.conditions.timeRange.start, rule.conditions.timeRange.end)) {
          console.log(`${logPrefix}       ❌ Fuera de horario.`);
          return false;
        }
      }
      
      console.log(`${logPrefix}       ✅ Regla VÁLIDA por condiciones.`);
      return true;
    });
    
    // 3. DECIDIR QUÉ HACER
    // CASO A: Hay reglas que cumplen las condiciones
    if (validRules.length > 0) {
      validRules.sort((a, b) => (a.priority || 10) - (b.priority || 10));
      const bestRule = validRules[0];
      console.log(`${logPrefix} ✅ Aplicando regla manual de mayor prioridad: ${bestRule.id}`);

      const suggestedDoc = await firestore.doc(`businesses/${businessId}/products/${bestRule.suggestedItem}`).get();
      if (suggestedDoc.exists) {
        return {
          suggestedProduct: { ...suggestedDoc.data(), id: suggestedDoc.id } as Product,
          suggestionType: bestRule.suggestionType,
          reason: 'Sugerencia especial',
          ruleId: bestRule.id,
        };
      }
    }

    // CASO B: No hay reglas válidas AHORA, pero SÍ había reglas para el producto.
    // Verificamos si alguna de ellas permite el respaldo con IA.
    console.log(`${logPrefix} ⚠️ No hay reglas manuales válidas en este momento.`);
    const allowAIFallback = allRules.some(rule => rule.fallbackToAI === true);

    if (allowAIFallback) {
        console.log(`${logPrefix} 🤖 Respaldo con IA está activado en al menos una regla. Intentando sugerencia automática...`);
        // Aquí iría la llamada a la función de IA. Por ahora, devolvemos vacío como placeholder.
        // return await tryAISuggestion(businessId, productId, firestore, logPrefix);
        return createEmptyResponse(); 
    }

    // CASO C: No hay reglas válidas y no se permite respaldo con IA.
    console.log(`${logPrefix} ⏹️ Sin reglas válidas y sin respaldo de IA permitido. No se muestra sugerencia.`);
    return createEmptyResponse();

  } catch (error) {
    console.error(`${logPrefix} ❌ Error:`, error);
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
