'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Loader2, Save } from 'lucide-react';
import { updateBusinessLoyaltyConfig } from '@/actions/business';
import { useToast } from '@/hooks/use-toast';
import type { Business } from '@/models/business';

interface PointsConfigCardProps {
  business: Business;
}

/**
 * @fileOverview Componente para configurar la tasa de acumulación de puntos.
 * Permite definir cuántos pesos equivalen a 1 punto de fidelidad.
 */
export default function PointsConfigCard({ business }: PointsConfigCardProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [amount, setAmount] = useState<number>(
    business.loyaltyConfig?.amountThreshold || 1000
  );

  const handleSave = async () => {
    if (amount < 1) {
      toast({
        variant: "destructive",
        title: "Valor no válido",
        description: "El monto debe ser al menos $1.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateBusinessLoyaltyConfig(business.id, { 
        amountThreshold: amount 
      });

      if (result.success) {
        toast({
          title: "Configuración guardada",
          description: `Se otorgará 1 punto por cada $${amount.toLocaleString()} consumidos.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error al guardar",
          description: result.error || "Ocurrió un error inesperado.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de red",
        description: "No se pudo conectar con el servidor.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-sm border-gray-100 h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Valor de los Puntos</CardTitle>
            <CardDescription>Configura la tasa de acumulación.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="point-amount" className="font-bold text-gray-700">
            Pesos por cada 1 punto
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
            <Input
              id="point-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
              className="pl-7 font-bold"
              disabled={isSaving}
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug italic">
            Define cuánto dinero debe gastar el cliente para ganar 1 punto. Ejemplo: 1000.
          </p>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/10 pt-4">
        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="w-full font-black gap-2"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Configuración
        </Button>
      </CardFooter>
    </Card>
  );
}
