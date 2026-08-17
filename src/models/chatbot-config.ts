import { YCloudFields } from "./integration";

export type WhatsAppProviderType = 'whapi' | 'ycloud';

export type ChatbotConfig = {
  id: string;
  businessId: string;
  provider?: WhatsAppProviderType;
  whapiChannelId?: string; 
  whatsApp: {
    connected: boolean;
    number: string;
    token: string;
  };
  yCloud?: YCloudFields;
  business: {
    name: string;
    type: 'Restaurante' | 'Panadería' | 'Heladería' | 'Cafetería' | 'Salud y Bienestar' | 'Otro';
    description: string;
    logoUrl: string;
    avatarUrl?: string; 
  };
  communication: {
    tone: 'Profesional y formal' | 'Amigable y cercano' | 'Casual y divertido' | 'Profesional y empático';
    greeting: string;
  };
  schedule: {
    is247: boolean;
    startTime: string;
    endTime: string;
    offHoursMessage: string;
  };
};

export type KnowledgeDocument = {
  id: string;
  fileName: string;
  fileUrl?: string;
  fileType: string;
  status: 'training' | 'ready' | 'error';
  createdAt: string;
  extractedText?: string;
  content?: string; 
  isManual?: boolean; 
};

export type ChatConversation = {
  id: string;
  businessId: string;
  userIdentifier: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'resolved' | 'abandoned' | 'escalated';
  satisfactionRating?: number;
  summary?: string;
  messagesCount?: number; 
  channel?: 'web' | 'whatsapp'; 
};
