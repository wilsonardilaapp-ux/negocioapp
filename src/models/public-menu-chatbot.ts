import { Timestamp } from 'firebase/firestore';

export interface PublicMenuChatbotConfig {
  assistantName: string;
  greetingMessage: string;
  primaryColor: string;
  secondaryColor: string;
  buttonColor: string;
  textColor: string;
  headerColor: string;
  avatarUrl: string | null;
  logoUrl: string | null;
  backgroundUrl: string | null;
  position: 'bottom-right' | 'bottom-left';
  autoOpenDelay: number; // en segundos
  isActive: boolean;
}

export interface PublicMenuAutoResponse {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMenuConversation {
  id: string;
  sessionId: string;
  startTime: string;
  status: 'active' | 'closed';
  messagesCount: number;
  satisfactionRating?: number;
}

export const DEFAULT_CHATBOT_CONFIG: PublicMenuChatbotConfig = {
  assistantName: 'Asistente Virtual',
  greetingMessage: '¡Hola! 👋 Bienvenido a nuestro menú. ¿En qué puedo ayudarte hoy?',
  primaryColor: '#4CAF50',
  secondaryColor: '#f8f9fa',
  buttonColor: '#4CAF50',
  textColor: '#000000',
  headerColor: '#4CAF50',
  avatarUrl: null,
  logoUrl: null,
  backgroundUrl: null,
  position: 'bottom-right',
  autoOpenDelay: 5,
  isActive: false,
};
