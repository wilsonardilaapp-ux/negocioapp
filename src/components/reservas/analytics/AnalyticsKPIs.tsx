'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Bot, 
  TrendingUp,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  data: {
    totalRevenue: number;
    completedCount: number;
    attendanceRate: number;
    cancelledCount: number;
    noShowCount: number;
    recoveredCount: number;
    recoveredRevenue: number;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function AnalyticsKPIs({ data }: Props) {
  const kpis = [
    {
      title: 'Facturación Real',
      value: formatCurrency(data.totalRevenue),
      description: 'Citas completadas y pagadas',
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      borderColor: 'border-primary/10',
      badge: null
    },
    {
      title: 'Citas Atendidas',
      value: data.completedCount,
      description: 'Citas exitosas en el periodo',
      icon: CheckCircle2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      badge: {
          label: `${data.attendanceRate.toFixed(1)}% Show`,
          color: data.attendanceRate >= 80 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
      }
    },
    {
      title: 'Fuga Operativa',
      value: data.noShowCount + data.cancelledCount,
      description: 'Cancelaciones y No-shows',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-100',
      badge: {
          label: 'Alerta Pérdida',
          color: 'bg-red-100 text-red-700'
      }
    },
    {
      title: 'Impacto IA (ROI)',
      value: formatCurrency(data.recoveredRevenue),
      description: `${data.recoveredCount} clientes que volvieron por IA`,
      icon: Bot,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      badge: {
          label: 'AI Recovered',
          color: 'bg-indigo-600 text-white'
      }
    }
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
            <div className={cn("text-2xl font-black tracking-tight", kpi.color)}>
              {kpi.value}
            </div>
            <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] font-medium text-muted-foreground">
                    {kpi.description}
                </p>
                {kpi.badge && (
                    <Badge variant="outline" className={cn("text-[9px] font-black py-0 px-2 h-5 border-none", kpi.badge.color)}>
                        {kpi.badge.label}
                    </Badge>
                )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
