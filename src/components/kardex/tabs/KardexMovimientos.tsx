
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ItemInventario, MovimientoKardex, NuevoMovimientoForm, TipoMovimiento } from '@/types/kardex.types';
import { Save, Loader2, ChevronLeft, ChevronRight, FileSpreadsheet, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

interface KardexMovimientosProps {
    items: ItemInventario[];
    movimientos: MovimientoKardex[];
    registrarMovimiento: (data: NuevoMovimientoForm) => Promise<void>;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const movimientoSchema = z.object({
  tipo: z.enum(['entrada_compra', 'entrada_devolucion_cliente', 'salida_venta', 'salida_devolucion_proveedor', 'ajuste_danio', 'ajuste_inventario_fisico', 'transferencia_bodega']),
  itemId: z.string().min(1, 'Debe seleccionar un ítem'),
  cantidad: z.preprocess(val => Number(val), z.number().min(0.01, 'La cantidad debe ser mayor a cero')),
  costoUnitario: z.preprocess(val => Number(val) || 0, z.number().min(0, 'El costo no puede ser negativo')),
  documento: z.string().min(1, 'El documento es requerido'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  observaciones: z.string().optional(),
  bodegaOrigen: z.string().optional(),
  bodegaDestino: z.string().optional(),
});


export default function KardexMovimientos({ items, movimientos, registrarMovimiento }: KardexMovimientosProps) {
    const { toast } = useToast();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const { register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting } } = useForm<NuevoMovimientoForm>({
        resolver: zodResolver(movimientoSchema),
        defaultValues: {
            tipo: 'entrada_compra',
            itemId: '',
            cantidad: 0,
            costoUnitario: 0,
            documento: '',
            fecha: new Date().toISOString().split('T')[0],
            observaciones: '',
        }
    });

    const tipoMovimiento = watch('tipo');

    const handleExportExcel = () => {
        const dataToExport = sortedMovimientos.map(mov => ({
            "Fecha": new Date(mov.fecha).toLocaleDateString(),
            "Tipo": mov.tipo.replace(/_/g, ' '),
            "Ítem": items.find(p => p.id === mov.itemId)?.nombre ?? 'N/A',
            "Documento": mov.documento,
            "Cantidad": mov.cantidad,
            "Costo Unitario": mov.costoUnitario,
            "Total": mov.costoTotal,
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
        XLSX.writeFile(wb, "Historial_Movimientos_Kardex.xlsx");
    };

    const handlePrint = () => {
        window.print();
    };

    const onSubmit = async (data: NuevoMovimientoForm) => {
        try {
            await registrarMovimiento(data);
            toast({ title: 'Movimiento Registrado', description: 'El nuevo movimiento se ha guardado en el kardex.' });
            reset();
            setCurrentPage(1);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al registrar', description: error.message });
        }
    };

    const sortedMovimientos = [...movimientos].reverse();
    const totalPages = Math.ceil(sortedMovimientos.length / itemsPerPage);
    const paginatedMovimientos = sortedMovimientos.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 print:hidden">
                <Card><CardHeader><CardTitle>Registrar Movimiento</CardTitle><CardDescription>Añade una nueva entrada o salida al inventario.</CardDescription></CardHeader><CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div><Label>Tipo de Movimiento</Label><Controller name="tipo" control={control} render={({ field }) => ( <Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entrada_compra">Entrada (Compra)</SelectItem><SelectItem value="entrada_devolucion_cliente">Entrada (Devolución Cliente)</SelectItem><SelectItem value="salida_venta">Salida (Venta)</SelectItem><SelectItem value="salida_devolucion_proveedor">Salida (Devolución Proveedor)</SelectItem><SelectItem value="ajuste_danio">Ajuste (Daño)</SelectItem><SelectItem value="ajuste_inventario_fisico">Ajuste (Inventario Físico)</SelectItem><SelectItem value="transferencia_bodega">Transferencia</SelectItem></SelectContent></Select> )}/></div>
                        <div><Label>Ítem</Label><Controller name="itemId" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Seleccione un ítem" /></SelectTrigger><SelectContent>{items.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent></Select>)} />{errors.itemId && <p className="text-sm text-destructive mt-1">{errors.itemId.message}</p>}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label>Cantidad</Label><Input type="number" step="any" {...register('cantidad', { valueAsNumber: true })} /></div>
                            
                            {tipoMovimiento === 'entrada_compra' && (
                                <div className="animate-in fade-in duration-300">
                                    <Label>Costo Unitario ($)</Label>
                                    <Input type="number" step="any" {...register('costoUnitario', { valueAsNumber: true })} />
                                </div>
                            )}
                        </div>
                        <div><Label>Documento (Factura/Remisión)</Label><Input {...register('documento')} />{errors.documento && <p className="text-sm text-destructive mt-1">{errors.documento.message}</p>}</div>
                        <div><Label>Fecha</Label><Input type="date" {...register('fecha')} /></div>
                        <div><Label>Observaciones</Label><Textarea {...register('observaciones')} /></div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Registrar</Button>
                    </form>
                </CardContent></Card>
            </div>
            <div className="md:col-span-2 print:col-span-3">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                            <CardTitle>Historial de Movimientos</CardTitle>
                            <CardDescription>Mostrando {paginatedMovimientos.length} de {movimientos.length} registros totales.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 print:hidden">
                            <Button variant="outline" size="sm" onClick={handleExportExcel} className="font-bold border-green-200 text-green-700 hover:bg-green-50">
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
                            </Button>
                            <Button variant="outline" size="sm" onClick={handlePrint} className="font-bold">
                                <Printer className="mr-2 h-4 w-4" /> Imprimir
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Ítem</TableHead>
                                        <TableHead>Doc.</TableHead>
                                        <TableHead>Cant.</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedMovimientos.length > 0 ? (
                                        paginatedMovimientos.map(mov => (
                                            <TableRow key={mov.id}>
                                                <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                                                <TableCell><Badge variant={mov.tipo.startsWith('entrada') ? 'default' : 'secondary'} className="capitalize">{mov.tipo.replace(/_/g, ' ')}</Badge></TableCell>
                                                <TableCell>{items.find(p => p.id === mov.itemId)?.nombre ?? 'N/A'}</TableCell>
                                                <TableCell>{mov.documento}</TableCell>
                                                <TableCell>{mov.cantidad}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(mov.costoTotal)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">No hay movimientos registrados.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between py-4 border-t mt-4 print:hidden">
                                <div className="text-sm text-muted-foreground font-medium">
                                    Página {currentPage} de {totalPages}
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
