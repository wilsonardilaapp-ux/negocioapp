'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';
import { getLoyaltyContext, ContextoLoyalty } from './contextAggregatorLoyalty';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface CopilotoLoyaltyOutput {
  diagnostico: string;
  totalVip: number;
  totalEnRiesgo: number;
  revenueRecuperado: number;
  promedioResenas: number;
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor JEV Copiloto para Fidelización e Inteligencia
 */
export async function obtenerCopilotoLoyalty(businessId: string): Promise<CopilotoLoyaltyOutput> {
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return new Proxy({
      diagnostico: "El módulo JEV Copiloto no está activo para el plan actual de este negocio.",
      fechaGeneracion: new Date().toISOString(),
    }, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        return 0;
      }
    }) as any;
  }

  if (!limitsInfo.canConsume) {
    return new Proxy({
      diagnostico: `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`,
      fechaGeneracion: new Date().toISOString(),
    }, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        return 0;
      }
    }) as any;
  }

  await consumeJevCopilotCredit(businessId);
  const contexto = await getLoyaltyContext(businessId);

  const accionesPrevias = contexto.historialMemoria.filter((m: any) => m.tipo === 'loyalty' || m.tipo === 'retencion');
  const patronesAprendidos: string[] = [];

  if (accionesPrevias.length > 0) {
    patronesAprendidos.push(`JEV recuerda ${accionesPrevias.length} acción(es) previas de fidelización ejecutadas con éxito.`);
  }
  if (contexto.recoveredRevenue > 0) {
    patronesAprendidos.push(`La IA ha recuperado $${contexto.recoveredRevenue.toLocaleString('es-CO')} en ventas atribuidas a campañas de fidelización.`);
  }
  if (contexto.promedioCalificacion >= 4.5) {
    patronesAprendidos.push(`Excelente reputación: calificación promedio de ${contexto.promedioCalificacion}/5 basada en reseñas recientes.`);
  }

  const diagnostico = contexto.totalChurnCount > 0
    ? `Atención: se detectaron ${contexto.totalChurnCount} cliente(s) en riesgo crítico de abandono. Tu comunidad VIP cuenta con ${contexto.vipCustomers.length} clientes destacados y se han recuperado $${contexto.recoveredRevenue.toLocaleString('es-CO')} mediante IA.`
    : `Tu programa de fidelización opera en condiciones óptimas. ${contexto.vipCustomers.length} clientes en el ranking VIP y reputación de ${contexto.promedioCalificacion} estrellas.`;

  return {
    diagnostico,
    totalVip: contexto.vipCustomers.length,
    totalEnRiesgo: contexto.totalChurnCount,
    revenueRecuperado: contexto.recoveredRevenue,
    promedioResenas: contexto.promedioCalificacion,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta contextual para el panel de fidelización
 */
export async function consultarJevLoyalty(businessId: string, pregunta: string): Promise<string> {
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }

  await consumeJevCopilotCredit(businessId);
  const contexto = await getLoyaltyContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('vip') || q.includes('mejores') || q.includes('ranking')) {
    if (contexto.vipCustomers.length === 0) return "Aún no hay clientes registrados en el ranking VIP.";
    const top = contexto.vipCustomers.slice(0, 3).map((c, i) => `${i+1}. ${c.name || 'Cliente'} (${c.points || 0} pts, $${(c.totalSpent || 0).toLocaleString('es-CO')})`).join(', ');
    return `Top clientes VIP: ${top}. Hay un total de ${contexto.vipCustomers.length} clientes en el ranking.`;
  }

  if (q.includes('riesgo') || q.includes('abandono') || q.includes('churn') || q.includes('recuperar')) {
    if (contexto.totalChurnCount === 0) return "Excelente noticia: actualmente no tienes clientes con alertas de abandono según el umbral configurado.";
    return `Hay ${contexto.totalChurnCount} cliente(s) en riesgo de churn. Puedes usar el botón 'Recuperar con IA' para reactivarlos automáticamente por WhatsApp.`;
  }

  if (q.includes('revenue') || q.includes('ingreso') || q.includes('recuperado') || q.includes('dinero') || q.includes('ventas')) {
    return `El revenue total recuperado por la IA es de $${contexto.recoveredRevenue.toLocaleString('es-CO')} en ${contexto.recoveredCount} cliente(s) reactivado(s).`;
  }

  if (q.includes('puntos') || q.includes('valor') || q.includes('premio')) {
    return `Configuración actual de puntos: 1 punto por cada $${contexto.puntosConfig.pointsPerCurrencyUnit} en compras. Cada punto equivale a $${contexto.puntosConfig.currencyValuePerPoint} al ser canjeado.`;
  }

  if (q.includes('reseña') || q.includes('review') || q.includes('opinión') || q.includes('calificacion')) {
    return `Calificación media actual: ${contexto.promedioCalificacion}/5 con ${contexto.recentReviews.length} reseñas registradas recientemente.`;
  }

  return `Resumen de Fidelización: ${contexto.vipCustomers.length} VIPs, ${contexto.totalChurnCount} en riesgo de abandono y $${contexto.recoveredRevenue.toLocaleString('es-CO')} recuperados por IA.`;
}

export async function registrarAccionFidelizacion({
  businessId,
  accion,
  detalle,
}: {
  businessId: string;
  accion: string;
  detalle: string;
}) {
  return registrarAccionJev({
    usuario: businessId,
    tipo: 'retencion',
    accion,
    origen: 'dashboard',
    datos: { detalle },
  });
}
