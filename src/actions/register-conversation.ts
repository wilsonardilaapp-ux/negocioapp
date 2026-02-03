
'use server';

// Importamos la función que acabamos de crear en el Paso 1
import { getAdminFirestore } from "@/firebase/server-init";
import { v4 as uuidv4 } from "uuid";

interface RegisterConversationInput {
  businessId: string;
  userIdentifier: string;
}

export async function registerConversation({ businessId, userIdentifier }: RegisterConversationInput): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    // 1. Obtenemos la instancia de Firestore Admin
    const firestore = await getAdminFirestore();
    

    if (!businessId || !userIdentifier) {
      console.error("❌ [SERVER] Faltan datos: businessId o userIdentifier son nulos/vacíos.");
      return { success: false, error: "Faltan datos requeridos" };
    }

    const conversationId = uuidv4();

    // 2. Referencia al documento (Sintaxis Admin SDK: db.collection(...).doc(...))
    const conversationRef = firestore
      .collection('businesses')
      .doc(businessId)
      .collection('chatConversations')
      .doc(conversationId);

    const now = new Date().toISOString();

    const conversationData = {
      businessId: String(businessId),
      userIdentifier: String(userIdentifier),
      startTime: now,
      status: 'active' as const,
      messagesCount: 1, 
      channel: 'web' as const,
    };

    // 3. Guardar datos
    await conversationRef.set(conversationData);

    console.log(`✅ [SERVER] Conversación registrada: ${conversationId}`);
    return { success: true, conversationId };

  } catch (error: any) {
    console.error('Error registrando conversación:', error);
    return { success: false, error: error.message };
  }
}
