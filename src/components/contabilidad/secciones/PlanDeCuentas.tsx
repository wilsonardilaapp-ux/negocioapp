'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { usePlanDeCuentas } from '@/hooks/usePlanDeCuentas';
import type { Cuenta, TipoCuenta } from '@/types/contabilidad.types';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export default function PlanDeCuentas() {
    const { cuentas } = usePlanDeCuentas();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<TipoCuenta | 'all'>('all');

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
            case 'Ingresos': return 'default'; // Success would be better, but default is ok
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
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Cuenta
                    </Button>
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
                            {filteredCuentas.length > 0 ? filteredCuentas.map(cuenta => (
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
                            )) : (
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
