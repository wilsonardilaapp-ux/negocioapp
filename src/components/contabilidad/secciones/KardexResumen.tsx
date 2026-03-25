
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Archive, ArrowDownUp, DollarSign, Package } from "lucide-react";
import type { ResumenInventario } from "@/types/inventario.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface KardexResumenProps {
    resumen: ResumenInventario;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export default function KardexResumen({ resumen }: KardexResumenProps) {
    const kpis = [
        { title: "Valor Total del Inventario", value: formatCurrency(resumen.valorTotalInventario), icon: DollarSign },
        { title: "Total de Productos", value: resumen.totalProductos, icon: Package },
        { title: "Costo de Ventas (Mes)", value: formatCurrency(resumen.costoVentasMes), icon: Archive },
        { title: "Movimientos (Mes)", value: resumen.movimientosMes, icon: ArrowDownUp },
    ];
    return (
        <div className="space-y-6">
            {resumen.productosBajoMinimo > 0 && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Alerta de Stock</AlertTitle>
                    <AlertDescription>
                        Tienes {resumen.productosBajoMinimo} producto(s) por debajo del stock mínimo o agotados.
                    </AlertDescription>
                </Alert>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            <kpi.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Resumen de Movimientos (Próximamente)</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Aquí se mostrará una gráfica de los movimientos de inventario por semana.</p>
                </CardContent>
            </Card>
        </div>
    );
}
