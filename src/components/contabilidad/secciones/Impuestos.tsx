'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useImpuestos } from '@/hooks/useImpuestos';
import { Edit, Percent, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Impuesto, DeclaracionImpuesto } from '@/types/contabilidad.types';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

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

const ImpuestosDeclaraciones = ({ declaraciones, impuestos }: { declaraciones: DeclaracionImpuesto[], impuestos: Impuesto[] }) => {
    const getImpuestoNombre = (id: string) => impuestos.find(i => i.id === id)?.nombre || 'N/A';
    
    return (
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Declaraciones y Reportes</CardTitle>
                        <CardDescription>Historial de declaraciones de impuestos presentadas.</CardDescription>
                    </div>
                     <Dialog>
                        <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Nueva Declaración</Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Registrar Nueva Declaración</DialogTitle></DialogHeader> ... Formulario aquí ... </DialogContent>
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
    const { impuestos, declaraciones, actualizarImpuesto } = useImpuestos();
    
    return (
        <div className="space-y-6">
            <ImpuestosConfiguracion impuestos={impuestos} onUpdate={actualizarImpuesto} />
            <ImpuestosDeclaraciones declaraciones={declaraciones} impuestos={impuestos} />
        </div>
    );
}
