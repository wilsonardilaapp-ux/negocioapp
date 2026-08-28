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
  const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);

  let sourcesReviewed = 0;

  // R1: Ventas
  const ordersRef = collection(db, `businesses/${businessId}/orders`);
  const trackingRef = collection(db, `businesses/${businessId}/tracking_events`);
  
  // R2: Clientes
  const loyaltyRef = collection(db, `businesses/${businessId}/loyaltyBalances`);
  
  // R3: Operación
  const kardexRef = collection(db, `businesses/${businessId}/kardexItems`);
  const asientosRef = collection(db, `businesses/${businessId}/asientos`);
  
  // R4: Motores
  const chatbotRef = doc(db, `businesses/${businessId}/publicMenuChatbot/main`);
  const promosRef = collection(db, `promotions`);
  const cuponesRef = collection(db, `cupones`);
  const ratingsRef = collection(db, `directoryRatings`);
  const resRef = collection(db, `businesses/${businessId}/reservations`);

  const results = await Promise.allSettled([
    // 0: Pedidos 30d
    getDocs(query(ordersRef, where('orderDate', '>=', thirtyDaysAgo.toISOString()))),
    // 1: Tracking Canales
    getDocs(query(trackingRef, limit(1))),
    // 2: Clientes / Churn
    getDocs(loyaltyRef),
    // 3: Kardex / Stock
    getDocs(query(kardexRef, where('estado', 'in', ['bajo', 'agotado']))),
    // 4: Contabilidad
    getDocs(query(asientosRef, limit(1))),
    // 5: Chatbot Config
    getDoc(chatbotRef),
    // 6: Promos Activas
    getDocs(query(promosRef, where('companyId', '==', businessId), where('isActive', '==', true))),
    // 7: Cupones Activos
    getDocs(query(cuponesRef, where('businessId', '==', businessId), where('activo', '==', true))),
    // 8: Ratings Directorio
    getDocs(query(ratingsRef, where('businessId', '==', businessId))),
    // 9: Reservas
    getDocs(query(resRef, limit(1))),
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
      directoryRating: "dato pendiente",
      reservationsCount: "dato pendiente",
    }
  };

  // --- Procesamiento Ronda 1 & 3 (Pedidos) ---
  if (results[0].status === 'fulfilled') {
    const snap = results[0].value;
    if (!snap.empty) {
      const orders = snap.docs.map(d => d.data());
      rawData.ronda1_ventas.totalOrders30d = snap.size;
      const totalRev = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);
      rawData.ronda1_ventas.totalSales30d = totalRev;
      rawData.ronda1_ventas.ticketPromedio = totalRev / snap.size;
      sourcesReviewed += 2; // N° Pedidos y Ticket Promedio
    }
  }

  // Canales
  if (results[1].status === 'fulfilled' && !results[1].value.empty) {
    rawData.ronda1_ventas.channelsShare = "leído";
    sourcesReviewed++;
  }

  // --- Procesamiento Ronda 2 (Fidelización) ---
  if (results[2].status === 'fulfilled') {
    const snap = results[2].value;
    if (!snap.empty) {
      rawData.ronda2_clientes.newClientsCount = snap.size;
      const risks = snap.docs.filter(d => d.data().activityStatus === 'at_risk' || d.data().activityStatus === 'dormant').length;
      rawData.ronda2_clientes.churnRiskCount = risks;
      rawData.ronda2_clientes.vipCount = snap.docs.filter(d => (d.data().points || 0) > 1000).length;
      sourcesReviewed += 2; // Clientes Nuevos y Fidelización (Churn/VIP)
    }
  }

  // --- Procesamiento Ronda 3 (Kardex / Contabilidad) ---
  if (results[3].status === 'fulfilled') {
    rawData.ronda3_operacion.lowStockCount = results[3].value.size;
    sourcesReviewed++;
  }
  if (results[4].status === 'fulfilled' && !results[4].value.empty) {
    rawData.ronda3_operacion.accountingMovementsCount = "leído";
    sourcesReviewed++;
  }

  // --- Procesamiento Ronda 4 (Motores) ---
  if (results[5].status === 'fulfilled' && results[5].value.exists()) {
    rawData.ronda4_motores.chatbotEnabled = results[5].value.data()?.isActive ?? false;
    sourcesReviewed++;
  }
  
  // Promos y Cupones
  const promosOk = results[6].status === 'fulfilled' ? results[6].value.size : 0;
  const cuponesOk = results[7].status === 'fulfilled' ? results[7].value.size : 0;
  rawData.ronda4_motores.activePromotionsCount = promosOk + cuponesOk;
  if (results[6].status === 'fulfilled' || results[7].status === 'fulfilled') sourcesReviewed++;

  // Ratings
  if (results[8].status === 'fulfilled') {
    const snap = results[8].value;
    if (!snap.empty) {
        const avg = snap.docs.reduce((acc, curr) => acc + (curr.data().rating || 0), 0) / snap.size;
        rawData.ronda4_motores.directoryRating = avg;
        sourcesReviewed++;
    }
  }

  // Reservas
  if (results[9].status === 'fulfilled' && !results[9].value.empty) {
    rawData.ronda4_motores.reservationsCount = "leído";
    sourcesReviewed++;
  }

  // Marcamos Dashboard como revisado si logramos leer algo de Ventas
  if (rawData.ronda1_ventas.totalOrders30d !== "dato pendiente") sourcesReviewed++;

  return { data: rawData, sourcesReviewed };
}
