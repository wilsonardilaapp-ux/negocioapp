
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
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

  // 1. Suscripción a la configuración (Ruta Doc: 4 segmentos)
  const configRef = useMemoFirebase(() => 
    doc(firestore, `businesses/${businessId}/publicMenuChatbot`, 'main'), 
    [firestore, businessId]
  );
  const { data: configData } = useDoc<PublicMenuChatbotConfig>(configRef);
  const config = configData || DEFAULT_CHATBOT_CONFIG;

  useEffect(() => {
    if (isPreview) return;
    const sId = uuidv4();
    setSessionId(sId);
    setMessages([{ role: 'model', content: config.greetingMessage, timestamp: new Date() }]);
  }, [businessId, isPreview, config.greetingMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionId) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      if (!isPreview) {
        // Registro en subcolección conversations del documento main (Ruta Doc: 6 segmentos)
        const convRef = doc(firestore, `businesses/${businessId}/publicMenuChatbot/main/conversations`, sessionId);
        setDoc(convRef, {
          sessionId,
          updatedAt: Timestamp.now(),
          messagesCount: increment(1)
        }, { merge: true }).catch(() => {});
      }

      const result = await publicMenuChatbotFlow({ businessId, question: userMsg, sessionId });
      setMessages(prev => [...prev, { role: 'model', content: result.answer, timestamp: new Date() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: 'Error técnico.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!config.isActive && !isPreview) return null;

  const positionClass = config.position === 'bottom-left' ? 'left-6' : 'right-6';

  return (
    <div className={cn("fixed bottom-6 z-[100] flex flex-col items-end", positionClass)}>
      {isOpen && (
        <Card className="w-[320px] sm:w-[380px] h-[500px] mb-4 shadow-2xl flex flex-col border-2 overflow-hidden">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between" style={{ backgroundColor: config.headerColor }}>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                <AvatarImage src={config.avatarUrl || ''} />
                <AvatarFallback>{config.assistantName.charAt(0)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-sm font-bold text-white">{config.assistantName}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="text-white h-8 w-8" onClick={() => setIsOpen(false)}><X className="h-5 w-5" /></Button>
          </CardHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollRef} style={{ backgroundColor: config.secondaryColor }}>
            <div className="space-y-4">
                {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn("max-w-[85%] p-3 rounded-2xl text-sm shadow-sm", msg.role === 'user' ? "bg-primary text-white" : "bg-white border text-gray-800")} style={msg.role === 'user' ? { backgroundColor: config.buttonColor } : { color: config.textColor }}>{msg.content}</div>
                </div>
                ))}
                {isLoading && <div className="flex justify-start"><div className="bg-white border p-3 rounded-2xl shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div></div>}
            </div>
          </ScrollArea>

          <CardFooter className="p-4 border-t bg-white">
            <div className="flex w-full gap-2">
              <Input placeholder="Pregunta..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="h-10" />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} style={{ backgroundColor: config.buttonColor }}><Send className="h-4 w-4" /></Button>
            </div>
          </CardFooter>
        </Card>
      )}

      <Button size="lg" className="rounded-full h-16 w-16 shadow-xl" style={{ backgroundColor: config.buttonColor }} onClick={() => setIsOpen(!isOpen)}>{isOpen ? <X className="h-8 w-8" /> : <MessageCircle className="h-8 w-8" />}</Button>
    </div>
  );
}
