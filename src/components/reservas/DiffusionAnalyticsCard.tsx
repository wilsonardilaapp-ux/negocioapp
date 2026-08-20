'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Link2, QrCode, Tag, Clock, Loader2, BarChart3, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Tarjeta de métricas para el Centro de Difusión.
 * Muestra el rendimiento de los canales de reserva (Master Link, QR y Servicios).
 */
export function DiffusionAnalyticsCard({ businessId }: { businessId: string }) {
  const firestore = useFirestore();
  const analyticsRef = useMemoFirebase(() => 
    businessId ? doc(firestore, `businesses/${businessId}/bookingAnalytics`, 'summary') : null
  , [businessId, firestore]);

  const { data: analytics, isLoading } = useDoc<any>(analyticsRef);

  if (isLoading) {
    return (
      <Card className="rounded-[2.5rem] border-2 border-primary/10 shadow-sm animate-pulse h-48">
        <CardContent className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { 
      label: 'Visitas Enlace Maestro', 
      value: analytics?.masterLinkVisits || 0, 
      icon: Link2, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50' 
    },
    { 
      label: 'Escaneos Código QR', 
      value: analytics?.qrScans || 0, 
      icon: QrCode, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-50' 
    },
    { 
      label: 'Clics en Servicios', 
      value: analytics?.totalServiceLinkVisits || 0, 
      icon: Tag, 
      color: 'text-green-600', 
      bgColor: 'bg-green-50' 
    },
  ];

  return (
    <Card className="rounded-[2.5rem] border-2 border-primary/10 shadow-lg overflow-hidden bg-white">
      <CardHeader className="bg-primary/5 border-b pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-primary/20">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Rendimiento de Difusión</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-primary/70 tracking-widest">Alcance de Canales en Tiempo Real</CardDescription>
            </div>
          </div>
          {analytics?.lastActivityAt && (
            <Badge variant="outline" className="bg-white gap-1.5 py-1 px-3 border-primary/20 text-[10px] text-muted-foreground font-medium">
              <Clock className="h-3 w-3" />
              Actividad {formatDistanceToNow(new Date(analytics.lastActivityAt), { addSuffix: true, locale: es })}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-muted hover:border-primary/20 transition-colors group">
              <div className={cn("p-3 rounded-2xl mb-3 shadow-sm group-hover:scale-110 transition-transform", stat.bgColor, stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900 leading-none">{stat.value.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      
      <div className="px-8 pb-6 text-center border-t bg-muted/5">
        <p className="text-[10px] text-muted-foreground italic font-medium flex items-center justify-center gap-2">
            <Info className="h-3 w-3" />
            Los datos se actualizan automáticamente al abrirse el portal de reservas desde cualquier canal.
        </p>
      </div>
    </Card>
  );
}
