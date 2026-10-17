'use client';

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame, Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface Props {
  businessId: string;
  initialEnabled?: boolean;
}

export default function SocialProofGlobalSwitch({ businessId, initialEnabled = true }: Props) {
  const { isModuleAuthorized } = useSubscription();
  const isAuthorized = isModuleAuthorized('social-proof');
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleToggle = async (checked: boolean) => {
    if (!isAuthorized) {
      toast({
        title: 'Módulo no disponible',
        description: 'La Prueba Social debe ser autorizada por el SuperAdmin para tu negocio.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    setEnabled(checked);
    try {
      if (firestore && businessId) {
        const businessRef = doc(firestore, 'businesses', businessId);
        await setDocumentNonBlocking(businessRef, { socialProofEnabled: checked }, { merge: true });
        toast({
          title: checked ? 'Prueba Social activada' : 'Prueba Social desactivada',
          description: checked 
            ? 'Los compradores verán los indicadores de ventas y concurrencia.' 
            : 'Los indicadores están ocultos en tu catálogo.',
        });
      }
    } catch (err: any) {
      setEnabled(!checked);
      toast({
        title: 'Error al actualizar',
        description: err.message || 'No se pudo guardar la configuración.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 rounded-lg">
      <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="social-proof-switch" className="text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
            Prueba social en catálogo
          </Label>
          {!isAuthorized && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Módulo inactivo en tu plan o deshabilitado por SuperAdmin.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <Switch
        id="social-proof-switch"
        checked={isAuthorized && enabled}
        disabled={!isAuthorized || isSaving}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-orange-500"
      />
    </div>
  );
}
