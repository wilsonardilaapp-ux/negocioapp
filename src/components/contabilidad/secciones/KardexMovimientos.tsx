
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
import type { Producto, MovimientoKardex, NuevoMovimientoForm, TipoMovimiento } from "@/types/inventario.types";
import { Save } from 'lucide-react';

const movimientoSchema = z.object({
  tipo: z.enum(['entrada_compra', 'entrada_devolucion', 'salida_venta', 'salida_devolucion', 'ajuste_danio', 'ajuste_inventario', 'transferencia']),
  productoId: z.string().min(1, 'Debe seleccionar un producto'),
  cantidad: z.preprocess(val => Number(val), z.number().min(0.01, 'La cantidad debe ser mayor a cero')),
  costoUnitario: z.preprocess(val => Number(val), z.number().min(0, 'El costo no puede ser negativo')),
  documento: z.string().min(1, 'El documento es requerido'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  observaciones: z.string().optional(),
});

interface KardexMovimientosProps {
    productos: Producto[];
    movimientos: MovimientoKardex[];
    registrarMovimiento: (data: NuevoMovimientoForm) => void;
}

export default function KardexMovimientos({ productos, movimientos, registrarMovimiento }: KardexMovimientosProps) {
    const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<NuevoMovimientoForm>({
        resolver: zodResolver(movimientoSchema),
        defaultValues: {
            tipo: 'entrada_compra',
            productoId: '',
            cantidad: 0,
            costoUnitario: 0,
            documento: '',
            fecha: new Date().toISOString().split('T')[0],
            observaciones: '',
        }
    });

    const onSubmit = (data: NuevoMovimientoForm) => {
        registrarMovimiento(data);
        reset();
    };

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar Movimiento</CardTitle>
                        <CardDescription>Añade una nueva entrada o salida al inventario.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <Label>Tipo de Movimiento</Label>
                                <Controller name="tipo" control={control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="entrada_compra">Entrada (Compra)</SelectItem>
                                            <SelectItem value="entrada_devolucion">Entrada (Devolución)</SelectItem>
                                            <SelectItem value="salida_venta">Salida (Venta)</SelectItem>
                                            <SelectItem value="salida_devolucion">Salida (Devolución)</SelectItem>
                                            <SelectItem value="ajuste_danio">Ajuste (Daño)</SelectItem>
                                            <SelectItem value="ajuste_inventario">Ajuste (Inventario)</SelectItem>
                                            <SelectItem value="transferencia">Transferencia</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )} />
                            </div>
                             <div>
                                <Label>Producto</Label>
                                <Controller name="productoId" control={control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione un producto" /></SelectTrigger>
                                        <SelectContent>
                                            {productos.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )} />
                                {errors.productoId && <p className="text-sm text-destructive mt-1">{errors.productoId.message}</p>}
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div><Label>Cantidad</Label><Input type="number" step="any" {...register('cantidad')} /></div>
                                <div><Label>Costo Unitario</Label><Input type="number" step="any" {...register('costoUnitario')} /></div>
                                {errors.cantidad && <p className="text-sm text-destructive col-span-2">{errors.cantidad.message}</p>}
                                {errors.costoUnitario && <p className="text-sm text-destructive col-span-2">{errors.costoUnitario.message}</p>}
                            </div>
                            <div><Label>Documento (Factura/Remisión)</Label><Input {...register('documento')} /></div>
                            <div><Label>Fecha</Label><Input type="date" {...register('fecha')} /></div>
                            <div><Label>Observaciones</Label><Textarea {...register('observaciones')} /></div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                <Save className="mr-2 h-4 w-4" /> Registrar
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Últimos Movimientos</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Cantidad</TableHead>
                                        <TableHead>Costo Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...movimientos].reverse().slice(0, 15).map(mov => (
                                        <TableRow key={mov.id}>
                                            <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                                            <TableCell>{productos.find(p => p.id === mov.productoId)?.nombre ?? 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant={mov.tipo.startsWith('entrada') ? 'default' : 'secondary'}>{mov.tipo.replace('_', ' ')}</Badge>
                                            </TableCell>
                                            <TableCell>{mov.cantidad}</TableCell>
                                            <TableCell>{(mov.costoTotal).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
