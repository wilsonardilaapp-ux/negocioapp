'use client';
import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { useAsientosContables } from '@/hooks/useAsientosContables';
import { usePlanDeCuentas } from '@/hooks/usePlanDeCuentas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Cuenta, AsientoContable } from '@/types/contabilidad.types';
import { useToast } from '@/hooks/use-toast';

const detalleSchema = z.object({
  cuentaCodigo: z.string().min(1, 'Se requiere una cuenta.'),
  descripcion: z.string().optional(),
  debito: z.preprocess(val => Number(String(val).replace(/[^0-9.-]/g, '')) || 0, z.number()),
  credito: z.preprocess(val => Number(String(val).replace(/[^0-9.-]/g, '')) || 0, z.number()),
});

const asientoFormSchema = z.object({
  fecha: z.string().min(1, 'La fecha es requerida.'),
  concepto: z.string().min(3, 'El concepto es requerido.'),
  documentoReferencia: z.string().optional(),
  detalles: z.array(detalleSchema).min(2, 'Se requieren al menos dos detalles.'),
}).refine(data => {
  const totalDebitos = data.detalles.reduce((sum, d) => sum + d.debito, 0);
  const totalCreditos = data.detalles.reduce((sum, d) => sum + d.credito, 0);
  return Math.abs(totalDebitos - totalCreditos) < 0.01;
}, {
  message: 'Los débitos y créditos no están cuadrados.',
  path: ['detalles'],
});

type AsientoFormData = z.infer<typeof asientoFormSchema>;

interface AsientoFormProps {
  cuentas: Cuenta[];
  onSave: (data: Omit<AsientoContable, 'id' | 'totalDebitos' | 'totalCreditos' | 'estaCuadrado'>) => void;
  onClose: () => void;
}

const AsientoForm = ({ cuentas, onSave, onClose }: AsientoFormProps) => {
    const { toast } = useToast();
    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<AsientoFormData>({
        resolver: zodResolver(asientoFormSchema),
        defaultValues: {
            fecha: new Date().toISOString().split('T')[0],
            concepto: '',
            documentoReferencia: '',
            detalles: [
                { cuentaCodigo: '', descripcion: '', debito: 0, credito: 0 },
                { cuentaCodigo: '', descripcion: '', debito: 0, credito: 0 },
            ]
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: "detalles" });
    const detallesValues = watch('detalles');
    const totalDebitos = useMemo(() => detallesValues.reduce((sum, d) => sum + (d.debito || 0), 0), [detallesValues]);
    const totalCreditos = useMemo(() => detallesValues.reduce((sum, d) => sum + (d.credito || 0), 0), [detallesValues]);
    const diferencia = totalDebitos - totalCreditos;

    const onSubmit = (data: AsientoFormData) => {
        const fullDetails = data.detalles.map(d => ({
            ...d,
            descripcion: d.descripcion || '',
            id: `det-${Math.random()}`,
            cuentaNombre: cuentas.find(c => c.codigo === d.cuentaCodigo)?.nombre || 'N/A',
        }));
        onSave({ ...data, detalles: fullDetails });
        toast({ title: "Asiento Guardado", description: "El asiento contable ha sido registrado con éxito."});
    };
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Fecha</Label><Input type="date" {...register('fecha')} /></div>
                <div className="md:col-span-2"><Label>Concepto</Label><Input {...register('concepto')} /></div>
            </div>
            {errors.concepto && <p className="text-sm text-destructive">{errors.concepto.message}</p>}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Cuenta</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="w-[150px] text-right">Débito</TableHead>
                            <TableHead className="w-[150px] text-right">Crédito</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell>
                                    <Controller
                                        control={control}
                                        name={`detalles.${index}.cuentaCodigo`}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                                <SelectContent>
                                                    {cuentas.filter(c => c.permiteMovimientos).map(c => <SelectItem key={c.id} value={c.codigo}>{c.codigo} - {c.nombre}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </TableCell>
                                <TableCell><Input placeholder="Detalle del movimiento" {...register(`detalles.${index}.descripcion`)} /></TableCell>
                                <TableCell><Input type="number" step="any" className="text-right" {...register(`detalles.${index}.debito`)} /></TableCell>
                                <TableCell><Input type="number" step="any" className="text-right" {...register(`detalles.${index}.credito`)} /></TableCell>
                                <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={2} className="text-right font-bold">Totales:</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalDebitos)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalCreditos)}</TableCell>
                            <td></td>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={4} className="text-right font-bold">Diferencia:</TableCell>
                            <TableCell className={cn("text-right font-bold", diferencia !== 0 ? 'text-destructive' : 'text-green-600')}>{formatCurrency(diferencia)}</TableCell>
                            <td></td>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
             {errors.detalles && <p className="text-sm text-destructive mt-1">{errors.detalles.message || errors.detalles.root?.message}</p>}

            <Button type="button" variant="outline" size="sm" onClick={() => append({ cuentaCodigo: '', descripcion: '', debito: 0, credito: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Fila
            </Button>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Guardar Asiento</Button>
            </div>
        </form>
    );
};

export default function AsientosContables() {
    const { asientos, registrarAsiento } = useAsientosContables();
    const { cuentas } = usePlanDeCuentas();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Libro Diario de Asientos Contables</CardTitle>
                        <CardDescription>Registra y consulta todas las transacciones contables de tu negocio.</CardDescription>
                    </div>
                     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Asiento</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Crear Nuevo Asiento Contable</DialogTitle>
                                <DialogDescription>Asegúrate de que la suma de los débitos sea igual a la de los créditos.</DialogDescription>
                            </DialogHeader>
                            <AsientoForm cuentas={cuentas} onSave={registrarAsiento} onClose={() => setIsDialogOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-4">
                    <Input placeholder="Buscar por concepto o referencia..." className="max-w-sm" />
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Ref.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {asientos.map(asiento => (
                                <TableRow key={asiento.id}>
                                    <TableCell>{new Date(asiento.fecha).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-medium">{asiento.concepto}</TableCell>
                                    <TableCell>{asiento.documentoReferencia}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(asiento.totalDebitos)}</TableCell>
                                    <TableCell>
                                        <Badge variant={asiento.estaCuadrado ? 'default' : 'destructive'}>
                                            {asiento.estaCuadrado ? 'Cuadrado' : 'Descuadrado'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}