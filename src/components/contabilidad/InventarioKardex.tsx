'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { useInventarioKardex } from "@/hooks/useInventarioKardex";
import KardexResumen from "@/components/kardex/tabs/KardexResumen";
import KardexTabla from "@/components/kardex/tabs/KardexTabla";
import KardexProductos from "@/components/kardex/tabs/KardexProductos";
import KardexMovimientos from "@/components/kardex/tabs/KardexMovimientos";
import KardexConfiguracion from "@/components/kardex/tabs/KardexConfiguracion";

interface InventarioKardexProps {
    kardexData: ReturnType<typeof useInventarioKardex>;
}

export default function InventarioKardex({ kardexData }: InventarioKardexProps) {
    return (
        <Tabs defaultValue="resumen" className="w-full">
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
    );
}
