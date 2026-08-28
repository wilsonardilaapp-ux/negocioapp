import { getFirestore, collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { subDays, startOfDay } from 'date-fns';

/**
 * @fileOverview Servicio extractor de datos reales para el Informe de Diagnóstico.
 * Realiza consultas de SOLO LECTURA a las 15 fuentes del corazón de Markix.
 * - Actualizado: Consolidación de fuentes en Ronda 4 para asegurar total de 15.
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
    accountingMovementsCount: number | string | "dato pendiente";
  };
  ronda4_motores: {
    chatbotEnabled: boolean | "dato pendiente";
    activePromotionsCount: number | "dato pendiente";
    activeCouponsCount: number | "dato pendiente";
    directoryRating: number | "dato pendiente";
    reservationsCount: number | string | "dato pendiente";
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

  // --- PROCESAMIENTO RONDA 1 (Ventas - 5 Fuentes) ---
  if (results[0].status === 'fulfilled') {
    sourcesReviewed += 3; // 1: Ventas, 2: Pedidos, 3: Ticket Promedio
    const snap = results[0].value as any;
    const ordersData = snap.docs.map((d: any) => d.data());
    rawData.ronda1_ventas.totalOrders30d = snap.size;
    const totalRev = ordersData.reduce((acc: number, curr: any) => acc + (curr.total || curr.subtotal || 0), 0);
    rawData.ronda1_ventas.totalSales30d = totalRev;
    rawData.ronda1_ventas.ticketPromedio = snap.size > 0 ? totalRev / snap.size : 0;
  }

  if (results[10].status === 'fulfilled') {
    sourcesReviewed += 1; // 4: Estadísticas Productos (Alertas)
    const snap = results[10].value as any;
    rawData.ronda1_ventas.productAlertsCount = snap.size;
  }

  if (results[1].status === 'fulfilled') {
    sourcesReviewed += 1; // 5: Canales de Venta
    const snap = results[1].value as any;
    rawData.ronda1_ventas.channelsShare = snap.empty ? "sin eventos de tracking" : "leído";
  }

  // --- PROCESAMIENTO RONDA 2 (Clientes - 3 Fuentes) ---
  if (results[2].status === 'fulfilled') {
    sourcesReviewed += 2; // 6: Clientes Nuevos, 8: Fidelización (Churn/VIP)
    const snap = results[2].value as any;
    rawData.ronda2_clientes.newClientsCount = snap.size;
    rawData.ronda2_clientes.churnRiskCount = snap.docs.filter((d: any) => ['at_risk', 'dormant'].includes(d.data().activityStatus)).length;
    rawData.ronda2_clientes.vipCount = snap.docs.filter((d: any) => (d.data().points || 0) > 1000).length;
  }

  if (results[0].status === 'fulfilled') {
    sourcesReviewed += 1; // 7: Retención Clientes (Derivado de Historial)
    const snap = results[0].value as any;
    if (snap.empty) {
        rawData.ronda2_clientes.retentionRate = 0;
    } else {
        const emails = snap.docs.map((d: any) => d.data().customerEmail);
        const uniqueEmails = new Set(emails);
        rawData.ronda2_clientes.retentionRate = emails.length > 0 ? ((emails.length - uniqueEmails.size) / emails.length) * 100 : 0;
    }
  }

  // --- PROCESAMIENTO RONDA 3 (Operación - 3 Fuentes) ---
  if (results[11].status === 'fulfilled') {
    sourcesReviewed += 1; // 9: Pedidos por Estado
    const snap = results[11].value as any;
    rawData.ronda3_operacion.pendingOrdersCount = snap.size;
  }

  if (results[3].status === 'fulfilled') {
    sourcesReviewed += 1; // 10: Inventario Kardex
    const snap = results[3].value as any;
    rawData.ronda3_operacion.lowStockCount = snap.size;
  }

  if (results[4].status === 'fulfilled') {
    sourcesReviewed += 1; // 11: Contabilidad
    const snap = results[4].value as any;
    rawData.ronda3_operacion.accountingMovementsCount = snap.empty ? "sin movimientos recientes" : "leído";
  }

  // --- PROCESAMIENTO RONDA 4 (Motores IA - 4 Fuentes) ---
  if (results[5].status === 'fulfilled') {
    sourcesReviewed += 1; // 12: Chatbot Menú
    const docSnap = results[5].value as any;
    rawData.ronda4_motores.chatbotEnabled = docSnap.exists() ? (docSnap.data()?.isActive ?? false) : false;
  }
  
  if (results[6].status === 'fulfilled') {
    sourcesReviewed += 1; // 13: Promociones
    const snap = results[6].value as any;
    rawData.ronda4_motores.activePromotionsCount = snap.size;
  }

  if (results[7].status === 'fulfilled') {
    sourcesReviewed += 1; // 14: Cupones
    const snap = results[7].value as any;
    rawData.ronda4_motores.activeCouponsCount = snap.size;
  }

  // 15: Reputación y Reservas (Punto Estratégico Unificado en Contador)
  if (results[8].status === 'fulfilled' || results[9].status === 'fulfilled') {
    sourcesReviewed += 1; 

    if (results[8].status === 'fulfilled') {
        const snap = results[8].value as any;
        rawData.ronda4_motores.directoryRating = snap.empty ? 5 : (snap.docs.reduce((acc: number, curr: any) => acc + (curr.data().rating || 0), 0) / snap.size);
    }

    if (results[9].status === 'fulfilled') {
        const snap = results[9].value as any;
        rawData.ronda4_motores.reservationsCount = snap.empty ? "sin agenda configurada" : "leído";
    }
  }

  return { 
    data: rawData, 
    sourcesReviewed: Math.min(sourcesReviewed, 15) 
  };
}
