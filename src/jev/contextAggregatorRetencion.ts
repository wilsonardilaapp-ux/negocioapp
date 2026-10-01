import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface ClienteRetencionJev {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  gastoHistorico: number;
  frecuencia: number;
  ticketPromedio: number;
  ultimaCompraFecha: string;
  diasSinComprar: number;
  cicloHabitualDias: number;
  esVIP: boolean;
  nivelRiesgo: 'critico' | 'alerta' | 'vigilancia' | 'estable';
  motivoRiesgo: string;
  prioridadPuntaje: number;
}

export interface ContextoRetencion {
  businessId: string;
  totalClientes: number;
  clientesEnRiesgo: ClienteRetencionJev[];
  clientesVIP: ClienteRetencionJev[];
  todosLosClientes: ClienteRetencionJev[];
  gastoEnRiesgoTotal: number;
  historialMemoria: any[];
  estado: 'optimo' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Retención de Clientes (SOLO LECTURA).
 * Analiza órdenes históricas para calcular el ciclo de compra habitual vs inactividad de cada cliente.
 */
export async function getRetencionContext(businessId: string): Promise<ContextoRetencion> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT RETENCION] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    // 1. Lectura de Pedidos (SOLO LECTURA)
    const ordersSnap = await firestore
      .collection(`businesses/${businessId}/orders`)
      .orderBy('orderDate', 'desc')
      .limit(300)
      .get();

    if (ordersSnap.empty) {
      return {
        businessId,
        totalClientes: 0,
        clientesEnRiesgo: [],
        clientesVIP: [],
        todosLosClientes: [],
        gastoEnRiesgoTotal: 0,
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    const ahora = new Date().getTime();
    const clientesMap = new Map<string, {
      nombre: string;
      telefono: string;
      email?: string;
      gastos: number[];
      fechas: number[];
    }>();

    // 2. Agrupar historial por cliente
    ordersSnap.forEach((doc) => {
      const order = doc.data();
      const rawPhone = (order.customerPhone || '').replace(/\D/g, '');
      const rawEmail = (order.customerEmail || '').toLowerCase().trim();
      const rawName = (order.customerName || 'Cliente').trim();
      
      const key = rawPhone || rawEmail || rawName;
      if (!key) return;

      const total = Number(order.total || order.subtotal) || 0;
      const fecha = order.orderDate ? new Date(order.orderDate).getTime() : ahora;

      if (!clientesMap.has(key)) {
        clientesMap.set(key, {
          nombre: rawName,
          telefono: order.customerPhone || 'Sin WhatsApp',
          email: order.customerEmail || undefined,
          gastos: [total],
          fechas: [fecha],
        });
      } else {
        const cliente = clientesMap.get(key)!;
        cliente.gastos.push(total);
        cliente.fechas.push(fecha);
      }
    });

    // 3. Procesar métricas por cliente
    const clientesProcesados: Omit<ClienteRetencionJev, 'esVIP' | 'prioridadPuntaje'>[] = [];
    let gastoGeneralTotal = 0;

    clientesMap.forEach((info, key) => {
      const gastoHistorico = info.gastos.reduce((a, b) => a + b, 0);
      gastoGeneralTotal += gastoHistorico;
      const frecuencia = info.gastos.length;
      const ticketPromedio = Math.round(gastoHistorico / frecuencia);

      // Ordenar fechas cronológicamente
      info.fechas.sort((a, b) => a - b);
      const ultimaCompraTime = info.fechas[info.fechas.length - 1];
      const diasSinComprar = Math.max(0, Math.round((ahora - ultimaCompraTime) / (1000 * 60 * 60 * 24)));

      // Calcular ciclo habitual de compra
      let cicloHabitualDias = 21; // Valor por defecto
      if (frecuencia >= 2) {
        const spanTotal = (info.fechas[info.fechas.length - 1] - info.fechas[0]) / (1000 * 60 * 60 * 24);
        cicloHabitualDias = Math.max(7, Math.round(spanTotal / (frecuencia - 1)));
      }

      // Clasificación de riesgo de abandono
      let nivelRiesgo: 'critico' | 'alerta' | 'vigilancia' | 'estable' = 'estable';
      let motivoRiesgo = 'Comportamiento de compra habitual';

      if (diasSinComprar > cicloHabitualDias * 1.6 || diasSinComprar > 45) {
        nivelRiesgo = 'critico';
        motivoRiesgo = `${diasSinComprar} días sin comprar (su ciclo habitual es cada ${cicloHabitualDias} días).`;
      } else if (diasSinComprar > cicloHabitualDias * 1.1 || diasSinComprar > 25) {
        nivelRiesgo = 'alerta';
        motivoRiesgo = `Inactividad de ${diasSinComprar} días superó su ciclo promedio de ${cicloHabitualDias} días.`;
      } else if (diasSinComprar >= cicloHabitualDias * 0.8) {
        nivelRiesgo = 'vigilancia';
        motivoRiesgo = `Próximo a su fecha habitual de recompra (${diasSinComprar}/${cicloHabitualDias} días).`;
      }

      clientesProcesados.push({
        id: `cli-${key.slice(-8)}`,
        nombre: info.nombre,
        telefono: info.telefono,
        email: info.email,
        gastoHistorico,
        frecuencia,
        ticketPromedio,
        ultimaCompraFecha: new Date(ultimaCompraTime).toISOString(),
        diasSinComprar,
        cicloHabitualDias,
        nivelRiesgo,
        motivoRiesgo,
      });
    });

    // 4. Identificar clientes VIP (Top 20% por gasto)
    clientesProcesados.sort((a, b) => b.gastoHistorico - a.gastoHistorico);
    const limiteVipCount = Math.max(1, Math.ceil(clientesProcesados.length * 0.2));

    const todosLosClientes: ClienteRetencionJev[] = clientesProcesados.map((c, index) => {
      const esVIP = index < limiteVipCount;
      let nivelRiesgo = c.nivelRiesgo;

      // Si es VIP y está inactivo, escala de inmediato la severidad
      if (esVIP && c.diasSinComprar > 25) {
        nivelRiesgo = 'critico';
      }

      // Prioridad ponderada: Gasto (50%) + Frecuencia (30%) + Inactividad (20%)
      const prioridadPuntaje = (c.gastoHistorico * 0.5) + (c.frecuencia * 5000) + (c.diasSinComprar * 500);

      return {
        ...c,
        esVIP,
        nivelRiesgo,
        prioridadPuntaje,
      };
    });

    // Ordenar lista por prioridad de contacto (los clientes más valiosos en riesgo primero)
    todosLosClientes.sort((a, b) => b.prioridadPuntaje - a.prioridadPuntaje);

    const clientesEnRiesgo = todosLosClientes.filter(
      (c) => c.nivelRiesgo === 'critico' || c.nivelRiesgo === 'alerta'
    );
    const clientesVIP = todosLosClientes.filter((c) => c.esVIP);

    const gastoEnRiesgoTotal = clientesEnRiesgo.reduce((acc, c) => acc + c.gastoHistorico, 0);

    // 5. Historial de acciones de reconquista en memoria
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'retencion',
      limite: 10,
    });

    const estado = clientesEnRiesgo.length > 0 ? 'atencion_requerida' : 'optimo';

    return {
      businessId,
      totalClientes: todosLosClientes.length,
      clientesEnRiesgo,
      clientesVIP,
      todosLosClientes,
      gastoEnRiesgoTotal,
      historialMemoria,
      estado,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT RETENCION] Error:', error);
    return {
      businessId,
      totalClientes: 0,
      clientesEnRiesgo: [],
      clientesVIP: [],
      todosLosClientes: [],
      gastoEnRiesgoTotal: 0,
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}

/**
 * Función pública para el Resumen Ejecutivo (Fase 7)
 */
export async function getMetricasPilarRetencion(businessId: string) {
  const contexto = await getRetencionContext(businessId);
  return {
    pilar: 'retencion',
    totalClientes: contexto.totalClientes,
    enRiesgo: contexto.clientesEnRiesgo.length,
    vipsEnRiesgo: contexto.clientesEnRiesgo.filter((c) => c.esVIP).length,
    gastoEnRiesgoTotal: contexto.gastoEnRiesgoTotal,
    estado: contexto.estado,
    alertaCritica: contexto.clientesEnRiesgo.some((c) => c.esVIP && c.nivelRiesgo === 'critico'),
  };
}
