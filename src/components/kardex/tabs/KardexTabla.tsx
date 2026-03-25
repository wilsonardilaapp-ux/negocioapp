
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
    
    const costoTotalVentas = lineas.filter(l => l.movimiento.tipo.startsWith('salida')).reduce((sum, l) => sum + (l.movimiento.cantidad * l.costoUnitarioResultante), 0);
    const unidadesRotadas = lineas.filter(l => l.movimiento.tipo.startsWith('salida')).reduce((sum, l) => sum + l.movimiento.cantidad, 0);

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

                <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Doc.</TableHead><TableHead>Entrada</TableHead><TableHead>Salida</TableHead><TableHead>Saldo Cant.</TableHead><TableHead>Costo Unit.</TableHead><TableHead>Saldo Total</TableHead></TableRow></TableHeader><TableBody>
                    {lineas.length > 0 ? lineas.map((linea, index) => (
                        <TableRow key={index}><TableCell>{new Date(linea.movimiento.fecha).toLocaleDateString()}</TableCell><TableCell>{linea.movimiento.tipo.replace(/_/g, ' ')}</TableCell><TableCell>{linea.movimiento.documento}</TableCell><TableCell className="text-green-600">{linea.movimiento.tipo.startsWith('entrada') ? linea.movimiento.cantidad : ''}</TableCell><TableCell className="text-red-600">{linea.movimiento.tipo.startsWith('salida') ? linea.movimiento.cantidad : ''}</TableCell><TableCell>{linea.saldoCantidad}</TableCell><TableCell>{formatCurrency(linea.costoUnitarioResultante)}</TableCell><TableCell className="font-bold">{formatCurrency(linea.saldoValorTotal)}</TableCell></TableRow>
                    )) : (<TableRow><TableCell colSpan={8} className="h-24 text-center">Selecciona un ítem y calcula para ver los datos.</TableCell></TableRow>)}
                </TableBody></Table></div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <Card><CardHeader><CardTitle>Costo de Ventas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(costoTotalVentas)}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Unidades Rotadas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{unidadesRotadas}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Días de Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">N/A</p></CardContent></Card>
                </div>
            </CardContent>
        </Card>
    );
}
