'use server';

/**
 * @fileOverview Motor de análisis estratégico con IA para el Diagnóstico Comercial.
 * - Fase C: Implementa memoria estratégica inyectando acciones previas y sus resultados.
 * - Consume el proveedor de IA activo (Google AI, OpenAI, DeepSeek, etc.).
 * - Genera un análisis estructurado basado en los 4 pilares del Corazón de Markix.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { getAIConfig } from '@/ai/flows/chat-flow';
import type { DiagnosticRawData } from './data-extractor';
import type { ActionTracking } from './impact-evaluator';

const PillarAnalysisSchema = z.object({
  status: z.enum(['green', 'yellow', 'red']),
  realState: z.string().describe('Descripción del estado actual basado en los datos leídos.'),
  hasOpportunity: z.boolean().describe('¿Existe una oportunidad clara de mejora o venta?'),
  opportunityData: z.string().describe('Dato concreto que respalda la oportunidad.'),
  recommendation: z.string().describe('Acción directa y específica para el dueño del negocio.'),
  priority: z.enum(['High', 'Medium', 'Low']).describe('Nivel de urgencia de la recomendación.'),
  learningNote: z.string().optional().describe('Nota breve que explica cómo el historial de acciones previas influyó en esta recomendación (Fase C).'),
  contradictions: z.array(z.string()).optional().describe('Discrepancias detectadas entre diferentes fuentes de datos.'),
});

const DiagnosticAnalysisSchema = z.object({
  executiveSummary: z.string().describe('Resumen de un párrafo sobre la salud comercial del negocio.'),
  pillars: z.object({
    ventaProactiva: PillarAnalysisSchema,
    radarChurn: PillarAnalysisSchema,
    reputacion: PillarAnalysisSchema,
    operacionBlindada: PillarAnalysisSchema,
  }),
});

export type PillarAnalysis = z.infer<typeof PillarAnalysisSchema> & { recommendationId?: string };
export type DiagnosticAnalysis = {
  executiveSummary: string;
  pillars: {
    ventaProactiva: PillarAnalysis;
    radarChurn: PillarAnalysis;
    reputacion: PillarAnalysis;
    operacionBlindada: PillarAnalysis;
  };
};

function extractJson(text: string) {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        return null;
    }
}

export async function analyzeDiagnosticWithAI(
  rawData: DiagnosticRawData,
  sourcesReviewed: number,
  businessId: string,
  reportId: string,
  previousActions: ActionTracking[] = [] // Fase C: Inyección de memoria
): Promise<DiagnosticAnalysis> {
  const aiConfig = await getAIConfig(businessId);

  if (!aiConfig.apiKey) {
    throw new Error('No hay un motor de IA configurado o activo en la plataforma.');
  }

  const constructionWarning = sourcesReviewed < 8 
    ? `⚠️ AVISO IMPORTANTE: Este informe está en construcción. Faltan ${15 - sourcesReviewed} fuentes por revisar para tener el panorama completo. Menciona esto en el resumen ejecutivo.`
    : "";

  // Formatear historial de acciones para el prompt
  const learningContext = previousActions.length > 0 
    ? `\nCONTEXTO DE APRENDIZAJE Y ACCIONES PREVIAS DEL NEGOCIO:
${previousActions.map(a => `- Pilar: ${a.pilar} | Acción: "${a.description}" | Resultado: ${a.impactStatus || 'En curso'} | Valor Inicial: ${a.baselineValue} -> Valor Actual: ${a.resultValue || 'Pendiente'}`).join('\n')}

INSTRUCCIONES DE APRENDIZAJE:
- Si una acción previa tuvo resultado positivo (improved), valida el logro en la 'learningNote' y sugiere el siguiente paso evolutivo.
- Si una acción previa no mostró mejoras (declined/stable), NO repitas la misma recomendación: cambia de ángulo táctico y explica brevemente el ajuste en la 'learningNote'.
- Si no hay acciones previas para un pilar o el resultado es 'too_early', ignora este contexto para ese pilar.`
    : "\nNo hay historial de acciones previas aplicadas para este negocio.";

  const systemPrompt = `Eres el Consultor Senior de Estrategia Comercial de Markix.
Tu misión es analizar la salud de un negocio basado en "El Corazón de Markix".

DATOS REALES DEL NEGOCIO:
${JSON.stringify(rawData, null, 2)}

FUENTES REVISADAS: ${sourcesReviewed} de 15.
${constructionWarning}
${learningContext}

INSTRUCCIONES DE ANÁLISIS:
1. Analiza los 4 pilares: 
   - Venta Proactiva: Uso de Chatbot, Sugerencias e IA.
   - Radar de Churn: Fidelización, puntos y clientes en riesgo.
   - Protección de Reputación: Valoraciones en directorio y respuestas.
   - Operación Blindada: Conexión entre Catálogo, Inventario, Contabilidad y Citas.
2. Identifica oportunidades reales respaldadas por datos.
3. Semáforos: Verde (Óptimo), Amarillo (Mejorable), Rojo (Riesgo).
4. Lenguaje: Directo, empático y humano. CERO invención de datos.

IMPORTANTE: Responde estrictamente en formato JSON que cumpla con el esquema definido.`;

  try {
    let result: any;
    
    if (aiConfig.provider === 'googleai') {
        const localAi = genkit({ plugins: [googleAI({ apiKey: aiConfig.apiKey })] });
        const { output } = await localAi.generate({
            model: `googleai/${aiConfig.model}`,
            system: systemPrompt,
            prompt: 'Genera el diagnóstico comercial estructurado.',
            output: { schema: DiagnosticAnalysisSchema },
            config: { temperature: 0.2 },
        });
        result = output;
    } else {
        const endpoint = aiConfig.provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${aiConfig.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: aiConfig.model,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Genera el JSON.' }],
                temperature: 0.2,
                response_format: { type: "json_object" } 
            }),
        });

        if (!response.ok) throw new Error(`API Error ${response.status}`);
        const data = await response.json();
        result = extractJson(data.choices?.[0]?.message?.content || "");
    }

    if (!result) throw new Error('No se pudo procesar el análisis estructurado.');

    const validated = DiagnosticAnalysisSchema.parse(result);
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
    console.error('[AI-ANALYZER] Error:', error.message);
    throw new Error('Fallo en análisis IA: ' + error.message);
  }
}
