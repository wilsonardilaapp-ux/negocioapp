'use client';

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, Timestamp, increment } from 'firebase/firestore';
import { publicMenuChatbotFlow } from '@/ai/flows/public-menu-chatbot-flow';
import type { PublicMenuChatbotConfig, LocalMessage } from '@/models/public-menu-chatbot';
import { DEFAULT_CHATBOT_CONFIG } from '@/models/public-menu-chatbot';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PublicMenuChatWidgetProps {
  businessId: string;
  isPreview?: boolean;
}

export function PublicMenuChatWidget({ businessId, isPreview = false }: PublicMenuChatWidgetProps) {
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoOpenTriggered = useRef(false);

  // 1. Suscripción a la configuración del negocio
  const configRef = useMemoFirebase(() => 
    doc(firestore, `businesses/${businessId}/publicMenuChatbot`, 'config'), 
    [firestore, businessId]
  );
  const { data: configData, isLoading: loadingConfig } = useDoc<PublicMenuChatbotConfig>(configRef);
  const config = configData || DEFAULT_CHATBOT_CONFIG;

  // 2. Inicialización de sesión y auto-apertura
  useEffect(() => {
    if (isPreview) return;

    const storageKey = `pmc_session_${businessId}`;
    let sId = sessionStorage.getItem(storageKey);
    if (!sId) {
      sId = uuidv4();
      sessionStorage.setItem(storageKey, sId);
    }
    setSessionId(sId);

    // Mensaje de bienvenida inicial
    setMessages([{ 
      role: 'model', 
      content: config.greetingMessage, 
      timestamp: new Date() 
    }]);

    // Lógica de apertura automática
    if (config.isActive && config.autoOpenDelay > 0 && !autoOpenTriggered.current) {
      const timer = setTimeout(() => {
        if (!isOpen) {
          setIsOpen(true);
          autoOpenTriggered.current = true;
        }
      }, config.autoOpenDelay * 1000);
      return () => clearTimeout(timer);
    }
  }, [config.isActive, config.autoOpenDelay, businessId, isPreview, config.greetingMessage]);

  // Auto-scroll al fondo
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionId) return;

    const userMsg = input.trim();
    setInput('');
    const newMessage: LocalMessage = { role: 'user', content: userMsg, timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      // Registrar/Actualizar conversación en Firestore (No bloqueante)
      if (!isPreview) {
        const convRef = doc(firestore, `businesses/${businessId}/publicMenuChatbot/conversations`, sessionId);
        setDoc(convRef, {
          sessionId,
          startTime: Timestamp.now(), // setDoc con merge preservará el original
          status: 'active',
          messagesCount: increment(1),
          updatedAt: Timestamp.now()
        }, { merge: true }).catch(err => console.error("Error logging conversation:", err));
      }

      // Llamar al flujo de IA (Server Action)
      const result = await publicMenuChatbotFlow({
        businessId,
        question: userMsg,
        sessionId
      });

      const botMessage: LocalMessage = { 
        role: 'model', 
        content: result.answer, 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, botMessage]);

      if (!isPreview) {
        const convRef = doc(firestore, `businesses/${businessId}/publicMenuChatbot/conversations`, sessionId);
        updateDoc(convRef, { messagesCount: increment(1) }).catch(() => {});
      }

    } catch (error) {
      console.error('Error in chatbot flow:', error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: 'Lo siento, ha ocurrido un error técnico. Por favor, contacta al negocio directamente.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDoc = (ref: any, data: any) => {
    // Helper local para evitar importar updateDoc innecesariamente si ya usamos setDoc merge
    return setDoc(ref, data, { merge: true });
  };

  if (!config.isActive && !isPreview) return null;
  if (loadingConfig && !isPreview) return null;

  const positionClass = config.position === 'bottom-left' ? 'left-6' : 'right-6';

  return (
    <div className={cn("fixed bottom-6 z-[100] flex flex-col items-end", positionClass)}>
      {isOpen && (
        <Card className="w-[320px] sm:w-[380px] h-[500px] mb-4 shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300 overflow-hidden border-2">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between" style={{ backgroundColor: config.headerColor }}>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                <AvatarImage src={config.avatarUrl || ''} />
                <AvatarFallback className="bg-white/20 text-white font-bold">
                  {config.assistantName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <CardTitle className="text-sm font-bold text-white leading-none mb-1">{config.assistantName}</CardTitle>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-white/80 font-medium">Asistente en línea</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollRef} style={{ backgroundColor: config.secondaryColor }}>
            <div className="space-y-4">
                {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div 
                        className={cn(
                        "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                        msg.role === 'user' 
                            ? "bg-primary text-white rounded-br-none" 
                            : "bg-white border text-gray-800 rounded-bl-none"
                        )} 
                        style={msg.role === 'user' ? { backgroundColor: config.buttonColor } : { color: config.textColor }}
                    >
                        {msg.content}
                    </div>
                </div>
                ))}
                {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white border p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground italic">Escribiendo...</span>
                    </div>
                </div>
                )}
            </div>
          </ScrollArea>

          <CardFooter className="p-4 border-t bg-white">
            <div className="flex w-full gap-2">
              <Input 
                placeholder="Escribe tu pregunta..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 focus-visible:ring-primary h-10"
                disabled={isLoading}
              />
              <Button 
                size="icon" 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()} 
                style={{ backgroundColor: config.buttonColor }}
                className="h-10 w-10 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      <Button
        size="lg"
        className="rounded-full h-16 w-16 shadow-xl hover:scale-110 transition-transform duration-300 border-2"
        style={{ backgroundColor: config.buttonColor }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-8 w-8" /> : <MessageCircle className="h-8 w-8" />}
      </Button>
    </div>
  );
}
