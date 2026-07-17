'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ItemInventario, LineaKardexCalculada, MetodoValuacion } from '@/types/kardex.types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

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
    const unidadesRotadas = useMemo(() => lineas.reduce((sum, l) => sum + (l.salida?.cantidad ?? 0), 0), [lineas]);

    // Segmentación visual de datos ya calculados
    const totalPages = Math.ceil(lineas.length / itemsPerPage);
    const paginatedLineas = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return lineas.slice(startIndex, startIndex + itemsPerPage);
    }, [lineas, currentPage]);

    // --- FUNCIONES DE EXPORTACIÓN ---
    const handleExportExcel = () => {
        if (lineas.length === 0) return;

        const item = items.find(i => i.id === selectedItemId);
        
        const exportData = lineas.map(linea => ({
            "Fecha": linea.fecha,
            "Concepto": linea.concepto,
            "Documento": linea.documento,
            "Entrada - Cant.": linea.entrada?.cantidad ?? 0,
            "Entrada - C.Unit": linea.entrada?.costoUnitario ?? 0,
            "Entrada - Total": linea.entrada?.costoTotal ?? 0,
            "Salida - Cant.": linea.salida?.cantidad ?? 0,
            "Salida - C.Unit": linea.salida?.costoUnitario ?? 0,
            "Salida - Total": linea.salida?.costoTotal ?? 0,
            "Saldo - Cant.": linea.saldo.cantidad,
            "Saldo - C.Unit": linea.saldo.costoUnitario,
            "Saldo - Total": linea.saldo.costoTotal,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kardex por Ítem");
        
        const fileName = `Kardex_${item?.codigo || 'Item'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Consulta de Kardex por Ítem</CardTitle>
                        <CardDescription className="print:hidden">Selecciona un ítem y un método para ver su movimiento detallado.</CardDescription>
                    </div>
                    {/* Encabezado visible solo al imprimir */}
                    <div className="hidden print:block text-right">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Reporte de Auditoría de Inventario</p>
                        <p className="text-xs font-medium">{new Date().toLocaleString('es-CO')}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Contenedor de filtros y acciones */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                    <div className="flex flex-wrap items-end gap-4 flex-1 print:hidden">
                        <div className="min-w-[250px]">
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
                        <div className="min-w-[200px]">
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

                    <div className="flex gap-2 print:hidden">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportExcel} 
                            disabled={lineas.length === 0}
                            className="font-bold border-green-200 text-green-700 hover:bg-green-50"
                        >
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Kardex
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handlePrint}
                            disabled={lineas.length === 0}
                            className="font-bold"
                        >
                            <Printer className="mr-2 h-4 w-4" /> Imprimir Reporte
                        </Button>
                    </div>
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
                            {paginatedLineas.length > 0 ? paginatedLineas.map((linea, index) => (
                                <TableRow key={index}>
                                    <TableCell>{linea.fecha}</TableCell>
                                    <TableCell className="capitalize">{linea.concepto}</TableCell>
                                    <TableCell className="text-center border-l">{linea.entrada?.cantidad ?? ''}</TableCell>
                                    <TableCell className="text-right">{linea.entrada ? formatCurrency(linea.entrada.costoUnitario) : ''}</TableCell>
                                    <TableCell className="text-right">{linea.entrada ? formatCurrency(linea.entrada.costoTotal) : ''}</TableCell>
                                    <TableCell className="text-center border-l">{linea.salida?.cantidad ?? ''}</TableCell>
                                    <TableCell className="text-right">{linea.salida ? formatCurrency(linea.salida.costoUnitario) : ''}</TableCell>
                                    <TableCell className="text-right">{linea.salida ? formatCurrency(linea.salida.costoTotal) : ''}</TableCell>
                                    <TableCell className="text-center border-l font-semibold">{linea.saldo.cantidad}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(linea.saldo.costoUnitario)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(linea.saldo.costoTotal)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center">No hay datos para mostrar. Selecciona un producto para ver su historial.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between py-4 border-t mt-4 print:hidden">
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

                 <div className="grid grid-cols-3 gap-4 mt-6">
                    <Card><CardHeader><CardTitle>Costo de Ventas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(costoTotalVentas)}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Unidades Rotadas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{unidadesRotadas}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Días de Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">N/A</p></CardContent></Card>
                </div>
            </CardContent>
        </Card>
    );
}
