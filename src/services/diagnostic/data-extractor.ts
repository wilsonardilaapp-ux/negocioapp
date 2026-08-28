import { getFirestore, collection, query, where, getDocs, doc, getDoc, limit, Timestamp } from 'firebase/firestore';
import { subDays, startOfDay } from 'date-fns';

/**
 * @fileOverview Servicio extractor de datos reales para el Informe de Diagnóstico.
 * Realiza consultas de SOLO LECTURA a las 15 fuentes del corazón de Markix.
 */

export interface DiagnosticRawData {
  ronda1_ventas: {
    totalSales30d: number | "dato pendiente";
    totalOrders30d: number | "dato pendiente";
    ticketPromedio: number | "dato pendiente";
    productAlertsCount: number | "dato pendiente";
    channelsShare: any | "dato pendiente";
  };
  ronda2_clientes: {
    newClientsCount: number | "dato pendiente";
    retentionRate: number | "dato pendiente";
    churnRiskCount: number | "dato pendiente";
    vipCount: number | "dato pendiente";
  };
  ronda3_operacion: {
    pendingOrdersCount: number | "dato pendiente";
    lowStockCount: number | "dato pendiente";
    accountingMovementsCount: number | "dato pendiente";
  };
  ronda4_motores: {
    chatbotEnabled: boolean | "dato pendiente";
    activePromotionsCount: number | "dato pendiente";
    activeCouponsCount: number | "dato pendiente";
    directoryRating: number | "dato pendiente";
    reservationsCount: number | "dato pendiente";
  };
}

/**
 * Extrae los datos reales del negocio desde Firestore.
 * Utiliza Promise.allSettled para asegurar resiliencia ante errores de subcolecciones.
 */
export async function extractDiagnosticData(businessId: string): Promise<{ data: DiagnosticRawData; sourcesReviewed: number }> {
  const db = getFirestore();
  const now = new Date();
  const thirtyDaysAgo = startOfDay(subDays(now, 30));

  let sourcesReviewed = 0;

  // Referencias a colecciones
  const ordersRef = collection(db, `businesses/${businessId}/orders`);
  const trackingRef = collection(db, `businesses/${businessId}/tracking_events`);
  const loyaltyRef = collection(db, `businesses/${businessId}/loyaltyBalances`);
  const kardexRef = collection(db, `businesses/${businessId}/kardexItems`);
  const asientosRef = collection(db, `businesses/${businessId}/asientos`);
  const chatbotRef = doc(db, `businesses/${businessId}/publicMenuChatbot/main`);
  const promosRef = collection(db, `promotions`);
  const cuponesRef = collection(db, `cupones`);
  const ratingsRef = collection(db, `directoryRatings`);
  const resRef = collection(db, `businesses/${businessId}/reservations`);
  const productAlertsRef = collection(db, `businesses/${businessId}/productAlerts`);

  // Ejecución masiva de 12 promesas base que cubren los 15 puntos lógicos
  const results = await Promise.allSettled([
    getDocs(query(ordersRef, where('orderDate', '>=', thirtyDaysAgo.toISOString()))), // 0: Pedidos 30d
    getDocs(query(trackingRef, limit(1))), // 1: Tracking Canales
    getDocs(loyaltyRef), // 2: Fidelización
    getDocs(query(kardexRef, where('estado', 'in', ['bajo', 'agotado']))), // 3: Kardex / Stock
    getDocs(query(asientosRef, limit(1))), // 4: Contabilidad
    getDoc(chatbotRef), // 5: Chatbot Config
    getDocs(query(promosRef, where('companyId', '==', businessId), where('isActive', '==', true))), // 6: Promos Activas
    getDocs(query(cuponesRef, where('businessId', '==', businessId), where('activo', '==', true))), // 7: Cupones Activos
    getDocs(query(ratingsRef, where('businessId', '==', businessId))), // 8: Ratings Directorio
    getDocs(query(resRef, limit(1))), // 9: Reservas
    getDocs(productAlertsRef), // 10: Alertas de Producto
    getDocs(query(ordersRef, where('orderStatus', '==', 'Pendiente'))), // 11: Pedidos Pendientes
  ]);

  const rawData: DiagnosticRawData = {
    ronda1_ventas: {
      totalSales30d: "dato pendiente",
      totalOrders30d: "dato pendiente",
      ticketPromedio: "dato pendiente",
      productAlertsCount: "dato pendiente",
      channelsShare: "dato pendiente",
    },
    ronda2_clientes: {
      newClientsCount: "dato pendiente",
      retentionRate: "dato pendiente",
      churnRiskCount: "dato pendiente",
      vipCount: "dato pendiente",
    },
    ronda3_operacion: {
      pendingOrdersCount: "dato pendiente",
      lowStockCount: "dato pendiente",
      accountingMovementsCount: "dato pendiente",
    },
    ronda4_motores: {
      chatbotEnabled: "dato pendiente",
      activePromotionsCount: "dato pendiente",
      activeCouponsCount: "dato pendiente",
      directoryRating: "dato pendiente",
      reservationsCount: "dato pendiente",
    }
  };

  // --- PROCESAMIENTO RONDA 1 (Ventas) ---
  if (results[0].status === 'fulfilled') {
    sourcesReviewed += 3; // Ventas, Pedidos y Ticket Promedio
    const snap = results[0].value;
    const orders = snap.docs.map(d => d.data());
    rawData.ronda1_ventas.totalOrders30d = snap.size;
    const totalRev = orders.reduce((acc, curr) => acc + (curr.total || curr.subtotal || 0), 0);
    rawData.ronda1_ventas.totalSales30d = totalRev;
    rawData.ronda1_ventas.ticketPromedio = snap.size > 0 ? totalRev / snap.size : 0;
  }

  if (results[10].status === 'fulfilled') {
    sourcesReviewed += 1; // Estadísticas Productos (Alertas)
    rawData.ronda1_ventas.productAlertsCount = results[10].value.size;
  }

  if (results[1].status === 'fulfilled') {
    sourcesReviewed += 1; // Canales de Venta
    rawData.ronda1_ventas.channelsShare = results[1].value.empty ? "sin eventos de tracking" : "leído";
  }

  // --- PROCESAMIENTO RONDA 2 (Clientes) ---
  if (results[2].status === 'fulfilled') {
    sourcesReviewed += 2; // Clientes Nuevos y Fidelización (Churn/VIP)
    const snap = results[2].value;
    rawData.ronda2_clientes.newClientsCount = snap.size;
    rawData.ronda2_clientes.churnRiskCount = snap.docs.filter(d => ['at_risk', 'dormant'].includes(d.data().activityStatus)).length;
    rawData.ronda2_clientes.vipCount = snap.docs.filter(d => (d.data().points || 0) > 1000).length;
  }

  // Retención: requiere análisis de pedidos históricos (lo derivamos de pedidos 30d por ahora)
  if (results[0].status === 'fulfilled') {
    sourcesReviewed += 1; // Retención Clientes
    const snap = results[0].value;
    if (snap.empty) {
        rawData.ronda2_clientes.retentionRate = 0;
    } else {
        const emails = snap.docs.map(d => d.data().customerEmail);
        const uniqueEmails = new Set(emails);
        rawData.ronda2_clientes.retentionRate = emails.length > 0 ? ((emails.length - uniqueEmails.size) / emails.length) * 100 : 0;
    }
  }

  // --- PROCESAMIENTO RONDA 3 (Operación) ---
  if (results[11].status === 'fulfilled') {
    sourcesReviewed += 1; // Pedidos (Estados)
    rawData.ronda3_operacion.pendingOrdersCount = results[11].value.size;
  }

  if (results[3].status === 'fulfilled') {
    sourcesReviewed += 1; // Inventario Kardex
    rawData.ronda3_operacion.lowStockCount = results[3].value.size;
  }

  if (results[4].status === 'fulfilled') {
    sourcesReviewed += 1; // Contabilidad y Pagos
    rawData.ronda3_operacion.accountingMovementsCount = results[4].value.empty ? "sin movimientos recientes" : "leído";
  }

  // --- PROCESAMIENTO RONDA 4 (Motores IA) ---
  if (results[5].status === 'fulfilled') {
    sourcesReviewed += 1; // Chatbot Menú
    const doc = results[5].value;
    rawData.ronda4_motores.chatbotEnabled = doc.exists() ? (doc.data()?.isActive ?? false) : false;
  }
  
  if (results[6].status === 'fulfilled') {
    sourcesReviewed += 1; // Promociones
    rawData.ronda4_motores.activePromotionsCount = results[6].value.size;
  }

  if (results[7].status === 'fulfilled') {
    sourcesReviewed += 1; // Cupones
    rawData.ronda4_motores.activeCouponsCount = results[7].value.size;
  }

  if (results[8].status === 'fulfilled') {
    sourcesReviewed += 1; // Valoraciones Directorio
    const snap = results[8].value;
    rawData.ronda4_motores.directoryRating = snap.empty ? 5 : (snap.docs.reduce((acc, curr) => acc + (curr.data().rating || 0), 0) / snap.size);
  }

  if (results[9].status === 'fulfilled') {
    sourcesReviewed += 1; // Reservas y Citas
    rawData.ronda4_motores.reservationsCount = results[9].value.empty ? "sin agenda configurada" : "leído";
  }

  return { data: rawData, sourcesReviewed };
}
