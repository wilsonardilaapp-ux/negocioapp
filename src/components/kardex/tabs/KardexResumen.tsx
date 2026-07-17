'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DollarSign, Package, Archive, ArrowDownUp, AlertCircle, FileSpreadsheet, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ResumenKardex, MovimientoKardex, ItemInventario } from '@/types/kardex.types';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

interface KardexResumenProps {
    resumen: ResumenKardex;
    movimientos: MovimientoKardex[];
    items: ItemInventario[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export default function KardexResumen({ resumen, movimientos, items }: KardexResumenProps) {
    const kpis = [
        { title: "Total Ítems", value: resumen.totalItems, icon: Package },
        { title: "Valor Total Inventario", value: formatCurrency(resumen.valorTotalInventario), icon: DollarSign },
        { title: "Costo de Ventas (Mes)", value: formatCurrency(resumen.costoVentasMes), icon: Archive },
        { title: "Movimientos (Mes)", value: resumen.movimientosMes, icon: ArrowDownUp },
    ];
    
    const itemsBajoMinimo = items.filter(item => item.estado === 'bajo' || item.estado === 'agotado');

    const handleExportExcel = () => {
      const kpiRows = [
        ["REPORTE RESUMEN DE INVENTARIO"],
        ["Fecha de generación:", new Date().toLocaleString()],
        [],
        ["MÉTRICAS CLAVE", "VALOR"],
        ["Valor Total del Inventario", formatCurrency(resumen.valorTotalInventario)],
        ["Total de Ítems", resumen.totalItems],
        ["Costo de Ventas (Mes Actual)", formatCurrency(resumen.costoVentasMes)],
        ["Cantidad de Movimientos (Mes Actual)", resumen.movimientosMes],
        []
      ];

      const alertHeader = [
        ["--- PRODUCTOS CON STOCK BAJO / AGOTADO ---"],
        ["Código", "Nombre", "Stock Actual", "Stock Mínimo"]
      ];

      const alertData = itemsBajoMinimo.map(item => [
        item.codigo,
        item.nombre,
        item.stockActual,
        item.stockMinimo
      ]);

      const fullData = [...kpiRows, ...alertHeader, ...alertData];

      const ws = XLSX.utils.aoa_to_sheet(fullData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resumen General");
      
      ws['!cols'] = [
          {wch: 35},
          {wch: 25},
          {wch: 15},
          {wch: 15}
      ];

      XLSX.writeFile(wb, "Kardex_Resumen_General.xlsx");
    };

    const handlePrint = () => {
        window.print();
    };

    const weeklyActivity = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const weeks: { [key: string]: { entradas: number; salidas: number; ajustes: number; } } = {};
        for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 7)) {
            const weekNumber = Math.ceil(d.getDate() / 7);
            weeks[`Semana ${weekNumber}`] = { entradas: 0, salidas: 0, ajustes: 0 };
        }

        movimientos.forEach(mov => {
            const movDate = new Date(mov.fecha);
            if (movDate >= startOfMonth && movDate <= endOfMonth) {
                const weekNumber = Math.ceil(movDate.getDate() / 7);
                const weekKey = `Semana ${weekNumber}`;
                if (weeks[weekKey]) {
                    if (mov.tipo.startsWith('entrada')) weeks[weekKey].entradas += mov.cantidad;
                    else if (mov.tipo.startsWith('salida')) weeks[weekKey].salidas += mov.cantidad;
                    else if (mov.tipo.startsWith('ajuste')) weeks[weekKey].ajustes += mov.cantidad;
                }
            }
        });
        
        return Object.entries(weeks).map(([name, values]) => ({ name, ...values }));
    }, [movimientos]);

    const chartConfig = {
        entradas: { label: "Entradas", color: "hsl(var(--chart-2))" },
        salidas: { label: "Salidas", color: "hsl(var(--chart-5))" },
        ajustes: { label: "Ajustes", color: "hsl(var(--chart-4))" },
    };

    return (
        <>
            <Card className="print:hidden mb-6">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Resumen del Inventario</CardTitle>
                        <CardDescription className="print:hidden">Vista consolidada de métricas y alertas de stock.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportExcel}
                            className="font-bold border-green-200 text-green-700 hover:bg-green-50"
                        >
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Resumen
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handlePrint}
                            className="font-bold"
                        >
                            <Printer className="mr-2 h-4 w-4" /> Imprimir Dashboard
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <div className="space-y-6">
                {itemsBajoMinimo.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Alerta de Stock Bajo</AlertTitle>
                        <AlertDescription>
                            Tienes {itemsBajoMinimo.length} ítem(s) con stock bajo o agotado.
                            <ul className="mt-2 list-disc list-inside">
                                {itemsBajoMinimo.slice(0, 5).map(item => <li key={item.id}>{item.nombre} (Stock: {item.stockActual})</li>)}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {kpis.map(kpi => (
                        <Card key={kpi.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                                <kpi.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold">{kpi.value}</div></CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Movimientos por Semana (Mes Actual)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full" style={{ minHeight: '300px' }}>
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
                                <Bar dataKey="ajustes" fill="var(--color-ajustes)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}