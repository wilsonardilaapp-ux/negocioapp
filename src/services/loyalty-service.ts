import { getAdminFirestore } from '@/firebase/server-init';
import { normalizePhoneNumber } from '@/lib/utils';

/**
 * @fileOverview Servicio interno para la gestión del sistema de fidelización (Loyalty).
 * Estas funciones utilizan el Admin SDK para interactuar con Firestore, bypassando
 * las reglas de seguridad. Diseñadas para ser invocadas desde Server Actions.
 */

export interface LoyaltyBalance {
  whatsapp: string;
  name?: string; // Campo opcional para identificación
  points: number;
  visitCount: number; // Total de consumos confirmados
  lastVisitAt: any;   // Fecha del último consumo
  updatedAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  whatsapp: string;
  type: 'earn' | 'redeem' | 'adjust';
  amount: number;
  reason: string;
  orderId?: string;
  createdAt: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  isActive: boolean;
  imageUrl?: string;
}

class LoyaltyService {
  /**
   * Obtiene la instancia de Firestore con privilegios de administrador.
   */
  private async getDb() {
    return await getAdminFirestore();
  }

  /**
   * Normaliza el número de WhatsApp para asegurar consistencia en las búsquedas.
   */
  private cleanPhone(phone: string): string {
    return normalizePhoneNumber(phone);
  }

  /**
   * Obtiene el balance de puntos de un cliente específico.
   * Path: businesses/{businessId}/loyaltyBalances/{whatsapp}
   */
  async getLoyaltyBalanceRaw(businessId: string, whatsapp: string): Promise<number> {
    const db = await this.getDb();
    const cleanWhatsapp = this.cleanPhone(whatsapp);
    
    const balanceDoc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('loyaltyBalances')
      .doc(cleanWhatsapp)
      .get();

    if (!balanceDoc.exists) {
      return 0;
    }

    const data = balanceDoc.data() as LoyaltyBalance;
    return data.points || 0;
  }

  /**
   * Obtiene el historial de movimientos de puntos de un cliente.
   * Path: businesses/{businessId}/loyaltyTransactions
   * Requiere índice compuesto: whatsapp ASC, createdAt DESC
   */
  async getLoyaltyTransactionHistory(
    businessId: string, 
    whatsapp: string, 
    limitNum: number = 20
  ): Promise<LoyaltyTransaction[]> {
    const db = await this.getDb();
    const cleanWhatsapp = this.cleanPhone(whatsapp);

    const snapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('loyaltyTransactions')
      .where('whatsapp', '==', cleanWhatsapp)
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LoyaltyTransaction));
  }

  /**
   * Obtiene el catálogo de premios habilitados para un negocio.
   * Path: businesses/{businessId}/rewards
   */
  async getActiveRewardsCatalog(businessId: string): Promise<Reward[]> {
    const db = await this.getDb();

    const snapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('rewards')
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Reward));
  }

  /**
   * Obtiene los clientes con mayor actividad para el ranking VIP.
   * Ordenado por visitas y luego por puntos acumulados.
   */
  async getTopLoyaltyCustomers(businessId: string, limitNum: number = 20): Promise<LoyaltyBalance[]> {
    const db = await this.getDb();
    
    const snapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('loyaltyBalances')
      .orderBy('visitCount', 'desc')
      .orderBy('points', 'desc')
      .limit(limitNum)
      .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            lastVisitAt: data.lastVisitAt?.toDate?.()?.toISOString() || null
        } as LoyaltyBalance;
    });
  }

  /**
   * Valida si un código de factura corresponde a un pedido real del cliente.
   * Lógica resiliente: compara contra teléfono normalizado y crudo para cubrir historial.
   * Incluye capa de defensa extra en memoria para normalización de ambos lados.
   */
  async verifyInvoiceCode(businessId: string, whatsapp: string, invoiceCode: string): Promise<boolean> {
    const db = await this.getDb();
    const cleanWhatsapp = this.cleanPhone(whatsapp);
    const cleanCode = invoiceCode.trim().toUpperCase();

    if (!cleanCode) return false;

    const ordersRef = db.collection('businesses').doc(businessId).collection('orders');
    
    // 1. Filtro por Base de Datos (Primera capa resiliente)
    const snapshot = await ordersRef
      .where('customerPhone', 'in', [whatsapp, cleanWhatsapp])
      .get();

    if (snapshot.empty) {
      return false;
    }

    // 2. Validación en Memoria (Capa extra de defensa con normalización estricta)
    return snapshot.docs.some(doc => {
      const orderData = doc.data();
      const dbPhoneNormalized = normalizePhoneNumber(orderData.customerPhone);
      
      if (dbPhoneNormalized !== cleanWhatsapp) return false;

      const displayCode = doc.id.slice(-8).toUpperCase();
      return displayCode === cleanCode;
    });
  }
}

export const loyaltyService = new LoyaltyService();
