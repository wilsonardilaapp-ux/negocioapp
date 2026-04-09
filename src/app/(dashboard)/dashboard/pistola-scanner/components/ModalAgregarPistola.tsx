
// src/app/(dashboard)/dashboard/pistola-scanner/components/ModalAgregarPistola.tsx
"use client";

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { FormularioPistolaScanner, MarcaScanner, ModeloScanner, TipoConexion, TerminalAsignada } from '@/models/pistolaScanner';

const marcas: MarcaScanner[] = ['Honeywell', 'Zebra', 'Datalogic', 'Newland', 'Opticon', 'Metrologic', 'Otro'];
const modelosPorMarca: Record<MarcaScanner, ModeloScanner[]> = {
    Honeywell: ['Honeywell Voyager 1202g', 'Honeywell Xenon 1900', 'Honeywell Granit 1981i', 'Honeywell Genesis 7580g', 'Otro'],
    Zebra: ['Zebra DS2208-SR', 'Zebra DS8178', 'Zebra LI3678', 'Zebra CS6080', 'Otro'],
    Datalogic: ['Datalogic QuickScan QD2430', 'Datalogic Gryphon GD4430', 'Datalogic Heron HD3430', 'Otro'],
    Newland: ['Newland NLS-HR3280', 'Newland BS80 Piranha', 'Newland NLS-FR40', 'Otro'],
    Opticon: ['Opticon OPI-3601', 'Opticon OPR-3301', 'Otro'],
    Metrologic: ['Otro'],
    Otro: ['Otro'],
};
const tiposConexion: TipoConexion[] = ['USB HID', 'Bluetooth SPP', 'RS-232 Serial', 'Wi-Fi'];
const terminales: TerminalAsignada[] = ['POS Principal', 'Inventario', 'Móvil / Tablet', 'Recepción'];

const schema = z.object({
  nombre: z.string().min(3, 'El nombre es requerido'),
  marca: z.enum(marcas),
  modelo: z.string().min(1, 'El modelo es requerido'),
  numeroSerie: z.string().min(3, 'El número de serie es requerido'),
  tipoConexion: z.enum(tiposConexion),
  puerto: z.string().min(1, 'El puerto es requerido'),
  terminalAsignada: z.enum(terminales),
});

interface ModalAgregarPistolaProps {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (datos: FormularioPistolaScanner) => void;
}

export default function ModalAgregarPistola({ abierto, onCerrar, onGuardar }: ModalAgregarPistolaProps) {
    const { toast } = useToast();
    const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormularioPistolaScanner>({
        resolver: zodResolver(schema),
        defaultValues: {
            nombre: '',
            marca: 'Zebra',
            modelo: 'Zebra DS2208-SR',
            numeroSerie: '',
            tipoConexion: 'USB HID',
            puerto: 'COM1',
            terminalAsignada: 'POS Principal',
        },
    });

    const marcaSeleccionada = watch('marca');

    const onSubmit = (data: FormularioPistolaScanner) => {
        onGuardar(data);
    };

    return (
        <Dialog open={abierto} onOpenChange={onCerrar}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Agregar Nueva Pistola Escáner</DialogTitle>
                    <DialogDescription>Complete la información del nuevo dispositivo.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="nombre">Nombre Descriptivo</Label>
                        <Input id="nombre" {...register('nombre')} />
                        {errors.nombre && <p className="text-destructive text-sm mt-1">{errors.nombre.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="marca">Marca</Label>
                            <Controller name="marca" control={control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id="marca"><SelectValue /></SelectTrigger>
                                    <SelectContent>{marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                </Select>
                            )} />
                        </div>
                        <div>
                            <Label htmlFor="modelo">Modelo</Label>
                            <Controller name="modelo" control={control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id="modelo"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {modelosPorMarca[marcaSeleccionada].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="numeroSerie">Número de Serie</Label>
                        <Input id="numeroSerie" {...register('numeroSerie')} />
                        {errors.numeroSerie && <p className="text-destructive text-sm mt-1">{errors.numeroSerie.message}</p>}
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="tipoConexion">Tipo de Conexión</Label>
                            <Controller name="tipoConexion" control={control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id="tipoConexion"><SelectValue /></SelectTrigger>
                                    <SelectContent>{tiposConexion.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            )} />
                        </div>
                         <div>
                            <Label htmlFor="puerto">Puerto</Label>
                            <Input id="puerto" {...register('puerto')} />
                            {errors.puerto && <p className="text-destructive text-sm mt-1">{errors.puerto.message}</p>}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="terminalAsignada">Terminal Asignada</Label>
                        <Controller name="terminalAsignada" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="terminalAsignada"><SelectValue /></SelectTrigger>
                                <SelectContent>{terminales.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                        )} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onCerrar}>Cancelar</Button>
                        <Button type="submit">Guardar Dispositivo</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
