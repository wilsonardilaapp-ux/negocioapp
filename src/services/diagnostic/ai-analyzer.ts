'use server';

/**
 * @fileOverview Motor de análisis estratégico con IA para el Diagnóstico Comercial.
 * - Consume el proveedor de IA activo (Google AI, OpenAI, DeepSeek, etc.).
 * - Genera un análisis estructurado basado en los 4 pilares del Corazón de Markix.
 * - FIX: Implementa instanciación local de Genkit para inyectar API Keys dinámicas sin depender de variables de entorno.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from 'genkitx-openai';
import { z } from 'zod';
import { getAIConfig } from '@/ai/flows/chat-flow';
import type { DiagnosticRawData } from './data-extractor';

const PillarAnalysisSchema = z.object({
  status: z.enum(['green', 'yellow', 'red']),
  realState: z.string().describe('Descripción del estado actual basado en los datos leídos.'),
  hasOpportunity: z.boolean().describe('¿Existe una oportunidad clara de mejora o venta?'),
  opportunityData: z.string().describe('Dato concreto que respalda la oportunidad.'),
  recommendation: z.string().describe('Acción directa y específica para el dueño del negocio.'),
  priority: z.enum(['High', 'Medium', 'Low']).describe('Nivel de urgencia de la recomendación.'),
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

export type PillarAnalysis = z.infer<typeof PillarAnalysisSchema>;
export type DiagnosticAnalysis = z.infer<typeof DiagnosticAnalysisSchema>;

/**
 * Procesa los datos reales con el LLM activo para generar el informe estratégico.
 */
export async function analyzeDiagnosticWithAI(
  rawData: DiagnosticRawData,
  sourcesReviewed: number,
  businessId: string
): Promise<DiagnosticAnalysis> {
  const aiConfig = await getAIConfig(businessId);

  if (!aiConfig.apiKey) {
    throw new Error('No hay un motor de IA configurado o activo en la plataforma.');
  }

  // --- SOLUCIÓN QUIRÚRGICA: Instancia local de Genkit para inyección de llaves dinámicas ---
  const instancePlugins = [];
  
  if (aiConfig.provider === 'googleai') {
    instancePlugins.push(googleAI({ apiKey: aiConfig.apiKey }));
  } else {
    // Configuración para OpenAI, DeepSeek y otros compatibles
    const openAIConfig: any = { apiKey: aiConfig.apiKey };
    if (aiConfig.provider === 'deepseek') {
      openAIConfig.baseURL = 'https://api.deepseek.com/v1';
    }
    instancePlugins.push(openAI(openAIConfig));
  }

  const localAi = genkit({
    plugins: instancePlugins,
  });

  const modelId = aiConfig.provider === 'googleai' 
    ? `googleai/${aiConfig.model}` 
    : `openai/${aiConfig.model}`;
  // ---------------------------------------------------------------------------------------

  const constructionWarning = sourcesReviewed < 8 
    ? `⚠️ AVISO IMPORTANTE: Este informe está en construcción. Faltan ${15 - sourcesReviewed} fuentes por revisar para tener el panorama completo. Menciona esto en el resumen ejecutivo.`
    : "";

  const systemPrompt = `Eres el Consultor Senior de Estrategia Comercial de Markix.
Tu misión es analizar la salud de un negocio basado en "El Corazón de Markix".

DATOS REALES DEL NEGOCIO:
${JSON.stringify(rawData, null, 2)}

FUENTES REVISADAS: ${sourcesReviewed} de 15.
${constructionWarning}

INSTRUCCIONES DE ANÁLISIS:
1. Analiza los 4 pilares: 
   - Venta Proactiva: Uso de Chatbot, Sugerencias e IA.
   - Radar de Churn: Fidelización, puntos y clientes en riesgo.
   - Protección de Reputación: Valoraciones en directorio y respuestas.
   - Operación Blindada: Conexión entre Catálogo, Inventario, Contabilidad y Citas.
2. Identifica oportunidades reales: Si hay datos (ej. muchas ventas pero poco stock, o chatbot inactivo con muchas visitas), destaca la oportunidad.
3. Semáforos: 
   - Verde: Operación óptima.
   - Amarillo: Funcionalidades infrautilizadas.
   - Rojo: Riesgo de pérdida de dinero o clientes.
4. Contradicciones: Reporta si los datos de un módulo no coinciden con otro.
5. Lenguaje: Directo, humano, sin jerga corporativa compleja.

IMPORTANTE: Responde estrictamente en formato JSON que cumpla con el esquema solicitado.`;

  try {
    console.log(`[AI-ANALYZER] Iniciando generación con instancia local (${aiConfig.provider}) para negocio: ${businessId}`);
    
    const { output } = await localAi.generate({
      model: modelId as any,
      system: systemPrompt,
      prompt: 'Realiza el diagnóstico comercial exhaustivo del negocio basándote en los datos proporcionados.',
      output: {
        schema: DiagnosticAnalysisSchema,
      },
      config: {
        temperature: 0.2,
      },
    });

    if (!output) {
      throw new Error('El motor de IA no devolvió un análisis válido.');
    }

    return output;
  } catch (error: any) {
    console.error('[AI-ANALYZER] Error Crítico:', error.message);
    throw new Error('Error al procesar el análisis con IA: ' + error.message);
  }
}
