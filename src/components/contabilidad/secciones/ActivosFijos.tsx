'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { PlusCircle, Building, DollarSign, TrendingDown, BookOpen, Loader2 } from "lucide-react";
import { useActivosFijos } from '@/hooks/useActivosFijos';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import type { ActivoFijo } from '@/types/contabilidad.types';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const activoSchema = z.object({
  nombre: z.string().min(3, { message: "El nombre es requerido." }),
  codigo: z.string().min(1, { message: "El código es requerido." }),
  fechaAdquisicion: z.string().min(1, "La fecha es requerida."),
  costoInicial: z.preprocess(val => Number(val) || 0, z.number().min(1, "El costo debe ser mayor a 0.")),
  valorResidual: z.preprocess(val => Number(val) || 0, z.number().min(0, "El valor residual no puede ser negativo.")),
  vidaUtil: z.preprocess(val => Number(val) || 0, z.number().int().min(1, "La vida útil debe ser al menos 1 año.")),
  cuentaActivo: z.string().optional(),
  cuentaDepreciacion: z.string().optional(),
  cuentaGastoDepreciacion: z.string().optional(),
});

type ActivoFormData = z.infer<typeof activoSchema>;

export default function ActivosFijos() {
    const { activos, totalValorEnLibros, totalCostoInicial, totalDepreciacionAcumulada, registrarActivo } = useActivosFijos();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();
    
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ActivoFormData>({
        resolver: zodResolver(activoSchema),
        defaultValues: {
            fechaAdquisicion: new Date().toISOString().split('T')[0],
            costoInicial: 0,
            valorResidual: 0,
            vidaUtil: 1,
            cuentaActivo: '',
            cuentaDepreciacion: '',
            cuentaGastoDepreciacion: ''
        }
    });

    const onSubmit = (data: ActivoFormData) => {
        const dataToSave = {
            ...data,
            cuentaActivo: data.cuentaActivo || 'N/A',
            cuentaDepreciacion: data.cuentaDepreciacion || 'N/A',
            cuentaGastoDepreciacion: data.cuentaGastoDepreciacion || 'N/A',
        };
        registrarActivo(dataToSave);
        toast({ title: 'Activo Registrado', description: `El activo "${data.nombre}" ha sido añadido.` });
        setIsDialogOpen(false);
        reset();
    };

    return (
        <div className="space-y-6">
             <div className="grid md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Costo Histórico Total</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(totalCostoInicial)}</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Depreciación Acumulada</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(totalDepreciacionAcumulada)}</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Valor Neto en Libros</CardTitle><BookOpen className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(totalValorEnLibros)}</div></CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Building /> Control de Activos Fijos</CardTitle>
                            <CardDescription>Visualiza y gestiona los activos de tu compañía.</CardDescription>
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button><PlusCircle className="mr-2 h-4 w-4" /> Añadir Activo Fijo</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Registrar Nuevo Activo Fijo</DialogTitle>
                                    <DialogDescription>Completa los detalles del activo.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="nombre" className="text-right">Nombre</Label>
                                        <Input id="nombre" {...register('nombre')} className="col-span-3" />
                                        {errors.nombre && <p className="col-span-4 text-sm text-destructive text-right">{errors.nombre.message}</p>}
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="codigo" className="text-right">Código</Label>
                                        <Input id="codigo" {...register('codigo')} className="col-span-3" />
                                        {errors.codigo && <p className="col-span-4 text-sm text-destructive text-right">{errors.codigo.message}</p>}
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="fechaAdquisicion" className="text-right">Fecha Adquisición</Label>
                                        <Input id="fechaAdquisicion" type="date" {...register('fechaAdquisicion')} className="col-span-3" />
                                        {errors.fechaAdquisicion && <p className="col-span-4 text-sm text-destructive text-right">{errors.fechaAdquisicion.message}</p>}
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="costoInicial" className="text-right">Costo Inicial</Label>
                                        <Input id="costoInicial" type="number" {...register('costoInicial')} className="col-span-3" />
                                        {errors.costoInicial && <p className="col-span-4 text-sm text-destructive text-right">{errors.costoInicial.message}</p>}
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="valorResidual" className="text-right">Valor Residual</Label>
                                        <Input id="valorResidual" type="number" {...register('valorResidual')} className="col-span-3" />
                                        {errors.valorResidual && <p className="col-span-4 text-sm text-destructive text-right">{errors.valorResidual.message}</p>}
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="vidaUtil" className="text-right">Vida Útil (años)</Label>
                                        <Input id="vidaUtil" type="number" {...register('vidaUtil')} className="col-span-3" />
                                        {errors.vidaUtil && <p className="col-span-4 text-sm text-destructive text-right">{errors.vidaUtil.message}</p>}
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Guardar Activo
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre del Activo</TableHead>
                                    <TableHead>Fecha de Adquisición</TableHead>
                                    <TableHead className="text-right">Costo Inicial</TableHead>
                                    <TableHead className="text-right">Depreciación Acumulada</TableHead>
                                    <TableHead className="text-right">Valor en Libros</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activos.map(activo => (
                                    <TableRow key={activo.id}>
                                        <TableCell className="font-medium">{activo.nombre}</TableCell>
                                        <TableCell>{new Date(activo.fechaAdquisicion).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(activo.costoInicial)}</TableCell>
                                        <TableCell className="text-right text-destructive">-{formatCurrency(activo.depreciacionAcumulada)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(activo.valorEnLibros)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={2} className="font-bold">Totales</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(totalCostoInicial)}</TableCell>
                                    <TableCell className="text-right font-bold text-destructive">-{formatCurrency(totalDepreciacionAcumulada)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(totalValorEnLibros)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}