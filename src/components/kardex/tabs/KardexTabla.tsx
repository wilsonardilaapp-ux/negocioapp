'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ItemInventario, LineaKardexCalculada, MetodoValuacion } from '@/types/kardex.types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface KardexTablaProps {
    items: ItemInventario[];
    calcularKardex: (itemId: string, metodo: MetodoValuacion) => LineaKardexCalculada[];
    selectedItemId: string;
    setSelectedItemId: (id: string) => void;
    selectedMetodo: MetodoValuacion;
    setSelectedMetodo: (metodo: MetodoValuacion) => void;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export default function KardexTabla({ 
    items, 
    calcularKardex,
    selectedItemId,
    setSelectedItemId,
    selectedMetodo,
    setSelectedMetodo
}: KardexTablaProps) {
    
    // --- DERIVACIÓN DE DATOS (REACCIÓN AUTOMÁTICA) ---
    const lineas = useMemo(() => {
        if (!selectedItemId) return [];
        return calcularKardex(selectedItemId, selectedMetodo);
    }, [selectedItemId, selectedMetodo, calcularKardex]);

    // Estado local para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Cálculos financieros derivados siempre sobre el total de líneas calculadas
    const costoTotalVentas = useMemo(() => lineas.reduce((sum, l) => sum + (l.salida?.costoTotal ?? 0), 0), [lineas]);
    const unidadesRotadas = useMemo(() => lineas.reduce((sum, l) => sum + (l.salida?.quantity ?? l.salida?.cantidad ?? 0), 0), [lineas]);

    // Segmentación visual de datos ya calculados
    const totalPages = Math.ceil(lineas.length / itemsPerPage);
    const paginatedLineas = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return lineas.slice(startIndex, startIndex + itemsPerPage);
    }, [lineas, currentPage]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Consulta de Kardex por Ítem</CardTitle>
                <CardDescription>Selecciona un ítem y un método para ver su movimiento detallado.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-end gap-4 mb-6">
                    <div className="flex-1 min-w-[250px]">
                        <label className="text-sm font-medium">Ítem de Inventario</label>
                        <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar ítem" />
                            </SelectTrigger>
                            <SelectContent>
                                {items.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-sm font-medium">Método de Valuación</label>
                        <Select value={selectedMetodo} onValueChange={(v) => setSelectedMetodo(v as MetodoValuacion)}>
                            <SelectTrigger>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="promedio_ponderado">Promedio Ponderado</SelectItem>
                                <SelectItem value="peps">PEPS</SelectItem>
                                <SelectItem value="ueps">UEPS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
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
                                <TableHead>C. Unit</TableHead>
                                <TableHead>C. Total</TableHead>
                                <TableHead className="border-l">Cant.</TableHead>
                                <TableHead>C. Unit</TableHead>
                                <TableHead>C. Total</TableHead>
                                <TableHead className="border-l">Cant.</TableHead>
                                <TableHead>C. Unit</TableHead>
                                <TableHead>C. Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedLineas.length > 0 ? paginatedLineas.map((linea, index) => (
                                <TableRow key={index}>
                                    <TableCell>{linea.fecha}</TableCell>
                                    <TableCell className="capitalize">{linea.concepto}</TableCell>
                                    <TableCell className="border-l">{linea.entrada?.cantidad ?? ''}</TableCell>
                                    <TableCell>{linea.entrada ? formatCurrency(linea.entrada.costoUnitario) : ''}</TableCell>
                                    <TableCell>{linea.entrada ? formatCurrency(linea.entrada.costoTotal) : ''}</TableCell>
                                    <TableCell className="border-l">{linea.salida?.cantidad ?? ''}</TableCell>
                                    <TableCell>{linea.salida ? formatCurrency(linea.salida.costoUnitario) : ''}</TableCell>
                                    <TableCell>{linea.salida ? formatCurrency(linea.salida.costoTotal) : ''}</TableCell>
                                    <TableCell className="border-l font-semibold">{linea.saldo.cantidad}</TableCell>
                                    <TableCell>{formatCurrency(linea.saldo.costoUnitario)}</TableCell>
                                    <TableCell className="font-bold text-primary">{formatCurrency(linea.saldo.costoTotal)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground italic">
                                        {selectedItemId ? 'No hay movimientos registrados para este ítem.' : 'Por favor, selecciona un ítem para visualizar su historial.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between py-4 border-t mt-4">
                        <div className="text-sm text-muted-foreground font-medium">
                            Página {currentPage} de {totalPages} ({lineas.length} registros)
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="font-bold"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage >= totalPages}
                                className="font-bold"
                            >
                                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <Card><CardHeader><CardTitle>Costo de Ventas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(costoTotalVentas)}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Unidades Rotadas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{unidadesRotadas}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Días de Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">N/A</p></CardContent></Card>
                </div>
            </CardContent>
        </Card>
    );
}
