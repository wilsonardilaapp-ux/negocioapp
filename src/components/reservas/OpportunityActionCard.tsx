'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  CheckCircle2, 
  MessageSquare, 
  Share2, 
  Gift, 
  Clock, 
  TrendingUp,
  AlertCircle,
  Loader2,
  CalendarCheck
} from 'lucide-react';
import type { DailyOpportunity } from '@/services/booking-daily-opportunities';
import { cn } from '@/lib/utils';
import { AiRecoveryModal } from './AiRecoveryModal';
import { updateReservationStatus } from '@/actions/booking-management';
import { useToast } from '@/hooks/use-toast';

interface Props {
  opportunity: DailyOpportunity;
  businessId: string;
}

export function OpportunityActionCard({ opportunity, businessId }: Props) {
  const { toast } = useToast();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const typeConfig = {
    churn: {
      icon: Bot,
      label: 'Recuperación',
      color: 'border-red-100 bg-red-50/10',
      badge: 'bg-red-100 text-red-700',
      actionLabel: 'Recuperar con IA ✨',
      actionIcon: Bot
    },
    confirmation: {
      icon: Clock,
      label: 'Confirmación',
      color: 'border-amber-100 bg-amber-50/10',
      badge: 'bg-amber-100 text-amber-700',
      actionLabel: 'Confirmar WhatsApp',
      actionIcon: MessageSquare
    },
    empty_slot: {
      icon: TrendingUp,
      label: 'Capacidad',
      color: 'border-green-100 bg-green-50/10',
      badge: 'bg-green-100 text-green-700',
      actionLabel: 'Compartir Horario',
      actionIcon: Share2
    },
    vip: {
      icon: Gift,
      label: 'Fidelización',
      color: 'border-purple-100 bg-purple-50/10',
      badge: 'bg-purple-100 text-purple-700',
      actionLabel: 'Premiar Cliente',
      actionIcon: Gift
    }
  };

  const config = typeConfig[opportunity.type];

  const handleAction = async () => {
    if (opportunity.type === 'churn') {
      setIsAiModalOpen(true);
      return;
    }

    if (opportunity.type === 'confirmation' && opportunity.reservationId) {
      setIsProcessing(true);
      try {
        const res = await updateReservationStatus(businessId, opportunity.reservationId, 'confirmed');
        if (res.success) {
          toast({ title: 'Cita confirmada', description: 'Se ha enviado el aviso de confirmación.' });
        }
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (opportunity.type === 'empty_slot') {
       const url = `${window.location.origin}/reservar/${businessId}`;
       navigator.clipboard.writeText(url);
       toast({ title: 'Enlace copiado', description: 'Comparte este enlace para llenar el hueco libre.' });
       return;
    }

    if (opportunity.type === 'vip') {
        toast({ title: 'Reconocimiento enviado', description: 'El cliente ha sido notificado de su estatus VIP.' });
    }
  };

  return (
    <>
      <Card className={cn("overflow-hidden border-2 transition-all hover:shadow-md", config.color)}>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg bg-white shadow-sm border", config.badge)}>
                <config.icon className="h-4 w-4" />
              </div>
              <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest border-none", config.badge)}>
                {config.label}
              </Badge>
            </div>
            {opportunity.estimatedRevenue && (
              <div className="text-right">
                <span className="text-xs font-black text-primary">${opportunity.estimatedRevenue.toLocaleString()}</span>
                <p className="text-[8px] uppercase font-bold text-muted-foreground">Impacto</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-black text-gray-900 leading-tight">{opportunity.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{opportunity.description}</p>
          </div>

          <Button 
            className={cn("w-full h-10 font-black text-xs gap-2 rounded-xl shadow-sm", 
               opportunity.type === 'churn' ? 'bg-primary' : 'variant-outline'
            )}
            onClick={handleAction}
            disabled={isProcessing}
            variant={opportunity.type === 'churn' ? 'default' : 'outline'}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <config.actionIcon className="h-4 w-4" />}
            {config.actionLabel}
          </Button>
        </CardContent>
      </Card>

      {isAiModalOpen && opportunity.data && (
        <AiRecoveryModal 
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          opportunity={opportunity.data}
        />
      )}
    </>
  );
}
