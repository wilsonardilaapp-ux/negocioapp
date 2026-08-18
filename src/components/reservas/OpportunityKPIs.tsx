'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Users,
  Target
} from 'lucide-react';
import type { ChurnMetrics } from '@/services/booking-churn';
import { cn } from '@/lib/utils';

interface Props {
  metrics: ChurnMetrics;
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function OpportunityKPIs({ metrics, isLoading }: Props) {
  const kpis = [
    {
      title: 'Alto Riesgo (Churn)',
      value: metrics.criticalCount,
      description: 'Superaron su ciclo habitual',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-100',
    },
    {
      title: 'Por Re-agendar',
      value: metrics.overdueCount,
      description: 'Cumplieron su ciclo hoy',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100',
    },
    {
      title: 'Próximas Ventas',
      value: metrics.upcomingCount,
      description: 'En ventana de contacto',
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100',
    },
    {
      title: 'Ingresos en Riesgo',
      value: formatCurrency(metrics.totalAtRiskRevenue),
      description: 'Ventas por recuperar',
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      borderColor: 'border-primary/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <Card key={i} className={cn("border-2 shadow-sm transition-all hover:shadow-md", kpi.borderColor)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <div className={cn("p-1.5 rounded-lg", kpi.bgColor)}>
              <kpi.icon className={cn("h-4 w-4", kpi.color)} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className={cn("text-2xl font-black tracking-tight", kpi.color)}>
                {kpi.value}
              </div>
            )}
            <p className="text-[10px] font-medium text-muted-foreground mt-1">
              {kpi.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
