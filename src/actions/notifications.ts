
'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { Timestamp } from 'firebase-admin/firestore';
import type { AdminNotification } from '@/models/notification';

interface SendNotificationArgs {
  recipients: string[]; // Array of user/business IDs
  subject: string;
  body: string;
}

export async function sendAdminNotification({ recipients, subject, body }: SendNotificationArgs): Promise<{ success: boolean; error?: string }> {
  if (!recipients || recipients.length === 0 || !subject || !body) {
    return { success: false, error: 'Faltan destinatarios, asunto o cuerpo del mensaje.' };
  }

  const db = await getAdminFirestore();
  const batch = db.batch();

  try {
    recipients.forEach(userId => {
      // Correct admin SDK syntax to create a new document reference with an auto-generated ID
      const notificationRef = db.collection(`businesses/${userId}/notifications`).doc();
      
      const newNotification: Omit<AdminNotification, 'id'> = {
        fromSuperAdmin: true,
        subject,
        body,
        read: false,
        createdAt: Timestamp.now(),
        type: 'general',
      };
      batch.set(notificationRef, newNotification);
    });

    await batch.commit();
    return { success: true };

  } catch (error: any) {
    console.error('Error sending batch notifications:', error);
    return { success: false, error: `No se pudieron enviar las notificaciones: ${error.message}` };
  }
}
