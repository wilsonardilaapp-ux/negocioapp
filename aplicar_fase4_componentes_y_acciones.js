const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

console.log('====================================================');
console.log('🚀 FASE 4 & 5: SERVER ACTIONS Y COMPONENTES AISLADOS');
console.log('====================================================\n');

// 1. SERVER ACTION: src/actions/social-proof-actions.ts
const actionsPath = path.join(ROOT, 'src', 'actions', 'social-proof-actions.ts');
const actionsContent = `'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { SocialProofProductMetrics, SocialProofCatalogMetrics } from '@/models/social-proof';

/**
 * Función pseudoaleatoria determinística por bloque de tiempo (30 min)
 */
function getDeterministicViewers(productId: string, timeBlock: number): number {
  let hash = 0;
  const str = \`\${productId}-\${timeBlock}\`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const min = 3;
  const max = 18;
  return min + (Math.abs(hash) % (max - min + 1));
}

/**
 * Obtiene métricas seguras de prueba social para el catálogo público sin exponer pedidos
 */
export async function getSocialProofMetrics(businessId: string): Promise<SocialProofCatalogMetrics> {
  const emptyResult: SocialProofCatalogMetrics = {
    businessId,
    isAuthorized: false,
    isEnabledByOwner: false,
    metrics: {}
  };

  try {
    const firestore = await getAdminFirestore();

    // 1. Verificar si el negocio existe y el estado del módulo
    const businessDoc = await firestore.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) return emptyResult;

    const businessData = businessDoc.data() || {};
    const isOwnerEnabled = businessData.socialProofEnabled !== false; // Default: true si el módulo está habilitado

    // 2. Verificar autorización de suscripción / módulos activos
    let isAuthorized = false;
    const subDoc = await firestore.collection('subscriptions').doc(businessId).get();
    if (subDoc.exists) {
      const activeModules: string[] = subDoc.data()?.activeModules || [];
      if (activeModules.includes('social-proof')) isAuthorized = true;
    }

    // Fallback: verificar en colección modules general
    if (!isAuthorized) {
      const globalMod = await firestore.collection('modules').doc('social-proof').get();
      if (globalMod.exists && globalMod.data()?.status === 'active') {
        // Si no hay restricción granular en suscripción, se considera activo
        isAuthorized = true;
      }
    }

    if (!isAuthorized || !isOwnerEnabled) {
      return {
        businessId,
        isAuthorized,
        isEnabledByOwner: isOwnerEnabled,
        metrics: {}
      };
    }

    // 3. Consultar pedidos reales (últimos 7 días)
    const now = Date.now();
    const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const current30MinBlock = Math.floor(now / (30 * 60 * 1000));

    // Consultar pedidos del negocio en subcolección o colección principal
    let ordersSnapshot;
    const subColOrders = await firestore.collection('businesses').doc(businessId).collection('orders')
      .where('orderDate', '>=', sevenDaysAgo)
      .get();

    if (!subColOrders.empty) {
      ordersSnapshot = subColOrders;
    } else {
      ordersSnapshot = await firestore.collection('orders')
        .where('businessId', '==', businessId)
        .where('orderDate', '>=', sevenDaysAgo)
        .get();
    }

    // Calcular ventas por producto
    const sales12hMap = new Map<string, number>();
    const sales7dMap = new Map<string, number>();

    ordersSnapshot.forEach(docSnap => {
      const order = docSnap.data();
      if (order.orderStatus === 'Cancelado') return;
      const orderDate = order.orderDate || '';

      const is12h = orderDate >= twelveHoursAgo;
      const items = Array.isArray(order.items) ? order.items : [];

      items.forEach((item: any) => {
        if (!item?.productId) return;
        const qty = Number(item.quantity) || 1;
        sales7dMap.set(item.productId, (sales7dMap.get(item.productId) || 0) + qty);
        if (is12h) {
          sales12hMap.set(item.productId, (sales12hMap.get(item.productId) || 0) + qty);
        }
      });
    });

    // 4. Construir métricas evaluando productos
    const metrics: Record<string, SocialProofProductMetrics> = {};
    const productsSnap = await firestore.collection('businesses').doc(businessId).collection('products').get();

    productsSnap.forEach(prodDoc => {
      const prod = prodDoc.data();
      const prodId = prodDoc.id;
      const s12h = sales12hMap.get(prodId) || 0;
      const s7d = sales7dMap.get(prodId) || 0;

      // Reglas:
      // 🔥 vendidos: switch producto !== false + s12h >= 3
      const showSales = (prod.socialProofRecentSales !== false) && (s12h >= 3);

      // 👀 mirando: switch producto !== false + s7d >= 1
      const showViewers = (prod.socialProofLiveViewers !== false) && (s7d >= 1);
      const viewers = showViewers ? getDeterministicViewers(prodId, current30MinBlock) : 0;

      if (showSales || showViewers) {
        metrics[prodId] = {
          productId: prodId,
          salesLast12Hours: s12h,
          salesLast7Days: s7d,
          liveViewers: viewers,
          showRecentSales: showSales,
          showLiveViewers: showViewers,
        };
      }
    });

    return {
      businessId,
      isAuthorized: true,
      isEnabledByOwner: true,
      metrics,
    };
  } catch (error) {
    console.error('Error calculando social proof metrics:', error);
    return emptyResult;
  }
}
`;

fs.writeFileSync(actionsPath, actionsContent, 'utf8');
console.log('✅ Creado Server Action: src/actions/social-proof-actions.ts');

// 2. COMPONENTE AISLADO: Switch Global del Dueño
const globalSwitchPath = path.join(ROOT, 'src', 'components', 'catalogo', 'SocialProofGlobalSwitch.tsx');
const globalSwitchContent = `'use client';

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
`;

fs.writeFileSync(globalSwitchPath, globalSwitchContent, 'utf8');
console.log('✅ Creado Componente: src/components/catalogo/SocialProofGlobalSwitch.tsx');

// 3. COMPONENTE AISLADO: Menú de Acciones por Producto
const productMenuPath = path.join(ROOT, 'src', 'components', 'catalogo', 'ProductSocialProofMenu.tsx');
const productMenuContent = `'use client';

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
            ? \`Indicador "Vendidos recientes": \${value ? 'Activado' : 'Desactivado'}\`
            : \`Indicador "Personas mirando": \${value ? 'Activado' : 'Desactivado'}\`,
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
`;

fs.writeFileSync(productMenuPath, productMenuContent, 'utf8');
console.log('✅ Creado Componente: src/components/catalogo/ProductSocialProofMenu.tsx');

console.log('\n✅ Componentes y Server Actions creados con éxito.');
