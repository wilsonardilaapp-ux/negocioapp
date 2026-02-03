
'use client';

import { useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import type { ChatbotConfig } from '@/models/chatbot-config';
import { ChatWindow } from '@/components/chatbot/chat-window';
import { cn } from '@/lib/utils';
import type { Module } from '@/models/module';

interface ChatbotWidgetProps {
  businessId: string;
}

export function ChatbotWidget({ businessId }: ChatbotWidgetProps) {
  const firestore = useFirestore();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useUser(); // Obtener el usuario

  const configDocRef = useMemoFirebase(() => {
    if (!firestore || !businessId) return null;
    return doc(firestore, 'businesses', businessId, 'chatbotConfig', 'main');
  }, [firestore, businessId]);
  
  // La consulta ahora depende del usuario para evitar errores en páginas públicas
  const chatbotModuleQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null; 
    return doc(firestore, 'modules', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas');
  }, [firestore, user]);

  const { data: config, isLoading: isConfigLoading } = useDoc<ChatbotConfig>(configDocRef);
  const { data: chatbotModule, isLoading: isModuleLoading } = useDoc<Module>(chatbotModuleQuery);
  
  const isLoading = isConfigLoading || isModuleLoading;

  const isModuleActive = chatbotModule?.status === 'active';

  // No mostrar si está cargando, o si el módulo está inactivo
  if (isLoading || !isModuleActive) {
      return null;
  }

  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isChatOpen && (
        <div className="w-[calc(100vw-2rem)] h-[calc(100vh-5rem)] sm:w-96 sm:h-[600px] mb-4 rounded-lg shadow-2xl bg-background border border-border flex flex-col">
            <ChatWindow 
                businessId={businessId} 
                businessName={config?.business?.name || 'Asistente Virtual'}
                avatarUrl={config?.business?.avatarUrl || ''}
                greeting={config?.communication?.greeting || '¡Hola! ¿Cómo puedo ayudarte?'}
                onClose={() => setIsChatOpen(false)} 
            />
        </div>
      )}
      <Button
        size="lg"
        className={cn(
            "rounded-full w-16 h-16 shadow-lg transition-transform transform hover:scale-110",
            isChatOpen && "bg-destructive hover:bg-destructive/90"
        )}
        onClick={toggleChat}
      >
        {isChatOpen ? <X className="h-8 w-8" /> : <MessageCircle className="h-8 w-8" />}
        <span className="sr-only">{isChatOpen ? 'Cerrar chat' : 'Abrir chat'}</span>
      </Button>
    </div>
  );
}
