
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Archive, ArrowDownUp, DollarSign, Package } from "lucide-react";
import type { ResumenInventario, MovimientoKardex } from "@/types/inventario.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface KardexResumenProps {
    resumen: ResumenInventario;
    movimientos: MovimientoKardex[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export default function KardexResumen({ resumen, movimientos }: KardexResumenProps) {
    const kpis = [
        { title: "Valor Total del Inventario", value: formatCurrency(resumen.valorTotalInventario), icon: DollarSign },
        { title: "Total de Productos", value: resumen.totalProductos, icon: Package },
        { title: "Costo de Ventas (Mes)", value: formatCurrency(resumen.costoVentasMes), icon: Archive },
        { title: "Movimientos (Mes)", value: resumen.movimientosMes, icon: ArrowDownUp },
    ];

    const weeklyActivity = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const weeks: { [key: string]: { entradas: number; salidas: number } } = {};

        // Initialize weeks of the month
        for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 7)) {
            const weekNumber = Math.ceil(d.getDate() / 7);
            weeks[`Semana ${weekNumber}`] = { entradas: 0, salidas: 0 };
        }

        movimientos.forEach(mov => {
            const movDate = new Date(mov.fecha);
            if (movDate >= startOfMonth && movDate <= endOfMonth) {
                const weekNumber = Math.ceil(movDate.getDate() / 7);
                const weekKey = `Semana ${weekNumber}`;
                
                if(weeks[weekKey]) {
                    if(mov.tipo.startsWith('entrada')) {
                        weeks[weekKey].entradas += mov.cantidad;
                    } else if (mov.tipo.startsWith('salida')) {
                        weeks[weekKey].salidas += mov.cantidad;
                    }
                }
            }
        });

        return Object.entries(weeks).map(([name, values]) => ({ name, ...values }));

    }, [movimientos]);

    const chartConfig = {
        entradas: { label: "Entradas", color: "hsl(var(--chart-2))" },
        salidas: { label: "Salidas", color: "hsl(var(--chart-5))" },
    };

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
                    <CardTitle>Resumen de Movimientos del Mes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <BarChart data={weeklyActivity}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="entradas" fill="var(--color-entradas)" radius={4} />
                            <Bar dataKey="salidas" fill="var(--color-salidas)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
