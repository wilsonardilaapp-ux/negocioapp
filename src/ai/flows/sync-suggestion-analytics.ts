
'use server';

import { getAdminFirestore } from "@/firebase/server-init";

export interface SyncResult {
  success: boolean;
  processedOrders: number;
  updatedRules: number;
  message?: string;
  debugInfo?: string;
}


// Función auxiliar robusta para limpiar precios
function parsePrice(value: any): number {
  try {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Limpieza: "$ 70.000" -> "70000"
    const str = String(value).replace(/[^0-9]/g, ''); 
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  } catch {
    return 0;
  }
}

export async function syncMetricsWithOrders(businessId: string): Promise<SyncResult> {
  let step = 'INICIO';
  
  try {
    if (!businessId) return { success: false, processedOrders: 0, updatedRules: 0, message: "Falta ID del negocio" };

    step = 'CONECTANDO_ADMIN_CON_CREDENCIALES';
    const db = await getAdminFirestore(); // Usamos Admin SDK

    // 1. OBTENER REGLAS (Sintaxis Admin SDK)
    step = 'LEYENDO_REGLAS';
    const rulesRef = db.collection(`businesses/${businessId}/suggestionRules`);
    const rulesSnap = await rulesRef.get();
    
    if (rulesSnap.empty) {
      return { success: true, processedOrders: 0, updatedRules: 0, message: "No hay reglas activas." };
    }

    const rules = rulesSnap.docs.map(doc => ({
      id: doc.id,
      triggerItem: String(doc.data().triggerItem || ''),
      suggestedItem: String(doc.data().suggestedItem || ''),
      metrics: doc.data().metrics
    }));

    // 2. OBTENER PEDIDOS (Sintaxis Admin SDK)
    // Al usar 'db' (Admin), esto YA NO dará error de permisos.
    step = 'LEYENDO_PEDIDOS';
    const ordersRef = db.collection(`businesses/${businessId}/orders`);
    const ordersSnap = await ordersRef.get();
    
    if (ordersSnap.empty) {
      return { success: true, processedOrders: 0, updatedRules: 0, message: "No hay pedidos históricos." };
    }

    const allOrderItems = ordersSnap.docs.map(d => d.data());

    // 3. AGRUPAR PEDIDOS POR COMPRA
    const groupedOrders = new Map<string, any[]>();
    allOrderItems.forEach(item => {
        const orderTime = new Date(item.orderDate).getTime();
        let foundGroup = false;

        for (const group of groupedOrders.values()) {
            const groupTime = new Date(group[0].orderDate).getTime();
            // Agrupamos si es el mismo cliente y la diferencia de tiempo es menor a 5 minutos
            if (item.customerEmail === group[0].customerEmail && Math.abs(orderTime - groupTime) < 5 * 60 * 1000) {
                group.push(item);
                foundGroup = true;
                break;
            }
        }
        if (!foundGroup) {
            // Creamos un nuevo grupo para esta compra
            const newKey = `${item.customerEmail}_${orderTime}`;
            groupedOrders.set(newKey, [item]);
        }
    });
    
    // 4. CALCULAR MÉTRICAS
    step = 'CALCULANDO';
    const statsMap = new Map<string, { conversions: number, revenue: number }>();
    
    // Inicializar
    rules.forEach(r => statsMap.set(r.id, { conversions: 0, revenue: 0 }));

    let matchCount = 0;

    groupedOrders.forEach(orderGroup => {
        const purchasedIds = orderGroup.map((item: any) => String(item.productId || ''));

        for (const rule of rules) {
            if (purchasedIds.includes(rule.triggerItem) && purchasedIds.includes(rule.suggestedItem)) {
                const stats = statsMap.get(rule.id)!;
                
                const suggestedItem = orderGroup.find((i: any) => String(i.productId || '') === rule.suggestedItem);
                const price = parsePrice(suggestedItem?.subtotal);

                stats.conversions += 1;
                stats.revenue += price;
                
                statsMap.set(rule.id, stats);
                matchCount++;
            }
        }
    });

    // 5. GUARDAR CAMBIOS (Batch Update)
    step = 'GUARDANDO_BATCH';
    const batch = db.batch(); // Sintaxis Admin: db.batch()
    let updatesCount = 0;

    statsMap.forEach((stats, ruleId) => {
        const ruleDocRef = db.doc(`businesses/${businessId}/suggestionRules/${ruleId}`);
        
        // El campo `timesShown` NO se resetea. Lo leemos para calcular la tasa de conversión.
        const existingRuleData = rules.find(r => r.id === ruleId);
        const timesShown = existingRuleData?.metrics?.timesShown || 0;

        const updatePayload = {
            'metrics.timesAccepted': stats.conversions,
            'metrics.revenueGenerated': stats.revenue,
            'metrics.conversionRate': timesShown > 0 ? (stats.conversions / timesShown) * 100 : 0,
            'metrics.lastSynced': new Date().toISOString()
        };

        batch.update(ruleDocRef, updatePayload);
        updatesCount++;
    });


    if (updatesCount > 0) {
      await batch.commit();
    }

    return { 
      success: true, 
      processedOrders: groupedOrders.size, 
      updatedRules: updatesCount,
      message: `Sincronización Admin exitosa. ${matchCount} conversiones encontradas.`
    };

  } catch (error: any) {
    console.error(`[SYNC-ERROR] Falló en ${step}:`, error);

     // Mensaje de error amigable para el usuario si faltan credenciales
    let userMsg = error.message;
    if (userMsg.includes("Faltan variables")) {
      userMsg = "Error de Configuración: Faltan las llaves privadas de Firebase en el archivo .env";
    }

    return { 
      success: false, 
      processedOrders: 0, 
      updatedRules: 0, 
      message: userMsg,
      debugInfo: `Paso: ${step}. Permisos Admin requeridos.`
    };
  }
}
