'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Loader2, Save, Calendar } from 'lucide-react';
import { updateBusinessLoyaltyConfig } from '@/actions/business';
import { useToast } from '@/hooks/use-toast';
import type { Business } from '@/models/business';

interface ChurnConfigCardProps {
  business: Business;
}

/**
 * @fileOverview Componente para configurar el umbral de días de inactividad
 * que define el "Riesgo de Abandono" (Churn).
 */
export default function ChurnConfigCard({ business }: ChurnConfigCardProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [days, setDays] = useState<number>(
    business.loyaltyConfig?.churnDaysThreshold || 30
  );

  const handleSave = async () => {
    if (days < 1 || days > 365) {
      toast({
        variant: "destructive",
        title: "Valor no válido",
        description: "El umbral debe estar entre 1 y 365 días.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateBusinessLoyaltyConfig(business.id, { 
        churnDaysThreshold: days 
      });

      if (result.success) {
        toast({
          title: "Configuración actualizada",
          description: `El umbral de abandono se ha fijado en ${days} días.`,
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
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Configuración de Churn</CardTitle>
            <CardDescription>Define la sensibilidad de detección de abandono.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="churn-days" className="font-bold text-gray-700">
            Umbral de inactividad (días)
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="churn-days"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              className="pl-10 font-bold"
              disabled={isSaving}
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug italic">
            Define cuántos días de inactividad deben pasar para considerar a un cliente en riesgo. (Por defecto: 30 días).
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
          Actualizar Umbral
        </Button>
      </CardFooter>
    </Card>
  );
}
