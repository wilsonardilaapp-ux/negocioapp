'use client';

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2, Sparkles, ShoppingCart, CheckCircle2, Ticket } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { couponService } from '@/services/coupon-service';

interface PublicMenuChatWidgetProps {
  businessId: string;
  isPreview?: boolean;
  products?: Product[];
  onAddToCart?: (product: Product, quantity: number) => void;
  onApplyCoupon?: (code: string) => Promise<{ success: boolean, message?: string }>;
}

export function PublicMenuChatWidget({ businessId, isPreview = false, products = [], onAddToCart, onApplyCoupon }: PublicMenuChatWidgetProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const globalModuleRef = useMemoFirebase(
    () => doc(firestore, 'modules', PUBLIC_MENU_CHATBOT_MODULE_ID),
    [firestore]
  );
  const { data: globalModule } = useDoc<Module>(globalModuleRef);

  const configRef = useMemoFirebase(
    () => (businessId ? doc(firestore, `businesses/${businessId}/publicMenuChatbot`, 'main') : null), 
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
    const chatHistory = messages.slice(-6).map(m => ({
      role: m.role,
      content: m.content
    }));

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      if (!isPreview) {
        const convRef = doc(firestore, `businesses/${businessId}/publicMenuChatbot/main/conversations`, sessionId);
        setDoc(convRef, { sessionId, updatedAt: Timestamp.now(), messagesCount: increment(1) }, { merge: true }).catch(() => {});
      }

      const result = await publicMenuChatbotFlow({ businessId, question: userMsg, sessionId, history: chatHistory });

      const botMessage: LocalMessage = { role: 'model', content: result.answer, timestamp: new Date() };

      // Lógica de Cupones Transaccional
      if (result.detectedCouponCode && onApplyCoupon) {
        const couponResult = await onApplyCoupon(result.detectedCouponCode);
        if (couponResult.success) {
            botMessage.content += `\n\n✅ ¡Cupón **${result.detectedCouponCode}** aplicado con éxito al carrito!`;
        } else {
            botMessage.content += `\n\n⚠️ No pude aplicar el cupón **${result.detectedCouponCode}**: ${couponResult.message}`;
        }
      }

      // Lógica de Sugerencias (Preservada)
      if (result.detectedProductId && !isPreview) {
        const originalProduct = products.find(p => 
            p.id === result.detectedProductId || 
            p.name.toLowerCase().trim() === result.detectedProductId?.toLowerCase().trim()
        );

        if (originalProduct) {
            botMessage.detectedProductId = originalProduct.id;
            const suggestion = await getSuggestion({ businessId, productId: originalProduct.id });

            if (suggestion && suggestion.suggestedProduct) {
                botMessage.suggestionData = {
                    originalProductId: originalProduct.id,
                    suggestedProductId: suggestion.suggestedProduct.id,
                    reason: suggestion.reason || `Combo recomendado con ${suggestion.suggestedProduct.name}`,
                    ruleId: suggestion.ruleId
                };
                updateSuggestionMetrics({ businessId, ruleId: suggestion.ruleId || 'ai-generated', event: 'shown' });
            }
        }
      }

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: 'Lo siento, tuve un problema al procesar tu mensaje.', timestamp: new Date() }]);
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
        updateSuggestionMetrics({ businessId, ruleId: msg.suggestionData.ruleId || 'ai-generated', event: 'accepted' });
        setMessages(prev => [...prev, { role: 'model', content: `✅ ¡Perfecto! He agregado ${original.name} y ${suggested.name} a tu carrito.`, timestamp: new Date() }]);
        toast({ title: "Productos agregados" });
    }
  };

  const handleAddOnlyOriginal = (msg: LocalMessage) => {
    if (!onAddToCart || !msg.detectedProductId) return;
    const product = products.find(p => p.id === msg.detectedProductId);
    if (product) {
        onAddToCart(product, 1);
        setMessages(prev => [...prev, { role: 'model', content: `✅ Listo, he agregado ${product.name} a tu carrito.`, timestamp: new Date() }]);
        toast({ title: "Producto agregado" });
    }
  };

  return (
    <div className={cn("fixed z-[100] flex flex-col items-end", businessId === 'platform-bot' ? 'bottom-28' : 'bottom-6', config.position === 'bottom-left' ? 'left-6' : 'right-6')}>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="w-[320px] sm:w-[380px] h-[500px] mb-4 shadow-2xl flex flex-col border-2 overflow-hidden bg-background rounded-3xl">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between shrink-0" style={{ backgroundColor: config.headerColor }}>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white/20"><AvatarImage src={config.avatarUrl || ''} /><AvatarFallback>{config.assistantName.charAt(0)}</AvatarFallback></Avatar>
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
                              <div className={cn("max-w-[85%] p-3 rounded-2xl text-sm shadow-sm", msg.role === 'user' ? "bg-primary text-white" : "bg-white border text-gray-800")} style={msg.role === 'user' ? { backgroundColor: config.buttonColor } : {}}>{msg.content}</div>
                          </div>
                          {msg.role === 'model' && (msg.detectedProductId || msg.suggestionData) && (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50/60 border border-emerald-200/60 p-4 rounded-[1.5rem] shadow-sm space-y-3 mx-2">
                                  <div className="flex items-center gap-2 text-emerald-700">
                                      <Sparkles className="h-4 w-4 fill-emerald-500" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Sugerencia especial</span>
                                  </div>
                                  
                                  {suggested && (
                                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-sm">
                                      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 border">
                                        {suggested.images?.[0] ? (
                                          <img 
                                            src={suggested.images[0]} 
                                            alt={suggested.name} 
                                            className="w-full h-full object-cover" 
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><ShoppingCart size={20} /></div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-gray-900 truncate">{suggested.name}</h4>
                                        <p className="text-xs font-black text-emerald-600 mt-0.5">${suggested.price.toLocaleString('es-CO')}</p>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Recomendado para ti</span>
                                      </div>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-2 mt-3">
                                      <Button 
                                          size="sm" 
                                          className="w-full font-black h-10 gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md transition-all active:scale-95" 
                                          onClick={() => suggested ? handleAcceptSuggestion(msg) : handleAddOnlyOriginal(msg)}
                                      >
                                          <CheckCircle2 className="h-4 w-4" /> Agregar
                                      </Button>
                                      <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="w-full font-bold h-10 gap-2 rounded-xl bg-white border-emerald-100 text-emerald-700 hover:bg-emerald-50 transition-all active:scale-95" 
                                          onClick={() => handleAddOnlyOriginal(msg)}
                                      >
                                          No, gracias
                                      </Button>
                                  </div>
                              </motion.div>
                          )}
                      </div>
                  )})}
                  {isLoading && <div className="flex justify-start"><div className="bg-white border p-3 rounded-2xl shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div></div>}
              </div>
            </ScrollArea>
            <CardFooter className="p-4 border-t bg-white shrink-0">
              <div className="flex w-full gap-2">
                <Input placeholder="Pregunta por productos o cupones..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="h-10" />
                <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} style={{ backgroundColor: config.buttonColor }}><Send className="h-4 w-4" /></Button>
              </div>
            </CardFooter>
          </motion.div>
        )}
      </AnimatePresence>
      <Button size="lg" className={cn("rounded-full h-16 w-16 shadow-xl hover:scale-105 transition-transform overflow-hidden", config.avatarUrl && !isOpen ? "p-0" : "")} style={{ backgroundColor: config.buttonColor }} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X className="h-8 w-8 text-white" /> : config.avatarUrl ? <img src={config.avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : <MessageCircle className="h-8 w-8 text-white" />}
      </Button>
    </div>
  );
}
