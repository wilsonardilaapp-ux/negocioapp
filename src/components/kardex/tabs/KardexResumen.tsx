
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DollarSign, Package, Archive, ArrowDownUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ResumenKardex, MovimientoKardex, ItemInventario } from '@/types/kardex.types';

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

    return (
        <div className="space-y-6">
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

            <Card>
                <CardHeader>
                    <CardTitle>Movimientos por Semana (Mes Actual)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weeklyActivity}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${value} unidades`} />
                            <Legend />
                            <Bar dataKey="entradas" fill="#22c55e" name="Entradas" />
                            <Bar dataKey="salidas" fill="#ef4444" name="Salidas" />
                            <Bar dataKey="ajustes" fill="#f59e0b" name="Ajustes" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
