═══════════════════════════════════════════════════════
REGLAS GLOBALES DEL PROYECTO — LEER ANTES DE CUALQUIER CAMBIO
═══════════════════════════════════════════════════════

CONTEXTO GENERAL:
Mi aplicación es Markix: web app en React + Firebase para gestión de negocios
(pedidos, inventario, clientes, reseñas, asistente WhatsApp). Ya tiene un motor
de IA existente (DeepSeek) integrado en cada página. Estoy añadiendo una SEGUNDA
CAPA de IA llamada "JEV AI" que funciona como copiloto sobre la app existente.

ARQUITECTURA ALCANZADA / EN CURSO:
- 5 pilares: WhatsApp asistente, Inventario, Retención, Reseñas, Pedidos.
- 1 vista central: Resumen Ejecutivo (cruza los 5 pilares).
- 1 colección compartida: jev_memory (esquema y helpers definidos en
  src/jev/jevMemory.ts — usar SIEMPRE esas funciones, nunca escribir directo
  a la colección).

═══════════════════════════════════════════════════════
LAS 10 REGLAS DE ORO (obligatorias en TODA tarea)
═══════════════════════════════════════════════════════

1. NO MODIFICAR LÓGICA EXISTENTE.
   El motor DeepSeek y toda la lógica actual de las páginas de Markix quedan
   intactos. JEV AI es una capa que se ENCIMA, nunca un reemplazo.

2. NO MODIFICAR ESQUEMAS FIREBASE EXISTENTES.
   Solo se permite: (a) crear la colección jev_memory ya definida, (b) leer
   colecciones existentes. Prohibido escribir en colecciones de Markix.

3. JEV AI SOLO LEE Y PROPONE. NUNCA EJECUTA.
   No envía mensajes, no publica respuestas, no cambia estados, no hace
   pedidos. Todo lo que genera son BORRADORES y PROPUESTAS que el usuario
   copia/aprueba y aplica por los flujos ya existentes de Markix.

4. AISLAMIENTO TOTAL: prefijo "jev/".
   Todo código nuevo vive en src/jev/ (servicios: contextAggregator*.ts,
   jevEngine*.ts; componentes: JevCopilotWidget*.tsx, JevResumenEjecutivo.tsx;
   utilidades: jevMemory.ts). Cero imports circulares con el código de Markix.

5. INTEGRACIÓN POR COMPOSICIÓN.
   Los widgets se agregan envolviendo componentes o añadiendo rutas nuevas.
   Prohibido editar la lógica interna de componentes existentes de Markix.
   CADA página debe verse y funcionar EXACTAMENTE igual que antes, con el
   widget de JEV AI añadido encima como capa adicional.

6. FORMATO ÚNICO DE MEMORIA.
   Toda acción se registra con registrarAccionJev() y se cierra con
   cerrarAccionJev() de src/jev/jevMemory.ts, respetando el esquema base:
   { usuarioId, pilar, accion, fechaAccion, referenciaId, metricasAntes,
     sugerenciaJev, accionReal, resultado, resultadoDetalle, fechaCierre,
     valorImpacto }. Prohibido inventar campos fuera del esquema sin
   documentarlo primero.

7. SEGURIDAD POR USUARIO.
   jev_memory es privada por usuarioId (reglas de Firestore ya definidas).
   Cualquier consulta nueva debe filtrar SIEMPRE por usuarioId del usuario
   autenticado. Nunca exponer datos entre usuarios.

8. RESPUESTAS DE JEV AI: español, breves y accionables.
   Los System prompts de los jevEngines deben exigir: respuestas cortas,
   priorizadas, con motivo concreto y dato que la respalde ("cliente X, 25
   días sin comprar, $80.000 de gasto histórico"). Prohibido texto genérico
   o relleno.

9. APRENDIZAJE OBLIGATORIO.
   Todo jevEngine debe recibir el historial de jev_memory en su contexto y
   usarlo para: repetir estrategias que funcionaron (resultado positivo +
   valorImpacto alto) y descartar las que no. Si no hay historial, decirlo
   y trabajar solo con datos actuales.

10. VERIFICACIÓN POST-CAMBIO (checklist obligatorio antes de dar una tarea
    por terminada):
    □ La página original funciona idéntica a antes (flujo completo probado).
    □ El widget JEV solo aparece en SU página (o en la nueva ruta).
    □ Los datos que lee JEV son solo lectura.
    □ Las acciones se registran y cierran correctamente en jev_memory.
    □ Ninguna regla de Firestore existente fue modificada.
    □ No hay errores de consola ni warnings nuevos.

═══════════════════════════════════════════════════════
MAPA DE ARCHIVOS JEV (referencia rápida)
═══════════════════════════════════════════════════════

src/jev/
├── jevMemory.ts                      → helpers compartidos (ÚNICO acceso a
│                                       la colección jev_memory)
├── contextAggregatorWhatsapp.ts      → contexto WhatsApp (solo lectura)
├── jevEngineWhatsapp.ts              → cerebro JEV WhatsApp
├── JevCopilotWidgetWhatsapp.tsx      → widget en página WhatsApp
├── contextAggregatorInventario.ts
├── jevEngineInventario.ts
├── JevCopilotWidgetInventario.tsx
├── contextAggregatorRetencion.ts
├── jevEngineRetencion.ts
├── JevCopilotWidgetRetencion.tsx
├── contextAggregatorResenas.ts
├── jevEngineResenas.ts
├── JevCopilotWidgetResenas.tsx
├── contextAggregatorPedidos.ts
├── jevEnginePedidos.ts
├── JevCopilotWidgetPedidos.tsx
├── contextAggregatorResumen.ts       → consolida los 5 agregadores
├── jevEngineResumen.ts               → cerebro cruzado (5 pilares + memoria)
└── JevResumenEjecutivo.tsx           → página /dashboard/resumen-ejecutivo
