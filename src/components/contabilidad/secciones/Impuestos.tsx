'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useImpuestos } from '@/hooks/useImpuestos';
import { Edit, Percent, PlusCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import type { Impuesto, DeclaracionImpuesto } from '@/types/contabilidad.types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

// Schema for the form
const declaracionSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/, "El formato debe ser AAAA-MM, ej. 2023-10"),
  impuestoId: z.string().min(1, "Debe seleccionar un impuesto."),
  baseGravable: z.preprocess(val => Number(val) || 0, z.number().min(0)),
  valorCalculado: z.preprocess(val => Number(val) || 0, z.number().min(0)),
  valorPagado: z.preprocess(val => Number(val) || 0, z.number().min(0)),
  fechaPresentacion: z.string().min(1, "La fecha es requerida."),
});

type DeclaracionFormData = z.infer<typeof declaracionSchema>;

// Form Component
const DeclaracionForm = ({ impuestos, registrarDeclaracion, onClose }: {
    impuestos: Impuesto[],
    registrarDeclaracion: (data: Omit<DeclaracionImpuesto, 'id'>) => void,
    onClose: () => void,
}) => {
    const { toast } = useToast();
    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<DeclaracionFormData>({
        resolver: zodResolver(declaracionSchema),
        defaultValues: {
            periodo: new Date().toISOString().substring(0, 7),
            fechaPresentacion: new Date().toISOString().split('T')[0],
            baseGravable: 0,
            valorCalculado: 0,
            valorPagado: 0,
        }
    });

    const onSubmit = (data: DeclaracionFormData) => {
        registrarDeclaracion(data);
        toast({
            title: "Declaración Registrada",
            description: "La nueva declaración de impuestos ha sido guardada."
        });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div>
                <Label htmlFor="periodo">Período (Año-Mes)</Label>
                <Input id="periodo" type="month" {...register('periodo')} />
                {errors.periodo && <p className="text-sm text-destructive mt-1">{errors.periodo.message}</p>}
            </div>
            <div>
                <Label htmlFor="impuestoId">Impuesto</Label>
                 <Controller
                    name="impuestoId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger id="impuestoId"><SelectValue placeholder="Seleccione un impuesto"/></SelectTrigger>
                            <SelectContent>
                                {impuestos.filter(i => i.activo).map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.impuestoId && <p className="text-sm text-destructive mt-1">{errors.impuestoId.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="baseGravable">Base Gravable</Label>
                    <Input id="baseGravable" type="number" {...register('baseGravable')} />
                </div>
                 <div>
                    <Label htmlFor="valorCalculado">Valor Calculado</Label>
                    <Input id="valorCalculado" type="number" {...register('valorCalculado')} />
                </div>
            </div>
             <div>
                <Label htmlFor="valorPagado">Valor Pagado</Label>
                <Input id="valorPagado" type="number" {...register('valorPagado')} />
            </div>
             <div>
                <Label htmlFor="fechaPresentacion">Fecha de Presentación</Label>
                <Input id="fechaPresentacion" type="date" {...register('fechaPresentacion')} />
                 {errors.fechaPresentacion && <p className="text-sm text-destructive mt-1">{errors.fechaPresentacion.message}</p>}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Registrar
                </Button>
            </DialogFooter>
        </form>
    );
};

const ImpuestosConfiguracion = ({ impuestos, onUpdate }: { impuestos: Impuesto[], onUpdate: (id: string, data: Partial<Impuesto>) => void }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración de Impuestos</CardTitle>
                <CardDescription>Define los impuestos y retenciones aplicables a tu negocio.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Tasa (%)</TableHead>
                            <TableHead>Cuenta (Compras)</TableHead>
                            <TableHead>Cuenta (Ventas)</TableHead>
                            <TableHead>Activo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {impuestos.map(imp => (
                            <TableRow key={imp.id}>
                                <TableCell className="font-medium">{imp.nombre}</TableCell>
                                <TableCell><Badge variant="secondary">{imp.tipo}</Badge></TableCell>
                                <TableCell>{imp.tasa}%</TableCell>
                                <TableCell>{imp.cuentaContableCompras}</TableCell>
                                <TableCell>{imp.cuentaContableVentas}</TableCell>
                                <TableCell>
                                    <Switch
                                        checked={imp.activo}
                                        onCheckedChange={(checked) => onUpdate(imp.id, { activo: checked })}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const ImpuestosDeclaraciones = ({ declaraciones, impuestos, registrarDeclaracion }: { 
    declaraciones: DeclaracionImpuesto[], 
    impuestos: Impuesto[],
    registrarDeclaracion: (data: Omit<DeclaracionImpuesto, 'id'>) => void 
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const getImpuestoNombre = (id: string) => impuestos.find(i => i.id === id)?.nombre || 'N/A';
    
    return (
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Declaraciones y Reportes</CardTitle>
                        <CardDescription>Historial de declaraciones de impuestos presentadas.</CardDescription>
                    </div>
                     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Nueva Declaración</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Registrar Nueva Declaración</DialogTitle>
                            </DialogHeader>
                            <DeclaracionForm 
                                impuestos={impuestos}
                                registrarDeclaracion={registrarDeclaracion}
                                onClose={() => setIsDialogOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead>Impuesto</TableHead>
                            <TableHead>Base Gravable</TableHead>
                            <TableHead>Valor Calculado</TableHead>
                            <TableHead>Fecha de Presentación</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {declaraciones.map(dec => (
                             <TableRow key={dec.id}>
                                <TableCell>{dec.periodo}</TableCell>
                                <TableCell>{getImpuestoNombre(dec.impuestoId)}</TableCell>
                                <TableCell>{formatCurrency(dec.baseGravable)}</TableCell>
                                <TableCell>{formatCurrency(dec.valorCalculado)}</TableCell>
                                <TableCell>{new Date(dec.fechaPresentacion).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function Impuestos() {
    const { impuestos, declaraciones, actualizarImpuesto, registrarDeclaracion } = useImpuestos();
    
    return (
        <div className="space-y-6">
            <ImpuestosConfiguracion impuestos={impuestos} onUpdate={actualizarImpuesto} />
            <ImpuestosDeclaraciones 
                declaraciones={declaraciones} 
                impuestos={impuestos}
                registrarDeclaracion={registrarDeclaracion}
            />
        </div>
    );
}
