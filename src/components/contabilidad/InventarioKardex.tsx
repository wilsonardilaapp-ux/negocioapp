'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventarioKardex } from "@/hooks/useInventarioKardex";
import KardexResumen from "./secciones/KardexResumen";
import KardexTabla from "./secciones/KardexTabla";
import KardexProductos from "./secciones/KardexProductos";
import KardexMovimientos from "./secciones/KardexMovimientos";
import KardexConfiguracion from "./secciones/KardexConfiguracion";

export default function InventarioKardex() {
    const kardexData = useInventarioKardex();

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
                <KardexResumen resumen={kardexData.resumen} movimientos={kardexData.movimientos} />
            </TabsContent>
            <TabsContent value="kardex">
                <KardexTabla 
                    productos={kardexData.productos} 
                    metodo={kardexData.configuracion.metodoValuacion}
                    calcularLineasKardex={kardexData.calcularLineasKardex}
                />
            </TabsContent>
            <TabsContent value="productos">
                <KardexProductos productos={kardexData.productos} />
            </TabsContent>
            <TabsContent value="movimientos">
                <KardexMovimientos 
                    productos={kardexData.productos} 
                    movimientos={kardexData.movimientos}
                    registrarMovimiento={kardexData.registrarMovimiento}
                />
            </TabsContent>
            <TabsContent value="configuracion">
                <KardexConfiguracion 
                    config={kardexData.configuracion} 
                    setConfig={kardexData.setConfiguracion}
                />
            </TabsContent>
        </Tabs>
    );
}
