'use server';

/**
 * @fileOverview Acciones de servidor para el despacho de recuperación por IA y logging.
 */

import { getAdminFirestore } from '@/firebase/server-init';
import { WhatsAppFactory } from '@/services/whatsapp-factory';
import { normalizePhoneNumber } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import type { WhatsAppProviderType } from '@/models/chatbot-config';

interface RecoveryLogData {
  customerPhone: string;
  customerName: string;
  messageText: string;
  tone: string;
  status: 'sent' | 'failed';
}

/**
 * Despacha el mensaje de recuperación vía WhatsApp y registra la actividad.
 * Acepta un proveedor opcional para el envío (Fase 10).
 */
export async function sendRecoveryWhatsApp(
  businessId: string,
  data: RecoveryLogData,
  explicitProvider?: WhatsAppProviderType
) {
  if (!businessId || !data.customerPhone) {
    return { success: false, error: 'Datos insuficientes para el envío.' };
  }

  const db = await getAdminFirestore();
  const cleanPhone = normalizePhoneNumber(data.customerPhone);
  
  try {
    // 1. Obtener proveedor de WhatsApp (Respetando el override si existe)
    const provider = await WhatsAppFactory.getProvider(businessId, explicitProvider);
    if (!provider) {
      throw new Error('No tienes un proveedor de WhatsApp configurado para el canal seleccionado.');
    }

    // 2. Realizar el envío
    const result = await provider.sendMessage(cleanPhone, data.messageText);
    
    if (!result.success) {
      throw new Error(result.error || 'Fallo en la entrega del mensaje.');
    }

    // 3. Registrar el Log de Recuperación
    const logRef = db.collection('businesses').doc(businessId).collection('recoveryLogs').doc();
    const now = new Date();
    const cooldownDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días de cooldown

    const batch = db.batch();

    // Guardar log
    batch.set(logRef, {
      ...data,
      sentAt: now.toISOString(),
      channel: explicitProvider || 'api_default',
      messageId: result.messageId || null
    });

    // Actualizar marca de enfriamiento en el balance del cliente
    const balanceRef = db.collection('businesses').doc(businessId).collection('loyaltyBalances').doc(cleanPhone);
    batch.set(balanceRef, {
      lastRecoverySentAt: now.toISOString(),
      cooldownUntil: cooldownDate.toISOString(),
      updatedAt: now.toISOString()
    }, { merge: true });

    await batch.commit();
    
    revalidatePath('/dashboard/reservas/oportunidades');
    return { success: true };

  } catch (error: any) {
    console.error('[sendRecoveryWhatsApp] Error:', error.message);
    return { success: false, error: error.message };
  }
}
