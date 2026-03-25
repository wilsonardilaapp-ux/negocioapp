'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { usePlanDeCuentas } from '@/hooks/usePlanDeCuentas';
import type { Cuenta, TipoCuenta } from '@/types/contabilidad.types';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

const cuentaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido.'),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  tipo: z.enum(['Activo', 'Pasivo', 'Patrimonio', 'Ingresos', 'Costos', 'Gastos']),
  esCuentaMayor: z.boolean(),
  permiteMovimientos: z.boolean(),
});

type CuentaFormData = z.infer<typeof cuentaSchema>;

export default function PlanDeCuentas() {
    const { cuentas, registrarCuenta, isLoading } = usePlanDeCuentas();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<TipoCuenta | 'all'>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<CuentaFormData>({
        resolver: zodResolver(cuentaSchema),
        defaultValues: {
            codigo: '',
            nombre: '',
            tipo: 'Activo',
            esCuentaMayor: false,
            permiteMovimientos: true,
        },
    });

    const onSubmit = (data: CuentaFormData) => {
        registrarCuenta(data);
        toast({ title: 'Cuenta Creada', description: `La cuenta "${data.nombre}" ha sido registrada.` });
        setIsDialogOpen(false);
        reset();
    };

    const tiposDeCuenta: TipoCuenta[] = ['Activo', 'Pasivo', 'Patrimonio', 'Ingresos', 'Costos', 'Gastos'];

    const filteredCuentas = useMemo(() => {
        return cuentas.filter(cuenta => {
            const searchMatch = cuenta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || cuenta.codigo.includes(searchTerm);
            const typeMatch = filterType === 'all' || cuenta.tipo === filterType;
            return searchMatch && typeMatch;
        });
    }, [cuentas, searchTerm, filterType]);

    const getTipoBadgeVariant = (tipo: TipoCuenta): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (tipo) {
            case 'Activo': return 'default';
            case 'Pasivo': return 'secondary';
            case 'Patrimonio': return 'outline';
            case 'Ingresos': return 'default';
            case 'Costos': return 'destructive';
            case 'Gastos': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Plan de Cuentas (PUC)</CardTitle>
                        <CardDescription>Consulta y gestiona las cuentas contables de tu negocio.</CardDescription>
                    </div>
                     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Crear Cuenta
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Crear Nueva Cuenta</DialogTitle>
                                <DialogDescription>
                                    Define los detalles de la nueva cuenta contable.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="codigo">Código</Label>
                                    <Input id="codigo" {...register('codigo')} />
                                    {errors.codigo && <p className="text-sm text-destructive mt-1">{errors.codigo.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nombre">Nombre de la Cuenta</Label>
                                    <Input id="nombre" {...register('nombre')} />
                                    {errors.nombre && <p className="text-sm text-destructive mt-1">{errors.nombre.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Controller
                                        name="tipo"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {tiposDeCuenta.map(tipo => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <div className="flex items-center space-x-2">
                                        <Controller name="esCuentaMayor" control={control} render={({ field }) => (
                                            <Switch id="esCuentaMayor" checked={field.value} onCheckedChange={field.onChange} />
                                        )} />
                                        <Label htmlFor="esCuentaMayor">Es Cuenta Mayor</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Controller name="permiteMovimientos" control={control} render={({ field }) => (
                                            <Switch id="permiteMovimientos" checked={field.value} onCheckedChange={field.onChange} />
                                        )} />
                                        <Label htmlFor="permiteMovimientos">Permite Mov.</Label>
                                    </div>
                                </div>
                                 <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Guardar Cuenta
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-4 mb-4">
                    <Input 
                        placeholder="Buscar por nombre o código..." 
                        className="max-w-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={filterType} onValueChange={(value) => setFilterType(value as TipoCuenta | 'all')}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tipo de cuenta" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            {tiposDeCuenta.map(tipo => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre de la Cuenta</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Permite Mov.</TableHead>
                                <TableHead className="text-right">Saldo Actual</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            Cargando cuentas...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredCuentas.length > 0 ? (
                                filteredCuentas.map(cuenta => (
                                    <TableRow key={cuenta.id} className={cn(cuenta.esCuentaMayor && 'bg-muted/50 font-bold')}>
                                        <TableCell>{cuenta.codigo}</TableCell>
                                        <TableCell className={cn(!cuenta.esCuentaMayor && 'pl-10')}>{cuenta.nombre}</TableCell>
                                        <TableCell>
                                            <Badge variant={getTipoBadgeVariant(cuenta.tipo)}>{cuenta.tipo}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {cuenta.permiteMovimientos ? 'Sí' : 'No'}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(cuenta.saldo)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No se encontraron cuentas.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
