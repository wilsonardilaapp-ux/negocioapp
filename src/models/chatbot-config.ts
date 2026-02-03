export type ChatbotConfig = {
  id: string;
  businessId: string;
  whatsApp: {
    connected: boolean;
    number: string;
    token: string;
  };
  business: {
    name: string;
    type: 'Restaurante' | 'Panadería' | 'Heladería' | 'Cafetería' | 'Salud y Bienestar' | 'Otro';
    description: string;
    logoUrl: string;
    avatarUrl?: string; // Campo para el avatar del chatbot
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
  content?: string; // Added for manual entries
  isManual?: boolean; // Flag for manual entries
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
  messagesCount?: number; // Nuevo campo
  channel?: 'web' | 'whatsapp'; // Nuevo campo
};
