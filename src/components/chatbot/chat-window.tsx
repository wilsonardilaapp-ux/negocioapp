'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, X, Loader2 } from 'lucide-react';
import { chat, type ChatInput } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';
import { registerConversation } from '@/actions/register-conversation';

interface ChatWindowProps {
  businessId: string;
  businessName: string;
  avatarUrl: string;
  greeting: string;
  onClose: () => void;
}

type Message = {
  role: 'user' | 'model';
  content: string;
};

const renderMessageContent = (text: string) => {
  if (!text) {
    return null;
  }
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export function ChatWindow({ businessId, businessName, avatarUrl, greeting, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'model', content: greeting }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isFirstMessage = messages.filter(m => m.role === 'user').length === 0;

  useEffect(() => {
    // This code now runs only on the client side
    let currentSessionId = sessionStorage.getItem('chatbotSessionId');
    if (!currentSessionId) {
        currentSessionId = uuidv4();
        sessionStorage.setItem('chatbotSessionId', currentSessionId);
    }
    setSessionId(currentSessionId);
  }, []);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading || !sessionId) return;

    if (isFirstMessage) {
        console.log("🔵 [CLIENTE] Registrando nueva conversación vía Server Action...");
        try {
            await registerConversation({
                businessId: businessId,
                userIdentifier: sessionId,
            });
            console.log("✅ [CLIENTE] Server Action de registro completada.");
        } catch (error) {
            console.error("🔴 [CLIENTE] Error llamando a la Server Action (pero la IA seguirá intentando responder):", error);
        }
    }

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const chatInput: ChatInput = {
        businessId,
        history: messages,
        message: currentInput,
      };

      const response = await chat(chatInput);
      
      const botMessage: Message = { role: 'model', content: response };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error al enviar mensaje a la IA:', error);
      const errorMessage: Message = {
        role: 'model',
        content: 'Lo siento, ha ocurrido un error técnico con la conexión.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if(viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={avatarUrl || `https://i.pravatar.cc/150?u=${businessId}`} />
            <AvatarFallback>{businessName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base font-semibold">{businessName}</CardTitle>
            <p className="text-xs text-green-500">En línea</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="hidden sm:flex">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

       <ScrollArea className="flex-1" ref={scrollAreaRef}>
         <CardContent className="p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-end gap-2',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'model' && (
                   <Avatar className="h-6 w-6">
                        <AvatarImage src={avatarUrl || `https://i.pravatar.cc/150?u=${businessId}`} />
                        <AvatarFallback>{businessName.charAt(0)}</AvatarFallback>
                    </Avatar>
                )}
                 <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {renderMessageContent(message.content)}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-end gap-2">
                 <Avatar className="h-6 w-6">
                    <AvatarImage src={avatarUrl || `https://i.pravatar.cc/150?u=${businessId}`} />
                    <AvatarFallback>{businessName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
         </CardContent>
      </ScrollArea>
      
      <CardFooter className="p-4 border-t">
        <div className="flex w-full items-center space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || input.trim() === ''}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </CardFooter>
    </div>
  );
}
