
'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Producto, LineaKardex, MetodoValuacion } from "@/types/inventario.types";
import { Button } from '@/components/ui/button';

interface KardexTablaProps {
    productos: Producto[];
    metodo: MetodoValuacion;
    calcularLineasKardex: (productoId: string, metodo: MetodoValuacion) => LineaKardex[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export default function KardexTabla({ productos, metodo, calcularLineasKardex }: KardexTablaProps) {
    const [selectedProductId, setSelectedProductId] = useState<string>(productos[0]?.id ?? '');
    const [lineas, setLineas] = useState<LineaKardex[]>([]);

    const handleCalculate = () => {
        if (selectedProductId) {
            const result = calcularLineasKardex(selectedProductId, metodo);
            setLineas(result);
        }
    };
    
    const { costoTotalVentas, rotacion, diasStock } = {
        costoTotalVentas: lineas.reduce((sum, l) => sum + (l.salida?.costoTotal ?? 0), 0),
        rotacion: 0, // Cálculo placeholder
        diasStock: 0, // Cálculo placeholder
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Consulta de Kardex</CardTitle>
                <CardDescription>Selecciona un producto y un período para ver su movimiento detallado.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-end gap-4 mb-6">
                    <div className="flex-1 min-w-[250px]">
                        <label className="text-sm font-medium">Producto</label>
                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                            <SelectContent>
                                {productos.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="flex-1 min-w-[150px]">
                        <label className="text-sm font-medium">Período (Mes/Año)</label>
                        <Input type="month" defaultValue={new Date().toISOString().substring(0, 7)} />
                    </div>
                    <Button onClick={handleCalculate}>Calcular Kardex</Button>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead rowSpan={2}>Fecha</TableHead>
                                <TableHead rowSpan={2}>Concepto</TableHead>
                                <TableHead colSpan={3} className="text-center border-l">Entrada</TableHead>
                                <TableHead colSpan={3} className="text-center border-l">Salida</TableHead>
                                <TableHead colSpan={3} className="text-center border-l">Saldo</TableHead>
                            </TableRow>
                             <TableRow>
                                <TableHead className="border-l">Cant.</TableHead>
                                <TableHead>Costo U.</TableHead>
                                <TableHead>Costo T.</TableHead>
                                <TableHead className="border-l">Cant.</TableHead>
                                <TableHead>Costo U.</TableHead>
                                <TableHead>Costo T.</TableHead>
                                <TableHead className="border-l">Cant.</TableHead>
                                <TableHead>Costo U.</TableHead>
                                <TableHead>Costo T.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lineas.length > 0 ? lineas.map((linea, index) => (
                                <TableRow key={index}>
                                    <TableCell>{linea.fecha}</TableCell>
                                    <TableCell>{linea.concepto}</TableCell>
                                    <TableCell className="border-l">{linea.entrada?.cantidad}</TableCell>
                                    <TableCell>{linea.entrada ? formatCurrency(linea.entrada.costoUnitario) : ''}</TableCell>
                                    <TableCell>{linea.entrada ? formatCurrency(linea.entrada.costoTotal) : ''}</TableCell>
                                    <TableCell className="border-l">{linea.salida?.cantidad}</TableCell>
                                    <TableCell>{linea.salida ? formatCurrency(linea.salida.costoUnitario) : ''}</TableCell>
                                    <TableCell>{linea.salida ? formatCurrency(linea.salida.costoTotal) : ''}</TableCell>
                                    <TableCell className="border-l">{linea.saldo.cantidad}</TableCell>
                                    <TableCell>{formatCurrency(linea.saldo.costoUnitario)}</TableCell>
                                    <TableCell>{formatCurrency(linea.saldo.costoTotal)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center">No hay datos para mostrar. Selecciona un producto y calcula.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 <div className="grid grid-cols-3 gap-4 mt-6">
                    <Card><CardHeader><CardTitle>Costo de Ventas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(costoTotalVentas)}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Rotación de Inventario</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{rotacion.toFixed(2)}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Días de Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{diasStock.toFixed(1)}</p></CardContent></Card>
                </div>
            </CardContent>
        </Card>
    );
}
