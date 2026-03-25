'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { PlusCircle, Building, Calendar, DollarSign, TrendingDown, BookOpen } from "lucide-react";
import { useActivosFijos } from '@/hooks/useActivosFijos';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export default function ActivosFijos() {
    const { activos, totalValorEnLibros, totalCostoInicial, totalDepreciacionAcumulada } = useActivosFijos();

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
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Añadir Activo Fijo</Button>
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
