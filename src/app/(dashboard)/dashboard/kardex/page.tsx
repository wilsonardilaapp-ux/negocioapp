"use client";

import { useSubscription } from '@/hooks/useSubscription';
import { LimitBanner } from '@/components/dashboard/LimitBanner';
import { Loader2, Frown, Info } from 'lucide-react';
import { useUser } from "@/firebase";
import { JevCopilotWidgetInventario } from "@/jev/JevCopilotWidgetInventario";
import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventarioKardex } from '@/hooks/useInventarioKardex';
import type { TabKardex, MetodoValuacion } from '@/types/kardex.types';

// Import tab components
import KardexResumen from '@/components/kardex/tabs/KardexResumen';
import KardexTabla from '@/components/kardex/tabs/KardexTabla';
import KardexProductos from '@/components/kardex/tabs/KardexProductos';
import KardexMovimientos from '@/components/kardex/tabs/KardexMovimientos';
import KardexConfiguracion from '@/components/kardex/tabs/KardexConfiguracion';

export default function KardexPage() {
    const { isModuleAuthorized, isLoading: isSubLoading, plan, planDetails, allHybridPlans } = useSubscription();

    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<TabKardex>('resumen');
    const kardexData = useInventarioKardex();

    // --- ESTADO ELEVADO PARA PERSISTENCIA ---
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [selectedMetodo, setSelectedMetodo] = useState<MetodoValuacion>('promedio_ponderado');

    // Sincronizar el ítem inicial cuando se cargan los productos si no hay uno seleccionado
    useEffect(() => {
        if (!selectedItemId && kardexData.items.length > 0) {
            setSelectedItemId(kardexData.items[0].id);
        }
    }, [kardexData.items, selectedItemId]);

    // --- RESOLUCIÓN DINÁMICA DE LÍMITE DE KARDEX (PLAN HÍBRIDO) ---
    const kardexLimit = useMemo(() => {
        const activePlan = planDetails || (allHybridPlans?.[0] as any);
        const extraLimits = activePlan?.extraLimits;
        if (Array.isArray(extraLimits)) {
            const item = extraLimits.find((el: any) => 
                /kardex|inventario/i.test(el.key || '')
            );
            if (item && typeof item.value === 'number') {
                return item.value;
            }
        }
        return 60; // Límite base predeterminado
    }, [planDetails, allHybridPlans]);

    const kardexItemsCount = kardexData?.items?.length ?? 0;

    
    if (isSubLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (!isModuleAuthorized('inventario-kardex')) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Módulo de Inventario Kardex Desactivado</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                    <Frown className="h-12 w-12 text-muted-foreground" />
                    <h3 className="text-xl font-semibold">Funcionalidad no disponible</h3>
                    <p className="text-muted-foreground max-w-sm">
                        El módulo de &quot;Inventario Kardex&quot; no está activo en tu plan actual. Por favor, contacta al administrador de la plataforma para más información.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <LimitBanner 
                current={kardexItemsCount} 
                limit={kardexLimit} 
                label="productos en kardex" 
                plan={typeof plan === 'string' ? plan : (plan as any)?.name || 'Plan'} 
            />

            <div className="flex items-center gap-2 rounded-2xl border bg-secondary/50 p-3 text-xs text-muted-foreground shadow-sm">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span>Límite de Inventario Kardex del plan: <strong className="text-foreground font-bold">{kardexItemsCount} / {kardexLimit === -1 ? '∞' : kardexLimit}</strong></span>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Inventario Kardex</CardTitle>
                    <CardDescription>Control de entradas, salidas y valorización de inventario.</CardDescription>
                </CardHeader>
            </Card>

            <Tabs defaultValue="resumen" value={activeTab} onValueChange={(value) => setActiveTab(value as TabKardex)} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="resumen">Resumen</TabsTrigger>
                    <TabsTrigger value="kardex">Kardex</TabsTrigger>
                    <TabsTrigger value="productos">Productos</TabsTrigger>
                    <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
                    <TabsTrigger value="configuracion">Configuración</TabsTrigger>
                </TabsList>
                <TabsContent value="resumen">
                    <KardexResumen resumen={kardexData.resumen} movimientos={kardexData.movimientos} items={kardexData.items} />
                </TabsContent>
                <TabsContent value="kardex">
                    <KardexTabla 
                        items={kardexData.items}
                        calcularKardex={kardexData.calcularKardex}
                        selectedItemId={selectedItemId}
                        setSelectedItemId={setSelectedItemId}
                        selectedMetodo={selectedMetodo}
                        setSelectedMetodo={setSelectedMetodo}
                    />
                </TabsContent>
                <TabsContent value="productos">
                    <KardexProductos 
                        items={kardexData.items}
                        registrarOActualizarItem={kardexData.registrarOActualizarItem}
                    />
                </TabsContent>
                <TabsContent value="movimientos">
                    <KardexMovimientos 
                        items={kardexData.items} 
                        movimientos={kardexData.movimientos}
                        registrarMovimiento={kardexData.registrarMovimiento}
                    />
                </TabsContent>
                <TabsContent value="configuracion">
                    <KardexConfiguracion 
                        config={kardexData.configuracion} 
                        setConfig={kardexData.actualizarConfiguracion}
                        bodegas={kardexData.bodegas}
                    />
                </TabsContent>
            </Tabs>
        
            <JevCopilotWidgetInventario businessId={user?.uid} />
        </div>
    );
}
