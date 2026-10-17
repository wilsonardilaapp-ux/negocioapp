'use client';

import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Flame, Eye, MoreVertical, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Product } from '@/models/product';

interface Props {
  product: Product;
  businessId: string;
}

export default function ProductSocialProofMenu({ product, businessId }: Props) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [recentSales, setRecentSales] = useState(product.socialProofRecentSales !== false);
  const [liveViewers, setLiveViewers] = useState(product.socialProofLiveViewers !== false);

  const updateSetting = async (field: 'socialProofRecentSales' | 'socialProofLiveViewers', value: boolean) => {
    try {
      if (field === 'socialProofRecentSales') setRecentSales(value);
      if (field === 'socialProofLiveViewers') setLiveViewers(value);

      if (firestore && businessId && product.id) {
        const prodRef = doc(firestore, 'businesses', businessId, 'products', product.id);
        await setDocumentNonBlocking(prodRef, { [field]: value }, { merge: true });
        
        toast({
          title: 'Configuración actualizada',
          description: field === 'socialProofRecentSales'
            ? `Indicador "Vendidos recientes": ${value ? 'Activado' : 'Desactivado'}`
            : `Indicador "Personas mirando": ${value ? 'Activado' : 'Desactivado'}`,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error al actualizar producto',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-orange-500">
          <Flame className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-orange-500" /> Prueba Social
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => updateSetting('socialProofRecentSales', !recentSales)}
          className="cursor-pointer text-xs flex justify-between items-center"
        >
          <span className="flex items-center gap-2">
            🔥 Vendidos (12h)
          </span>
          {recentSales ? <Check className="h-4 w-4 text-green-600 font-bold" /> : <X className="h-4 w-4 text-muted-foreground" />}
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => updateSetting('socialProofLiveViewers', !liveViewers)}
          className="cursor-pointer text-xs flex justify-between items-center"
        >
          <span className="flex items-center gap-2">
            👀 Personas mirando
          </span>
          {liveViewers ? <Check className="h-4 w-4 text-green-600 font-bold" /> : <X className="h-4 w-4 text-muted-foreground" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
