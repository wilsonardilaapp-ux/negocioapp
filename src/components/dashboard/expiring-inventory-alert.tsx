'use client';

import React, { useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { InventoryBatch } from '@/models/inventory-expiration';
import type { Product } from '@/models/product';
import { getExpiringBatches } from '@/services/expiration-alert-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CalendarX } from 'lucide-react';

interface ExpiringInventoryAlertProps {
  batches?: InventoryBatch[];
  products?: Product[];
  thresholdDays?: number;
}

export function ExpiringInventoryAlert({
  batches: externalBatches,
  products,
  thresholdDays = 30,
}: ExpiringInventoryAlertProps) {
  const { isModuleAuthorized, isLoading: isSubLoading } = useSubscription();
  const { user } = useUser();
  const firestore = useFirestore();

  // Consulta autónoma a Firestore si no se le pasaron batches externos
  const batchesQuery = useMemoFirebase(() => {
    if (externalBatches || !firestore || !user) return null;
    return collection(firestore, 'businesses', user.uid, 'inventoryBatches');
  }, [externalBatches, firestore, user]);

  const { data: queriedBatches } = useCollection<InventoryBatch>(batchesQuery);

  const activeBatches = externalBatches || queriedBatches || [];

  const isAuthorized = useMemo(() => {
    return isModuleAuthorized ? isModuleAuthorized('alertas-vencimiento') : false;
  }, [isModuleAuthorized]);

  const productNamesById = useMemo(() => {
    const map: Record<string, string> = {};
    products?.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [products]);

  // Si está cargando o el módulo no está activo para este negocio, no renderiza nada
  if (isSubLoading || !isAuthorized) {
    return null;
  }

  const expiringList = getExpiringBatches(activeBatches, thresholdDays);

  if (expiringList.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-amber-950 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Lotes Próximos a Vencer ({expiringList.length})
          </CardTitle>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 font-bold">
            Vencimiento &le; {thresholdDays} días
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y divide-amber-200/60 text-sm">
          {expiringList.map(({ batch, daysRemaining, status }) => {
            const productName = productNamesById[batch.productId] || 'Producto ID: ' + batch.productId;
            const isExpired = status === 'expired';

            return (
              <div key={batch.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-900">{productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {batch.batchNumber ? 'Lote: #' + batch.batchNumber + ' • ' : ''}
                    Cantidad: <span className="font-medium text-gray-800">{batch.quantity} unids.</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Exp: {batch.expirationDate}
                  </span>
                  {isExpired ? (
                    <Badge variant="destructive" className="flex items-center gap-1 text-[11px]">
                      <CalendarX className="w-3 h-3" /> Vencido hace {Math.abs(daysRemaining)} d
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3 h-3" /> Vence en {daysRemaining} d
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
