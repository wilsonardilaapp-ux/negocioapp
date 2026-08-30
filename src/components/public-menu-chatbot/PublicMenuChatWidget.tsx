'use client';

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2, Sparkles, CheckCircle, ThumbsUp, ShoppingCart } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, Timestamp, increment } from 'firebase/firestore';
import { publicMenuChatbotFlow } from '@/ai/flows/public-menu-chatbot-flow';
import { getSuggestion } from '@/ai/flows/suggestion-flow';
import { updateSuggestionMetrics } from '@/ai/flows/update-suggestion-metrics-flow';
import type { PublicMenuChatbotConfig, LocalMessage } from '@/models/public-menu-chatbot';
import { DEFAULT_CHATBOT_CONFIG, PUBLIC_MENU_CHATBOT_MODULE_ID } from '@/models/public-menu-chatbot';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Module } from '@/models/module';
import type { Product } from '@/models/product';
import { motion, AnimatePresence } from 'framer-motion';

interface PublicMenuChatWidgetProps {
  businessId: string;
  isPreview?: boolean;
  products?: Product[];
  onAddToCart?: (product: Product, quantity: number) => void;
}

export function PublicMenuChatWidget({ businessId, isPreview = false, products = [], onAddToCart }: PublicMenuChatWidgetProps) {
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Suscripción al estado GLOBAL del módulo (Control maestro de Super Admin)
  const globalModuleRef = useMemoFirebase(
    () => doc(firestore, 'modules', PUBLIC_MENU_CHATBOT_MODULE_ID),
    [firestore]
  );
  const { data: globalModule } = useDoc<Module>(globalModuleRef);

  // 2. Suscripción a la configuración del negocio (Control local del cliente)
  const configRef = useMemoFirebase(
    () => doc(firestore, `businesses/${businessId}/publicMenuChatbot`, 'main'), 
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
    
    // Capturar historial antes de limpiar input (últimos 6 turnos)
    const chatHistory = messages.slice(-6).map(m => ({
      role: m.role,
      content: m.content
    }));

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      if (!isPreview) {
        // Registro en subcolección conversations del documento main
        const convRef = doc(firestore, `businesses/${businessId}/publicMenuChatbot/main/conversations`, sessionId);
        setDoc(convRef, {
          sessionId,
          updatedAt: Timestamp.now(),
          messagesCount: increment(1)
        }, { merge: true }).catch(() => {});
      }

      const result = await publicMenuChatbotFlow({ 
        businessId, 
        question: userMsg, 
        sessionId,
        history: chatHistory
      });

      const botMessage: LocalMessage = { 
        role: 'model', 
        content: result.answer, 
        timestamp: new Date(),
        detectedProductId: result.detectedProductId 
      };

      // --- LÓGICA DE INTEGRACIÓN CON MOTOR DE SUGERENCIAS ---
      if (result.detectedProductId && products.length > 0 && !isPreview) {
        const product = products.find(p => p.id === result.detectedProductId);
        if (product) {
            try {
                const suggestion = await getSuggestion({ businessId, productId: product.id });
                if (suggestion && suggestion.suggestedProduct) {
                    botMessage.suggestionData = {
                        originalProductId: product.id,
                        suggestedProductId: suggestion.suggestedProduct.id,
                        reason: suggestion.reason || `¡Excelente elección! Muchos clientes también llevan ${suggestion.suggestedProduct.name}.`,
                        ruleId: suggestion.ruleId
                    };
                    
                    // Registrar impresión de sugerencia
                    updateSuggestionMetrics({ 
                        businessId, 
                        ruleId: suggestion.ruleId || 'ai-generated', 
                        event: 'shown' 
                    });
                }
            } catch (e) {
                console.warn("[Chatbot Suggestion] Error fetching suggestion:", e);
            }
        }
      }

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: 'Lo siento, tuve un problema al procesar tu mensaje. Intenta de nuevo.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSuggestion = (msg: LocalMessage) => {
    if (!msg.suggestionData || !onAddToCart) return;
    
    const original = products.find(p => p.id === msg.suggestionData?.originalProductId);
    const suggested = products.find(p => p.id === msg.suggestionData?.suggestedProductId);

    if (original && suggested) {
        onAddToCart(original, 1);
        onAddToCart(suggested, 1);
        
        // Registrar aceptación
        updateSuggestionMetrics({ 
            businessId, 
            ruleId: msg.suggestionData.ruleId || 'ai-generated', 
            event: 'accepted' 
        });

        setMessages(prev => [...prev, { 
            role: 'model', 
            content: `✅ ¡Perfecto! He agregado ${original.name} y ${suggested.name} a tu carrito.`, 
            timestamp: new Date() 
        }]);
    }
  };

  const handleAddOnlyOriginal = (msg: LocalMessage) => {
    if (!onAddToCart || !msg.detectedProductId) return;
    const product = products.find(p => p.id === msg.detectedProductId);
    if (product) {
        onAddToCart(product, 1);
        setMessages(prev => [...prev, { 
            role: 'model', 
            content: `✅ Listo, he agregado ${product.name} a tu carrito.`, 
            timestamp: new Date() 
        }]);
    }
  };

  // LÓGICA DE VISIBILIDAD
  const isPlatformBot = businessId === 'platform-bot';
  const isGlobalActive = globalModule?.status === 'active' || isPlatformBot;
  const isLocalActive = config.isActive === true || isPlatformBot;

  if (!isPreview && (!isGlobalActive || !isLocalActive)) return null;

  const bottomClass = isPlatformBot ? 'bottom-28' : 'bottom-6';
  const positionClass = config.position === 'bottom-left' ? 'left-6' : 'right-6';

  return (
    <div className={cn("fixed z-[100] flex flex-col items-end", bottomClass, positionClass)}>
      {isOpen && (
        <Card className="w-[320px] sm:w-[380px] h-[500px] mb-4 shadow-2xl flex flex-col border-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between" style={{ backgroundColor: config.headerColor }}>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                <AvatarImage src={config.avatarUrl || ''} />
                <AvatarFallback>{config.assistantName.charAt(0)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-sm font-bold text-white">{config.assistantName}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="text-white h-8 w-8 hover:bg-white/10" onClick={() => setIsOpen(false)}><X className="h-5 w-5" /></Button>
          </CardHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollRef} style={{ backgroundColor: config.secondaryColor }}>
            <div className="space-y-4 pb-4">
                {messages.map((msg, i) => {
                const product = products.find(p => p.id === msg.detectedProductId);
                const suggested = products.find(p => p.id === msg.suggestionData?.suggestedProductId);
                
                return (
                <div key={i} className="space-y-3">
                    <div className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div className={cn("max-w-[85%] p-3 rounded-2xl text-sm shadow-sm", msg.role === 'user' ? "bg-primary text-white" : "bg-white border text-gray-800")} style={msg.role === 'user' ? { backgroundColor: config.buttonColor } : { color: config.textColor }}>{msg.content}</div>
                    </div>
                    
                    {/* Bloque de Acciones Interactivas */}
                    {(msg.detectedProductId || msg.suggestionData) && msg.role === 'model' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border-2 border-primary/20 p-4 rounded-[1.5rem] shadow-lg space-y-3 mx-2"
                        >
                            <div className="flex items-center gap-2 text-primary">
                                <Sparkles className="h-4 w-4 fill-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {msg.suggestionData ? 'Sugerencia Inteligente' : 'Acción Rápida'}
                                </span>
                            </div>

                            {msg.suggestionData && (
                                <p className="text-xs font-medium text-gray-700 leading-snug">{msg.suggestionData.reason}</p>
                            )}

                            <div className="flex flex-col gap-2">
                                {msg.suggestionData && suggested && (
                                    <Button 
                                        size="sm" 
                                        className="w-full font-black h-10 gap-2 shadow-sm"
                                        onClick={() => handleAcceptSuggestion(msg)}
                                    >
                                        <ShoppingCart className="h-3 w-3" /> Agregar {product?.name || 'Ítem'} + {suggested.name}
                                    </Button>
                                )}
                                
                                {product && (
                                    <Button 
                                        size="sm" 
                                        variant={msg.suggestionData ? "outline" : "default"}
                                        className={cn("w-full font-bold h-10 gap-2", !msg.suggestionData && "shadow-md")}
                                        onClick={() => handleAddOnlyOriginal(msg)}
                                    >
                                        <ShoppingCart className="h-3 w-3" /> Solo agregar {product.name}
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
                )})}
                {isLoading && <div className="flex justify-start"><div className="bg-white border p-3 rounded-2xl shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div></div>}
            </div>
          </ScrollArea>

          <CardFooter className="p-4 border-t bg-white">
            <div className="flex w-full gap-2">
              <Input placeholder="Pregunta algo..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="h-10" />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} style={{ backgroundColor: config.buttonColor }} className="hover:opacity-90"><Send className="h-4 w-4" /></Button>
            </div>
          </CardFooter>
        </Card>
      )}

      <Button 
        size="lg" 
        className={cn(
          "rounded-full h-16 w-16 shadow-xl hover:scale-105 transition-transform overflow-hidden",
          config.avatarUrl && !isOpen ? "p-0" : ""
        )} 
        style={{ backgroundColor: config.buttonColor }} 
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-8 w-8 text-white" />
        ) : config.avatarUrl ? (
          <img src={config.avatarUrl} alt={config.assistantName || "Avatar"} className="h-full w-full object-cover" />
        ) : (
          <MessageCircle className="h-8 w-8 text-white" />
        )}
      </Button>
    </div>
  );
}
