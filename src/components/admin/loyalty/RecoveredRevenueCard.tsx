'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { 
  TrendingUp, 
  Loader2, 
  Info, 
  Zap,
  Target
} from 'lucide-react';
import { getRecoveryStats } from '@/actions/loyalty';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface RecoveryStats {
  totalRevenue: number;
  count: number;
  topReason: string;
}

interface RecoveredRevenueCardProps {
  businessId: string;
}

export default function RecoveredRevenueCard({ businessId }: RecoveredRevenueCardProps) {
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const data = await getRecoveryStats(businessId);
        setStats(data);
      } catch (error) {
        console.error("Error loading recovery stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (businessId) fetchStats();
  }, [businessId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse border-green-100 bg-green-50/5">
        <CardHeader className="pb-2">
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50/10 shadow-sm overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Zap className="h-24 w-24 text-green-600" />
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle className="text-sm font-black uppercase tracking-widest text-green-800">
              Revenue Recuperado
            </CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] p-3 text-xs">
                Estimación basada en una ventana de atribución de 7 días tras el envío de un mensaje de recuperación por IA (Churn o Reseña Negativa).
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-green-700/60 font-medium">
          Impacto directo de la IA este mes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-black text-gray-900 tracking-tight">
            {formatCurrency(stats?.totalRevenue || 0)}
          </div>
          <div className="flex items-center gap-2 mt-1">
             <div className="p-1 bg-green-100 rounded text-green-700">
                <Target className="h-3 w-3" />
             </div>
             <p className="text-xs font-bold text-green-800">
               {stats?.count || 0} pedidos rescatados
             </p>
          </div>
        </div>

        <div className="pt-4 border-t border-green-200/50 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
            Canal más efectivo:
          </span>
          <span className="text-[10px] font-black uppercase text-green-700 bg-green-200/40 px-2 py-0.5 rounded">
            {stats?.topReason || 'N/A'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
