
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
    whatsapp?: string;
    subject: string;
    body: string;
    read: boolean;
    replied: boolean;
    createdAt: Timestamp | string;
    source: 'webform' | 'client_reply';
    userId?: string;
}

export interface ContactMessageReply {
    id: string;
    body: string;
    sentAt: Timestamp | string;
    from: 'superadmin' | 'user';
}

export interface PaymentReminder {
    id: string;
    userId: string;
    amount: number;
    dueDate: Timestamp | string;
    sentAt: Timestamp | string;
    channel: 'panel' | 'whatsapp';
}

export interface ScheduledReminder {
  id: string;
  clientId: string;
  clientName: string;
  scheduledDate: Timestamp | string;
  channel: "panel" | "whatsapp" | "both";
  message: string;
  status: "pending" | "sent" | "failed";
  createdAt: Timestamp | string;
  sentAt: Timestamp | string | null;
}
