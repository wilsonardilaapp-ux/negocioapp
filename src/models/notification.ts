import type { Timestamp } from 'firebase/firestore';

export type NotificationType = 'general' | 'payment_reminder' | 'promotion' | 'alert';

export interface AdminNotification {
  id: string;
  fromSuperAdmin: boolean;
  subject: string;
  body: string;
  read: boolean;
  createdAt: Timestamp | string;
  type: NotificationType;
}

export interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string;
    body: string;
    read: boolean;
    createdAt: Timestamp | string;
}

export interface PaymentReminder {
    id: string;
    userId: string;
    amount: number;
    dueDate: Timestamp | string;
    sentAt: Timestamp | string;
    channel: 'panel' | 'whatsapp';
}
