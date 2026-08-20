'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Loader2, 
  Send, 
  Sparkles, 
  RotateCcw, 
  User, 
  Smartphone, 
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Business } from '@/models/business';
import type { ChatbotConfig, WhatsAppProviderType } from '@/models/chatbot-config';
import type { BookingOpportunity } from '@/services/booking-churn';
import { generateRecoveryMessage, type RecoveryTone } from '@/services/booking-ai-recovery';
import { sendRecoveryWhatsApp } from '@/actions/booking-ai-actions';
import { cn, normalizePhoneNumber } from '@/lib/utils';

interface AiRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: BookingOpportunity;
}

export function AiRecoveryModal({ isOpen, onClose, opportunity }: AiRecoveryModalProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<RecoveryTone>('cercano');
  const [selectedProvider, setSelectedProvider] = useState<WhatsAppProviderType>('whapi');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const businessRef = useMemoFirebase(
    () => (user ? doc(firestore, 'businesses', user.uid) : null),
    [user, firestore]
  );
  const { data: business } = useDoc<Business>(businessRef);

  const configRef = useMemoFirebase(
    () => (user ? doc(firestore, `businesses/${user.uid}/chatbotConfig/main`) : null),
    [user, firestore]
  );
  const { data: chatbotConfig } = useDoc<ChatbotConfig>(configRef);

  const isYCloudConfigured = !!chatbotConfig?.yCloud?.apiKey && !!chatbotConfig?.yCloud?.phoneNumber;
  const isWhapiConfigured = !!chatbotConfig?.whatsApp?.token;

  useEffect(() => {
    if (chatbotConfig?.provider && (chatbotConfig.provider === 'whapi' || chatbotConfig.provider === 'ycloud')) {
      setSelectedProvider(chatbotConfig.provider);
    }
  }, [chatbotConfig?.provider]);

  const handleGenerate = async (selectedTone: RecoveryTone = tone) => {
    if (!business) return;
    setTone(selectedTone);
    setIsGenerating(true);
    try {
      const text = await generateRecoveryMessage(opportunity, business, selectedTone);
      setMessage(text);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudo generar el mensaje.' });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen && business && !message) {
      handleGenerate();
    }
  }, [isOpen, business]);

  const handleSend = async () => {
    if (!user || !message.trim()) return;
    setIsSending(true);
    try {
      const result = await sendRecoveryWhatsApp(user.uid, {
        customerPhone: opportunity.customerPhone,
        customerName: opportunity.customerName,
        messageText: message,
        tone: tone,
        status: 'sent'
      }, selectedProvider);

      if (result.success) {
        toast({ title: '¡Mensaje enviado!', description: `Hemos contactado a ${opportunity.customerName} vía API (${selectedProvider.toUpperCase()}).` });
        onClose();
      } else {
        toast({ variant: 'destructive', title: 'Error al enviar', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error técnico', description: 'No se pudo procesar el envío.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleManualSend = () => {
    const rawPhone = opportunity.customerPhone;
    if (!rawPhone) {
      toast({ variant: "destructive", title: "Error", description: "El cliente no tiene teléfono válido." });
      return;
    }
    const phone = normalizePhoneNumber(rawPhone);
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMsg}`, "_blank", "noopener,noreferrer");
    toast({ title: "WhatsApp Manual Abierto", description: "Completa el envío en la nueva pestaña." });
  };

  const charCount = message.length;
  const isOverLimit = charCount > 250;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSending && !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
        <DialogHeader className="p-8 pb-4 bg-primary/5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-primary/20">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">Recuperación con IA</DialogTitle>
                <DialogDescription className="text-xs font-bold text-primary/70 uppercase tracking-widest">Human-in-the-loop Engine</DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-white gap-1.5 py-1 px-3 border-primary/20 text-primary">
              <Sparkles className="h-3 w-3 fill-primary" /> IA Activa
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Ficha rápida del cliente */}
          <div className="grid grid-cols-2 gap-4">
             <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl border border-dashed">
                <div className="p-2 bg-white rounded-lg shadow-sm"><User className="h-4 w-4 text-muted-foreground" /></div>
                <div className="flex flex-col"><span className="text-[10px] font-bold text-muted-foreground uppercase">Cliente</span><span className="text-xs font-black truncate">{opportunity.customerName}</span></div>
             </div>
             <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl border border-dashed">
                <div className="p-2 bg-white rounded-lg shadow-sm"><Clock className="h-4 w-4 text-muted-foreground" /></div>
                <div className="flex flex-col"><span className="text-[10px] font-bold text-muted-foreground uppercase">Inactividad</span><span className="text-xs font-black text-red-600">{opportunity.daysSinceLastVisit} días</span></div>
             </div>
          </div>

          {/* Selector de Canal de Envío API */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Canal de Envío (API)</Label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedProvider('ycloud')}
                disabled={!isYCloudConfigured || isSending}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-2",
                  selectedProvider === 'ycloud' 
                    ? "bg-primary/10 text-primary border-primary shadow-sm" 
                    : "bg-white border-gray-100 text-gray-500 hover:border-gray-200",
                  !isYCloudConfigured && "opacity-40 cursor-not-allowed"
                )}
              >
                <Smartphone className="h-3.5 w-3.5" /> YCloud
                {!isYCloudConfigured && <span className="text-[8px] font-normal ml-1">(No config.)</span>}
              </button>
              <button
                onClick={() => setSelectedProvider('whapi')}
                disabled={!isWhapiConfigured || isSending}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-2",
                  selectedProvider === 'whapi' 
                    ? "bg-primary/10 text-primary border-primary shadow-sm" 
                    : "bg-white border-gray-100 text-gray-500 hover:border-gray-200",
                  !isWhapiConfigured && "opacity-40 cursor-not-allowed"
                )}
              >
                <WhatsAppIcon className="h-3.5 w-3.5" /> WHAPI
                {!isWhapiConfigured && <span className="text-[8px] font-normal ml-1">(No config.)</span>}
              </button>
            </div>
          </div>

          {/* Selector de Tono */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estilo de comunicación</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'cercano', label: '🌿 Cercano', color: 'bg-green-50 text-green-700' },
                { id: 'formal', label: '👔 Formal', color: 'bg-blue-50 text-blue-700' },
                { id: 'beneficios', label: '✨ Beneficios', color: 'bg-amber-50 text-amber-700' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleGenerate(t.id as RecoveryTone)}
                  disabled={isGenerating}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                    tone === t.id ? cn(t.color, "border-current shadow-sm") : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Área de edición con IA */}
          <div className="space-y-2 relative">
            <div className="flex justify-between items-end mb-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Propuesta de mensaje</Label>
              <span className={cn("text-[10px] font-bold", isOverLimit ? "text-red-600" : "text-muted-foreground")}>
                {charCount}/250
              </span>
            </div>
            <div className="relative group">
               <Textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="La IA está redactando tu propuesta..."
                className={cn(
                  "min-h-[160px] resize-none rounded-2xl border-2 transition-all p-4 text-sm leading-relaxed",
                  isGenerating ? "opacity-40" : "bg-white focus-visible:ring-primary/20",
                  isOverLimit && "border-red-200"
                )}
                disabled={isGenerating || isSending}
              />
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
            {isOverLimit && (
              <p className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> El mensaje es muy largo para una notificación de WhatsApp efectiva.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="bg-muted/20 -mx-6 -mb-6 p-6 border-t flex flex-col sm:flex-row flex-wrap gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSending} className="font-bold flex-1">
            Ahora no
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleGenerate()} 
            disabled={isGenerating || isSending}
            className="font-bold flex-1 gap-2 bg-white"
          >
            <RotateCcw className="h-4 w-4" /> Regenerar
          </Button>
          <Button 
            variant="outline"
            onClick={handleManualSend} 
            disabled={isGenerating || isSending || !message.trim()}
            className="font-bold flex-1 gap-2 bg-white border-green-200 text-green-700 hover:bg-green-50"
          >
            <MessageSquare className="h-4 w-4" /> Enviar Manual
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isGenerating || isSending || !message.trim() || isOverLimit}
            className="font-black flex-[1.5] gap-2 h-12 shadow-xl shadow-primary/10 bg-primary hover:bg-primary/90"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />}
            Enviar por WhatsApp 🚀
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WhatsAppIcon(props: any) {
  return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" {...props}>
          <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.068-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
      </svg>
  );
}
