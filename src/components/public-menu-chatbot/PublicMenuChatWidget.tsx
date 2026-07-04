'use client';

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, addDoc, Timestamp } from 'firebase/firestore';
import { publicMenuChatbotFlow } from '@/ai/flows/public-menu-chatbot-flow';
import type { PublicMenuChatbotConfig, PublicMenuAutoResponse } from '@/models/public-menu-chatbot';
import { DEFAULT_CHATBOT_CONFIG } from '@/models/public-menu-chatbot';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export function PublicMenuChatWidget({ businessId, isPreview = false }: { businessId: string, isPreview?: boolean }) {
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Suscripción a Configuración
  const configRef = useMemoFirebase(() => doc(firestore, `businesses/${businessId}/publicMenuChatbot`, 'config'), [firestore, businessId]);
  const { data: configData } = useDoc<PublicMenuChatbotConfig>(configRef);
  const config = configData || DEFAULT_CHATBOT_CONFIG;

  // 2. Suscripción a Respuestas Automáticas
  const responsesQuery = useMemoFirebase(() => 
    query(collection(firestore, `businesses/${businessId}/publicMenuChatbot`, 'responses'), where('isActive', '==', true)),
    [firestore, businessId]
  );
  const { data: autoResponses } = useCollection<PublicMenuAutoResponse>(responsesQuery);

  useEffect(() => {
    if (!isPreview) {
      let sId = sessionStorage.getItem('pmc_sessionId');
      if (!sId) {
        sId = uuidv4();
        sessionStorage.setItem('pmc_sessionId', sId);
      }
      setSessionId(sId);
    }
    setMessages([{ role: 'model', content: config.greetingMessage }]);
  }, [config.greetingMessage, isPreview]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      // Prioridad 1: Respuestas Automáticas Exactas
      const matchedAuto = autoResponses?.find(r => 
        userMsg.toLowerCase().includes(r.question.toLowerCase())
      );

      if (matchedAuto) {
        setMessages(prev => [...prev, { role: 'model', content: matchedAuto.answer }]);
        setIsLoading(false);
        return;
      }

      // Prioridad 2: IA Generativa (Flujo RAG)
      const aiResponse = await publicMenuChatbotFlow({
        businessId,
        message: userMsg,
        history: messages.slice(-5) // Enviar últimos 5 mensajes para contexto
      });

      setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);

      // Registrar conversación (no bloqueante)
      if (!isPreview && sessionId) {
        const convRef = collection(firestore, `businesses/${businessId}/publicMenuChatbot`, 'conversations');
        addDoc(convRef, {
          sessionId,
          startTime: Timestamp.now(),
          status: 'active',
          messagesCount: messages.length + 2
        });
      }

    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!config.isActive && !isPreview) return null;

  const positionClass = config.position === 'bottom-left' ? 'left-6' : 'right-6';

  return (
    <div className={cn("fixed bottom-6 z-[9999] flex flex-col items-end", positionClass)}>
      {isOpen && (
        <Card className="w-[320px] sm:w-[380px] h-[500px] mb-4 shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between" style={{ backgroundColor: config.headerColor }}>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                <AvatarImage src={config.avatarUrl || ''} />
                <AvatarFallback className="bg-primary/20 text-white"><Bot /></AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <CardTitle className="text-sm font-bold text-white">{config.assistantName}</CardTitle>
                <span className="text-[10px] text-white/80 font-medium">Asistente en línea</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef} style={{ backgroundColor: config.secondaryColor }}>
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                  msg.role === 'user' 
                    ? "bg-primary text-white rounded-br-none" 
                    : "bg-white border text-gray-800 rounded-bl-none"
                )} style={msg.role === 'user' ? { backgroundColor: config.buttonColor } : { color: config.textColor }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border p-3 rounded-2xl rounded-bl-none shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-4 border-t bg-white">
            <div className="flex w-full gap-2">
              <Input 
                placeholder="Escribe tu pregunta..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 focus-visible:ring-primary"
              />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} style={{ backgroundColor: config.buttonColor }}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      <Button
        size="lg"
        className="rounded-full h-16 w-16 shadow-xl hover:scale-110 transition-transform duration-300"
        style={{ backgroundColor: config.buttonColor }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-8 w-8" /> : <MessageCircle className="h-8 w-8" />}
      </Button>
    </div>
  );
}
