
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { ChatWindow } from '@/components/chatbot/chat-window';
import { cn } from '@/lib/utils';

interface ChatbotWidgetProps {
  enabled: boolean;
  businessId: string;
  businessName: string;
  avatarUrl: string;
  greeting: string;
}

export function ChatbotWidget({ enabled, businessId, businessName, avatarUrl, greeting }: ChatbotWidgetProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!enabled) {
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
                businessName={businessName}
                avatarUrl={avatarUrl}
                greeting={greeting}
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
