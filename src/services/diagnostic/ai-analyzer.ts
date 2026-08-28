'use server';

/**
 * @fileOverview Motor de análisis estratégico con IA para el Diagnóstico Comercial.
 * - Consume el proveedor de IA activo (Google AI, OpenAI, DeepSeek, etc.).
 * - Genera un análisis estructurado basado en los 4 pilares del Corazón de Markix.
 * - FIX: Implementa enrutamiento dual. Genkit para Google AI y Fetch directo para compatibles con OpenAI (DeepSeek).
 * - Garantiza compatibilidad con modelos externos sin errores de registro en el plugin.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
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
 * Limpia y parsea un bloque de texto que contiene JSON, manejando posibles bloques de código markdown.
 */
function extractJson(text: string) {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error("[AI-ANALYZER] Error parseando JSON de respuesta:", e);
        return null;
    }
}

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

IMPORTANTE: Responde estrictamente en formato JSON que cumpla con el siguiente esquema:
{
  "executiveSummary": "párrafo",
  "pillars": {
    "ventaProactiva": { "status": "green|yellow|red", "realState": "...", "hasOpportunity": boolean, "opportunityData": "...", "recommendation": "...", "priority": "High|Medium|Low", "contradictions": [] },
    "radarChurn": { ... },
    "reputacion": { ... },
    "operacionBlindada": { ... }
  }
}`;

  try {
    console.log(`[AI-ANALYZER] Iniciando generación (${aiConfig.provider}) para negocio: ${businessId}`);
    
    // RUTA 1: Google AI (Gemini) usando Genkit
    if (aiConfig.provider === 'googleai') {
        const localAi = genkit({
            plugins: [googleAI({ apiKey: aiConfig.apiKey })],
        });

        const { output } = await localAi.generate({
            model: `googleai/${aiConfig.model}`,
            system: systemPrompt,
            prompt: 'Realiza el diagnóstico comercial exhaustivo del negocio basándote en los datos proporcionados.',
            output: {
                schema: DiagnosticAnalysisSchema,
            },
            config: {
                temperature: 0.2,
            },
        });

        if (!output) throw new Error('El motor de IA no devolvió un análisis válido.');
        return output;
    }

    // RUTA 2: Proveedores compatibles con OpenAI (DeepSeek, OpenAI, Groq, etc.) usando Fetch
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    if (aiConfig.provider === 'deepseek') {
        endpoint = 'https://api.deepseek.com/chat/completions';
    } else if (aiConfig.provider === 'groq') {
        endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    }

    console.log(`[AI-ANALYZER] Despachando vía Fetch a: ${endpoint}`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${aiConfig.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: aiConfig.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Genera el JSON de diagnóstico comercial.' }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" } 
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error API ${aiConfig.provider} (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const jsonResult = extractJson(rawContent);

    if (!jsonResult) {
        throw new Error('No se pudo extraer un formato JSON válido de la respuesta de la IA.');
    }

    // Validación final con Zod para asegurar integridad de la interfaz
    return DiagnosticAnalysisSchema.parse(jsonResult);

  } catch (error: any) {
    console.error('[AI-ANALYZER] Error Crítico:', error.message);
    throw new Error('Error al procesar el análisis con IA: ' + error.message);
  }
}
