'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Trophy, Medal, User, Loader2, Calendar, RefreshCw } from 'lucide-react';
import { getVipRanking } from '@/actions/loyalty';
import type { LoyaltyBalance } from '@/services/loyalty-service';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface VipRankingProps {
  businessId: string;
}

/**
 * Enmascara el número de WhatsApp para proteger la privacidad del cliente.
 */
const maskPhone = (phone: string): string => {
  if (phone.length < 7) return phone;
  const start = phone.slice(0, 3);
  const end = phone.slice(-3);
  return `${start}****${end}`;
};

export default function VipCustomersRanking({ businessId }: VipRankingProps) {
  const [ranking, setRanking] = useState<LoyaltyBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRanking = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getVipRanking(businessId);
      setRanking(data);
    } catch (error) {
      console.error("Error loading VIP ranking:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) fetchRanking();
  }, [businessId, fetchRanking]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRanking(true);
    setIsRefreshing(false);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="h-5 w-5 text-amber-500 fill-amber-500" />;
      case 1: return <Trophy className="h-4 w-4 text-slate-400 fill-slate-400" />;
      case 2: return <Medal className="h-4 w-4 text-orange-400 fill-orange-400" />;
      default: return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{index + 1}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Cargando ranking de clientes...</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-none bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <CardTitle>Ranking de Clientes VIP</CardTitle>
                    <CardDescription>Basado en puntos acumulados y frecuencia.</CardDescription>
                </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2 font-bold">
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Actualizando...' : 'Refrescar Datos'}
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[60px] text-center">Rango</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Visitas</TableHead>
                <TableHead className="text-right">Puntos</TableHead>
                <TableHead className="text-right">Última Actividad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.length > 0 ? (
                ranking.map((client, index) => (
                  <TableRow key={client.whatsapp} className={cn("hover:bg-muted/30 transition-colors", index < 3 && "bg-primary/[0.02]")}>
                    <TableCell className="text-center font-bold">
                        <div className="flex justify-center">
                            {getRankIcon(index)}
                        </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-sm">{client.name || 'Cliente'}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {maskPhone(client.whatsapp)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-black text-xs px-2.5">
                        {client.visitCount || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary">
                      {client.points.toLocaleString()} <span className="text-[9px] font-bold opacity-70">pts</span>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-medium">
                                {client.lastVisitAt 
                                    ? formatDistanceToNow(new Date(client.lastVisitAt), { addSuffix: true, locale: es })
                                    : '---'
                                }
                            </span>
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
                                <Calendar className="h-2.5 w-2.5" />
                                {client.lastVisitAt 
                                    ? new Date(client.lastVisitAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
                                    : '---'
                                }
                            </div>
                        </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    Aún no hay clientes registrados en el sistema de fidelización.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
