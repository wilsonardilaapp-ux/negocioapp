
import type { Timestamp } from 'firebase/firestore';

export type NotificationType = 'general' | 'payment_reminder' | 'promotion' | 'alert';

export interface AdminNotification {
  id: string;
  fromSuperAdmin: boolean;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
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
    createdAt: string;
    source: 'webform' | 'client_reply' | 'admin_form';
    userId?: string;
}

export interface ContactMessageReply {
    id: string;
    body: string;
    sentAt: string;
    from: 'superadmin' | 'user';
}

export interface PaymentReminder {
    id: string;
    userId: string;
    amount: number;
    dueDate: string;
    sentAt: string;
    channel: 'panel' | 'whatsapp';
}

export interface ScheduledReminder {
  id: string;
  clientId: string;
  clientName: string;
  scheduledDate: string;
  channel: "panel" | "whatsapp" | "both";
  message: string;
  status: "pending" | "sent" | "failed";
  createdAt: string;
  sentAt: string | null;
}
