'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Bot, 
  Loader2, 
  CheckCircle2, 
  UserX,
  AlertCircle
} from 'lucide-react';
import { getChurnStatistics, bulkRecoverChurnClients } from '@/actions/loyalty';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChurnStats {
  customers: any[];
  totalCount: number;
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

export default function ChurnRiskCard({ businessId }: { businessId: string }) {
  const [stats, setStats] = useState<ChurnStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await getChurnStatistics(businessId);
      setStats(data);
    } catch (error) {
      console.error("Error loading churn stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) fetchStats();
  }, [businessId]);

  const handleBulkRecovery = async () => {
    setIsProcessing(true);
    try {
      const result = await bulkRecoverChurnClients(businessId);
      if (result.success) {
        toast({
          title: "¡Recuperación iniciada!",
          description: `Se han programado ${result.count} invitaciones personalizadas por WhatsApp.`,
        });
        fetchStats();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "No se pudo iniciar el proceso de recuperación.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error de conexión con el servidor.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
        <Card className="animate-pulse border-orange-100 bg-orange-50/5">
            <CardHeader><div className="h-6 bg-muted rounded w-3/4"></div></CardHeader>
            <CardContent><div className="h-20 bg-muted rounded my-4"></div></CardContent>
            <CardFooter><div className="h-10 bg-muted rounded w-full"></div></CardFooter>
        </Card>
    );
  }

  const riskCount = stats?.totalCount || 0;

  return (
    <Card className="shadow-sm border-orange-100 bg-orange-50/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <UserX className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">Riesgo de Abandono</CardTitle>
              <CardDescription className="text-xs">Inactivos (umbral {stats?.totalCount ? 'actual' : ''})</CardDescription>
            </div>
          </div>
          <Badge variant="destructive" className="font-black text-[10px] uppercase">
            {riskCount} Críticos
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {riskCount > 0 ? (
            <ScrollArea className="h-[200px] pr-3 -mr-3">
                <div className="space-y-1.5">
                    {stats?.customers.map((c, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2 bg-white rounded-lg border border-orange-100 hover:border-orange-200 transition-colors">
                            <span className="font-bold text-gray-700 truncate mr-2">{c.name || 'Cliente'}</span>
                            <span className="font-mono text-muted-foreground shrink-0">{maskPhone(c.whatsapp)}</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        ) : (
            <div className="flex flex-col items-center justify-center py-10 space-y-2 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 opacity-20" />
                <p className="text-xs font-medium text-muted-foreground">¡Felicidades! Todos tus clientes están activos.</p>
            </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full font-black gap-2 h-12 shadow-lg shadow-orange-200 bg-orange-600 hover:bg-orange-700 text-white" disabled={riskCount === 0 || isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                Recuperar con IA
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Iniciar recuperación por IA
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4 pt-2">
                <p className="text-sm text-foreground">
                  El sistema generará <strong>invitaciones personalizadas y cálidas</strong> para intentar que tus clientes vuelvan.
                </p>
                <div className="p-4 bg-muted rounded-xl border border-dashed text-xs space-y-3">
                    <p className="font-bold flex items-center gap-2 text-primary uppercase tracking-widest">
                        <CheckCircle2 className="h-3 w-3" /> Ejemplo del mensaje IA:
                    </p>
                    <p className="italic text-muted-foreground leading-relaxed">
                        "Hola Juan, en el equipo de [Tu Negocio] te extrañamos. Hace más de un mes que no nos visitas y nos encantaría volver a saludarte pronto..."
                    </p>
                </div>
                <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-tight">
                        Se enviará el mensaje a los <strong>{Math.min(riskCount, 10)}</strong> clientes más antiguos.
                    </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Ahora no</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkRecovery} className="font-bold bg-primary hover:bg-primary/90">
                Confirmar y enviar WhatsApp
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
