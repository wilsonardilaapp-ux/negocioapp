'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone, History, Award } from 'lucide-react';
import { normalizePhoneNumber } from '@/lib/utils';
import { getLoyaltyStatus } from '@/actions/loyalty';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  businessId: string;
}

export default function LoyaltyStatus({ businessId }: Props) {
  const [whatsapp, setWhatsapp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    balance: number;
    history: any[];
  } | null>(null);
  const { toast } = useToast();

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhoneNumber(whatsapp);

    if (!normalized || normalized.length < 10) {
      setError("Ingresá un número de WhatsApp válido.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Nota: getLoyaltyStatus requiere invoiceCode para validación completa.
      // En este componente de consulta rápida, pasamos un valor vacío para obtener
      // solo la información básica si el sistema lo permite o manejar el error.
      const result = await getLoyaltyStatus(businessId, normalized, "");
      
      if (result.success) {
        setData({
          balance: result.balance,
          history: result.history
        });
      } else {
        setError(result.error || "No se pudo obtener el estado de puntos.");
      }
    } catch (err) {
      setError("Error de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Mis Puntos Zentry
        </CardTitle>
        <CardDescription>
          Consulta tu saldo acumulado y tu historial de premios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCheckStatus} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ej: 300 123 4567"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading} className="font-bold">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Ver mi saldo
          </Button>
        </form>

        {error && (
          <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg animate-in fade-in">
            {error}
          </p>
        )}

        {data && (
          <div className="space-y-6 animate-in slide-in-from-top-2">
            <div className="bg-muted rounded-2xl p-6 text-center border-2 border-dashed">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Saldo Actual</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl font-black text-primary">{data.balance}</span>
                <span className="text-xl font-bold text-primary/60">pts</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                Movimientos Recientes
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {data.history.length > 0 ? (
                  data.history.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl border bg-card text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{tx.reason}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={cn(
                        "font-black",
                        tx.amount >= 0 ? "text-green-600" : "text-red-500"
                      )}>
                        {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Aún no tienes movimientos registrados.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
