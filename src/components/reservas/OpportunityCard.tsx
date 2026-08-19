'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Calendar, 
  History, 
  Bot,
  Clock,
  Sparkles
} from 'lucide-react';
import type { BookingOpportunity } from '@/services/booking-churn';
import { cn } from '@/lib/utils';
import { AiRecoveryModal } from './AiRecoveryModal';
import { useFirestore, useDoc, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  opportunity: BookingOpportunity;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function OpportunityCard({ opportunity }: Props) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Consultar balance del cliente para obtener estado de enfriamiento (cooldown) real-time
  const balanceRef = useMemoFirebase(
    () => (user ? doc(firestore, `businesses/${user.uid}/loyaltyBalances`, opportunity.customerPhone) : null),
    [user, firestore, opportunity.customerPhone]
  );
  const { data: balance } = useDoc<any>(balanceRef);

  const riskConfig = {
    critical: { label: 'Alto Riesgo', color: 'bg-red-100 text-red-700 border-red-200' },
    overdue: { label: 'Tarde', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    upcoming: { label: 'Oportunidad', color: 'bg-green-100 text-green-700 border-green-200' },
    normal: { label: 'En tiempo', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  };

  const config = riskConfig[opportunity.riskLevel];

  // Lógica de Cooldown (7 días entre intentos)
  const isLocked = useMemo(() => {
    if (!balance?.cooldownUntil) return false;
    const cooldownDate = new Date(balance.cooldownUntil);
    return cooldownDate > new Date();
  }, [balance?.cooldownUntil]);

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all border-2 group hover:shadow-lg h-full flex flex-col",
        opportunity.riskLevel === 'critical' ? 'border-red-50' : 'border-gray-100'
      )}>
        <CardContent className="p-5 space-y-4 flex-grow">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-gray-900 line-clamp-1">{opportunity.customerName}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{opportunity.customerPhone}</span>
              </div>
            </div>
            <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-tighter shrink-0", config.color)}>
              {config.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 py-3 border-y border-dashed">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Última Visita</span>
              <p className="text-xs font-black flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-primary" />
                Hace {opportunity.daysSinceLastVisit} días
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Frecuencia</span>
              <p className="text-xs font-black flex items-center gap-1.5">
                <History className="h-3 w-3 text-primary" />
                Cada {opportunity.averageIntervalDays} días
              </p>
            </div>
          </div>

          <div className="space-y-2">
             <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Último Servicio:</span>
                <span className="font-bold text-gray-800 truncate ml-2">{opportunity.lastServiceName}</span>
             </div>
             <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Valor Estimado:</span>
                <span className="font-black text-primary">{formatCurrency(opportunity.estimatedValue)}</span>
             </div>
          </div>

          {balance?.lastRecoverySentAt && (
             <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg border border-dashed text-[10px] font-bold text-muted-foreground uppercase">
                <Clock className="h-3 w-3" />
                Contactado el {format(new Date(balance.lastRecoverySentAt), "d 'de' MMM", { locale: es })}
             </div>
          )}
        </CardContent>

        <CardFooter className="bg-muted/30 p-3 mt-auto">
          {isLocked ? (
             <div className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 h-10 rounded-xl border border-amber-200">
                <Clock className="h-3 w-3" /> Enfriamiento (Anti-spam)
             </div>
          ) : (
            <Button 
              className="w-full h-10 font-black text-xs gap-2 shadow-sm rounded-xl bg-primary hover:bg-primary/90 transition-transform active:scale-95"
              onClick={() => setIsModalOpen(true)}
            >
              <Bot className="h-4 w-4" /> Recuperar Cliente con IA
            </Button>
          )}
        </CardFooter>
      </Card>

      {isModalOpen && (
        <AiRecoveryModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          opportunity={opportunity}
        />
      )}
    </>
  );
}
