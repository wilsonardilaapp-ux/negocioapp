
'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ItemInventario, LineaKardexCalculada, MetodoValuacion } from '@/types/kardex.types';
import { Button } from '@/components/ui/button';

interface KardexTablaProps {
    items: ItemInventario[];
    calcularKardex: (itemId: string, metodo: MetodoValuacion) => LineaKardexCalculada[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export default function KardexTabla({ items, calcularKardex }: KardexTablaProps) {
    const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id ?? '');
    const [selectedMetodo, setSelectedMetodo] = useState<MetodoValuacion>('promedio_ponderado');
    const [lineas, setLineas] = useState<LineaKardexCalculada[]>([]);

    const handleCalculate = () => {
        if (selectedItemId) {
            const result = calcularKardex(selectedItemId, selectedMetodo);
            setLineas(result);
        }
    };
    
    const costoTotalVentas = lineas.reduce((sum, l) => sum + (l.salida?.costoTotal ?? 0), 0);
    const unidadesRotadas = lineas.reduce((sum, l) => sum + (l.salida?.cantidad ?? 0), 0);
    const diasStock = 0; // Placeholder

    return (
        <Card>
            <CardHeader>
                <CardTitle>Consulta de Kardex por Ítem</CardTitle>
                <CardDescription>Selecciona un ítem y un período para ver su movimiento detallado.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-end gap-4 mb-6">
                    <div className="flex-1 min-w-[250px]"><label className="text-sm font-medium">Ítem de Inventario</label><Select value={selectedItemId} onValueChange={setSelectedItemId}><SelectTrigger><SelectValue placeholder="Seleccionar ítem" /></SelectTrigger><SelectContent>{items.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>)}</SelectContent></Select></div>
                    <div className="flex-1 min-w-[200px]"><label className="text-sm font-medium">Método de Valuación</label><Select value={selectedMetodo} onValueChange={(v) => setSelectedMetodo(v as MetodoValuacion)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="promedio_ponderado">Promedio Ponderado</SelectItem><SelectItem value="peps">PEPS</SelectItem><SelectItem value="ueps">UEPS</SelectItem></SelectContent></Select></div>
                    <div className="flex-1 min-w-[150px]"><label className="text-sm font-medium">Período (Mes/Año)</label><Input type="month" defaultValue={new Date().toISOString().substring(0, 7)} /></div>
                    <Button onClick={handleCalculate}>Calcular Kardex</Button>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead rowSpan={2} className="align-bottom">Fecha</TableHead>
                                <TableHead rowSpan={2} className="align-bottom">Concepto</TableHead>
                                <TableHead colSpan={3} className="text-center border-l">Entrada</TableHead>
                                <TableHead colSpan={3} className="text-center border-l">Salida</TableHead>
                                <TableHead colSpan={3} className="text-center border-l">Saldo</TableHead>
                            </TableRow>
                             <TableRow>
                                <TableHead className="text-center border-l">Cant.</TableHead>
                                <TableHead className="text-right">C. Unit</TableHead>
                                <TableHead className="text-right">C. Total</TableHead>
                                <TableHead className="text-center border-l">Cant.</TableHead>
                                <TableHead className="text-right">C. Unit</TableHead>
                                <TableHead className="text-right">C. Total</TableHead>
                                <TableHead className="text-center border-l">Cant.</TableHead>
                                <TableHead className="text-right">C. Unit</TableHead>
                                <TableHead className="text-right">C. Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lineas.length > 0 ? lineas.map((linea, index) => (
                                <TableRow key={index}>
                                    <TableCell>{linea.fecha}</TableCell>
                                    <TableCell className="capitalize">{linea.concepto}</TableCell>
                                    <TableCell className="text-center">{linea.entrada?.cantidad ?? ''}</TableCell>
                                    <TableCell className="text-right">{linea.entrada ? formatCurrency(linea.entrada.costoUnitario) : ''}</TableCell>
                                    <TableCell className="text-right">{linea.entrada ? formatCurrency(linea.entrada.costoTotal) : ''}</TableCell>
                                    <TableCell className="text-center">{linea.salida?.cantidad ?? ''}</TableCell>
                                    <TableCell className="text-right">{linea.salida ? formatCurrency(linea.salida.costoUnitario) : ''}</TableCell>
                                    <TableCell className="text-right">{linea.salida ? formatCurrency(linea.salida.costoTotal) : ''}</TableCell>
                                    <TableCell className="text-center font-semibold">{linea.saldo.cantidad}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(linea.saldo.costoUnitario)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(linea.saldo.costoTotal)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center">No hay datos para mostrar. Selecciona un ítem y calcula.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 <div className="grid grid-cols-3 gap-4 mt-6">
                    <Card><CardHeader><CardTitle>Costo de Ventas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(costoTotalVentas)}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Unidades Rotadas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{unidadesRotadas}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Días de Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">N/A</p></CardContent></Card>
                </div>
            </CardContent>
        </Card>
    );
}

