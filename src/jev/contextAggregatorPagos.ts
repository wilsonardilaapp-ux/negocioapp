import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface DeudorCobroJev {
  orderId: string;
  cliente: string;
  telefono: string;
  monto: number;
  metodoPago: string;
  fechaOrden: string;
  diasPendiente: number;
  esVencido: boolean; // > 15 días
}

export interface ContextoPagos {
  businessId: string;
  totalCobradoMes: number;
  totalPendienteCobro: number;
  pagosVencidosCount: number;
  metodosMasUsados: { metodo: string; cantidad: number }[];
  deudoresPendientes: DeudorCobroJev[];
  historialMemoria: any[];
  estado: 'optimo' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Pagos y Cobros (SOLO LECTURA).
 * Consulta orders y paymentSettings sin modificar ninguna transacción.
 */
export async function getPagosContext(businessId: string): Promise<ContextoPagos> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT PAGOS] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    const ordersSnap = await firestore
      .collection(`businesses/${businessId}/orders`)
      .orderBy('orderDate', 'desc')
      .limit(150)
      .get();

    if (ordersSnap.empty) {
      return {
        businessId,
        totalCobradoMes: 0,
        totalPendienteCobro: 0,
        pagosVencidosCount: 0,
        metodosMasUsados: [],
        deudoresPendientes: [],
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    const ahora = new Date();
    const ahoraTime = ahora.getTime();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    let totalCobradoMes = 0;
    let totalPendienteCobro = 0;
    const conteoMetodos: Record<string, number> = {};
    const deudoresPendientes: DeudorCobroJev[] = [];

    ordersSnap.forEach((doc) => {
      const o = doc.data();
      const total = Number(o.total || o.subtotal) || 0;
      const metodo = (o.paymentMethod || 'Efectivo').replace('_', ' ');
      const fecha = o.orderDate ? new Date(o.orderDate) : ahora;
      const fechaTime = fecha.getTime();
      const diasPendiente = Math.max(0, Math.round((ahoraTime - fechaTime) / (1000 * 60 * 60 * 24)));

      conteoMetodos[metodo] = (conteoMetodos[metodo] || 0) + 1;

      const paymentStatus = o.paymentStatus || (o.orderStatus === 'Entregado' ? 'paid' : 'pending');
      const esPendiente = paymentStatus === 'pending' && o.orderStatus !== 'Cancelado';

      if (esPendiente) {
        totalPendienteCobro += total;
        const esVencido = diasPendiente > 15;

        deudoresPendientes.push({
          orderId: doc.id,
          cliente: o.customerName || 'Cliente',
          telefono: o.customerPhone || 'Sin teléfono',
          monto: total,
          metodoPago: metodo,
          fechaOrden: o.orderDate || new Date().toISOString(),
          diasPendiente,
          esVencido,
        });
      } else if (paymentStatus === 'paid' && fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
        totalCobradoMes += total;
      }
    });

    // Ordenar deudores por días de atraso
    deudoresPendientes.sort((a, b) => b.diasPendiente - a.diasPendiente);

    // Ranking de métodos más usados
    const metodosMasUsados = Object.entries(conteoMetodos)
      .map(([metodo, cantidad]) => ({ metodo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const pagosVencidosCount = deudoresPendientes.filter((d) => d.esVencido).length;

    // Memoria histórica JEV
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'pagos',
      limite: 10,
    });

    const estado = pagosVencidosCount > 0 || totalPendienteCobro > 300000 ? 'atencion_requerida' : 'optimo';

    return {
      businessId,
      totalCobradoMes,
      totalPendienteCobro,
      pagosVencidosCount,
      metodosMasUsados,
      deudoresPendientes,
      historialMemoria,
      estado,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT PAGOS] Error:', error);
    return {
      businessId,
      totalCobradoMes: 0,
      totalPendienteCobro: 0,
      pagosVencidosCount: 0,
      metodosMasUsados: [],
      deudoresPendientes: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}
