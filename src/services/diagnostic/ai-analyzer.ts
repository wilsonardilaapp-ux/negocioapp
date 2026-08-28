'use server';

/**
 * @fileOverview Motor de análisis estratégico con IA para el Diagnóstico Comercial.
 * - Implementa un extractor JSON resiliente para evitar errores 500 por formato.
 * - Soporta normalización de llaves (alias) para mayor compatibilidad con LLMs.
 * - Fase C: Implementa memoria estratégica inyectando acciones previas y sus resultados.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { getAIConfig } from '@/ai/flows/chat-flow';
import type { DiagnosticRawData } from './data-extractor';
import type { ActionTracking } from './impact-evaluator';

// --- ESQUEMAS DE VALIDACIÓN BLINDADOS ---

const PillarAnalysisSchema = z.object({
  status: z.enum(['green', 'yellow', 'red']).default('yellow'),
  realState: z.string().default('Estado no disponible en este momento.'),
  hasOpportunity: z.boolean().default(false),
  opportunityData: z.string().default('No se detectaron datos de oportunidad.'),
  recommendation: z.string().default('Sigue monitoreando tus indicadores clave.'),
  priority: z.enum(['High', 'Medium', 'Low']).default('Medium'),
  learningNote: z.string().optional(),
  contradictions: z.array(z.string()).optional().default([]),
});

const DiagnosticAnalysisSchema = z.object({
  executiveSummary: z.string().default('Resumen ejecutivo pendiente de generación.'),
  pillars: z.object({
    ventaProactiva: PillarAnalysisSchema,
    radarChurn: PillarAnalysisSchema,
    reputacion: PillarAnalysisSchema,
    operacionBlindada: PillarAnalysisSchema,
  }).default({
    ventaProactiva: PillarAnalysisSchema.parse({}),
    radarChurn: PillarAnalysisSchema.parse({}),
    reputacion: PillarAnalysisSchema.parse({}),
    operacionBlindada: PillarAnalysisSchema.parse({}),
  }),
});

export type PillarAnalysis = z.infer<typeof PillarAnalysisSchema> & { recommendationId?: string };
export type DiagnosticAnalysis = z.infer<typeof DiagnosticAnalysisSchema>;

// --- UTILIDADES DE PARSEO RESILIENTE ---

/**
 * Extrae el bloque JSON de una cadena de texto, eliminando markdown y ruidos.
 */
function extractJsonBlock(text: string): Record<string, unknown> | null {
  try {
    // Intentar encontrar el primer '{' y el último '}'
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1) return null;
    
    const jsonString = text.substring(startIndex, endIndex + 1);
    return JSON.parse(jsonString) as Record<string, unknown>;
  } catch (e) {
    console.error('[AI-ANALYZER] Error de parseo JSON bruto:', e);
    return null;
  }
}

/**
 * Normaliza los nombres de las llaves devueltas por la IA (Aliasing).
 * Maneja traducciones comunes que suelen hacer los LLMs a pesar de las instrucciones.
 */
function normalizeAiResponse(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...raw };

  // Mapeo de Resumen Ejecutivo
  if (!normalized.executiveSummary) {
    normalized.executiveSummary = raw.resumenEjecutivo || raw.resumen || raw.summary;
  }

  // Mapeo de Pilares
  if (!normalized.pillars && (raw.pilares || raw.analisis || raw.pillars_analysis)) {
    const rawPillars = (raw.pilares || raw.analisis || raw.pillars_analysis) as Record<string, unknown>;
    normalized.pillars = {
      ventaProactiva: rawPillars.ventaProactiva || rawPillars.venta_proactiva || rawPillars.proactive_sales,
      radarChurn: rawPillars.radarChurn || rawPillars.radar_churn || rawPillars.churn_radar,
      reputacion: rawPillars.reputacion || rawPillars.reputation || rawPillars.protection,
      operacionBlindada: rawPillars.operacionBlindada || rawPillars.operacion_blindada || rawPillars.armored_operation,
    };
  }

  return normalized;
}

// Objeto de emergencia para evitar error 500
const FALLBACK_ANALYSIS: DiagnosticAnalysis = {
  executiveSummary: "El servicio de inteligencia está experimentando alta demanda. Se recomienda revisar los indicadores crudos manualmente.",
  pillars: {
    ventaProactiva: PillarAnalysisSchema.parse({ realState: "Análisis en pausa.", status: 'yellow' }),
    radarChurn: PillarAnalysisSchema.parse({ realState: "Análisis en pausa.", status: 'yellow' }),
    reputacion: PillarAnalysisSchema.parse({ realState: "Análisis en pausa.", status: 'yellow' }),
    operacionBlindada: PillarAnalysisSchema.parse({ realState: "Análisis en pausa.", status: 'yellow' }),
  }
};

// --- LÓGICA PRINCIPAL ---

export async function analyzeDiagnosticWithAI(
  rawData: DiagnosticRawData,
  sourcesReviewed: number,
  businessId: string,
  reportId: string,
  previousActions: ActionTracking[] = []
): Promise<DiagnosticAnalysis> {
  const aiConfig = await getAIConfig(businessId);

  if (!aiConfig.apiKey) {
    return FALLBACK_ANALYSIS;
  }

  const constructionWarning = sourcesReviewed < 15 
    ? `AVISO: Faltan ${15 - sourcesReviewed} fuentes por revisar.`
    : "";

  const learningContext = previousActions.length > 0 
    ? `CONTEXTO HISTÓRICO: ${JSON.stringify(previousActions.map(a => ({ pilar: a.pilar, accion: a.description, resultado: a.impactStatus })))}`
    : "";

  const systemPrompt = `Eres el Consultor Senior de Markix. Genera un diagnóstico comercial en formato JSON basado en estos datos: ${JSON.stringify(rawData)}. 
  Fuentes: ${sourcesReviewed}/15. ${constructionWarning}. ${learningContext}.
  
  Estructura JSON obligatoria:
  {
    "executiveSummary": "texto",
    "pillars": {
      "ventaProactiva": { "status": "green|yellow|red", "realState": "...", "hasOpportunity": true, "opportunityData": "...", "recommendation": "...", "priority": "High|Medium|Low", "learningNote": "..." },
      "radarChurn": { ...mismo formato... },
      "reputacion": { ...mismo formato... },
      "operacionBlindada": { ...mismo formato... }
    }
  }`;

  try {
    let rawAnswer = '';
    
    if (aiConfig.provider === 'googleai') {
        const localAi = genkit({ plugins: [googleAI({ apiKey: aiConfig.apiKey })] });
        const response = await localAi.generate({
            model: `googleai/${aiConfig.model}`,
            system: systemPrompt,
            prompt: 'Genera el JSON estructurado del diagnóstico comercial.',
            config: { temperature: 0.1 },
        });
        rawAnswer = response.text;
    } else {
        const endpoint = aiConfig.provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${aiConfig.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: aiConfig.model,
                messages: [{ role: 'system', content: systemPrompt }],
                temperature: 0.1,
                response_format: { type: "json_object" } 
            }),
        });

        if (!response.ok) throw new Error(`IA_API_ERROR: ${response.status}`);
        const data = await response.json();
        rawAnswer = data.choices?.[0]?.message?.content || "";
    }

    // 1. Extraer bloque JSON limpio
    const jsonBlock = extractJsonBlock(rawAnswer);
    if (!jsonBlock) throw new Error('NO_JSON_FOUND');

    // 2. Normalizar llaves (Alias)
    const normalizedData = normalizeAiResponse(jsonBlock);

    // 3. Validar con Zod (usando fallbacks definidos en el esquema)
    const validated = DiagnosticAnalysisSchema.parse(normalizedData);
    
    // Inyectar IDs de recomendación para el seguimiento de la Fase A
    return {
      executiveSummary: validated.executiveSummary,
      pillars: {
        ventaProactiva: { ...validated.pillars.ventaProactiva, recommendationId: `${reportId}_ventaProactiva` },
        radarChurn: { ...validated.pillars.radarChurn, recommendationId: `${reportId}_radarChurn` },
        reputacion: { ...validated.pillars.reputacion, recommendationId: `${reportId}_reputacion` },
        operacionBlindada: { ...validated.pillars.operacionBlindada, recommendationId: `${reportId}_operacionBlindada` },
      }
    };

  } catch (error: any) {
    console.error('[AI-ANALYZER] Error crítico en el flujo:', error.message);
    // Devolvemos el fallback en lugar de lanzar error 500
    return FALLBACK_ANALYSIS;
  }
}
