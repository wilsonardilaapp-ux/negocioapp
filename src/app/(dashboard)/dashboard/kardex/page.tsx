
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKardex } from '@/hooks/useKardex';
import type { TabKardex } from '@/types/kardex.types';

// Import tab components from their new location
import KardexResumen from '@/components/kardex/tabs/KardexResumen';
import KardexTabla from '@/components/kardex/tabs/KardexTabla';
import KardexProductos from '@/components/kardex/tabs/KardexProductos';
import KardexMovimientos from '@/components/kardex/tabs/KardexMovimientos';
import KardexConfiguracion from '@/components/kardex/tabs/KardexConfiguracion';

export default function KardexPage() {
    const [activeTab, setActiveTab] = useState<TabKardex>('resumen');
    const kardexData = useKardex();

    return (
        <div className="space-y-6">
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
                    />
                </TabsContent>
                <TabsContent value="productos">
                    <KardexProductos items={kardexData.items} />
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
        </div>
    );
}
