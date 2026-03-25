'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, BarChart2, BookOpen, Loader2, Download, Printer } from 'lucide-react';
import { useReportesContables } from '@/hooks/useReportesContables';
import type { TipoReporte, ReporteContable, Cuenta } from '@/types/contabilidad.types';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const ReportViewer = ({ reporte }: { reporte: ReporteContable }) => {
    if (reporte.tipo === 'balance_general') {
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cuenta</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reporte.datos.map((grupo: { categoria: string; cuentas: Cuenta[]; total: number }) => (
                        <React.Fragment key={grupo.categoria}>
                            <TableRow className="bg-muted font-bold">
                                <TableCell>{grupo.categoria.toUpperCase()}</TableCell>
                                <TableCell className="text-right">{formatCurrency(grupo.total)}</TableCell>
                            </TableRow>
                            {grupo.cuentas.map(cuenta => (
                                <TableRow key={cuenta.id}><TableCell className="pl-8">{cuenta.codigo} - {cuenta.nombre}</TableCell><TableCell className="text-right">{formatCurrency(cuenta.saldo)}</TableCell></TableRow>
                            ))}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        );
    }

    if (reporte.tipo === 'estado_resultados') {
         return (
            <Table>
                <TableBody>
                    {reporte.datos.map((item: { concepto: string, valor: number }, i) => (
                        <TableRow key={i}><TableCell>{item.concepto}</TableCell><TableCell className="text-right">{formatCurrency(item.valor)}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2"><TableCell>Utilidad Bruta</TableCell><TableCell className="text-right">{formatCurrency(reporte.totales.utilidadBruta)}</TableCell></TableRow>
                    <TableRow className="font-bold"><TableCell>Utilidad Neta</TableCell><TableCell className="text-right">{formatCurrency(reporte.totales.utilidadNeta)}</TableCell></TableRow>
                </TableBody>
            </Table>
        );
    }
    
    return <p>Tipo de reporte no soportado.</p>
};

export default function Reportes() {
    const [tipoReporte, setTipoReporte] = useState<TipoReporte>('balance_general');
    const today = new Date().toISOString().split('T')[0];
    const [fechaInicio, setFechaInicio] = useState(today);
    const [fechaFin, setFechaFin] = useState(today);
    const { reporteActual, generarReporte, isLoading } = useReportesContables();

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Generador de Reportes</CardTitle>
                        <CardDescription>Selecciona los parámetros para generar un reporte contable.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div><Label>Tipo de Reporte</Label><Select value={tipoReporte} onValueChange={(v: TipoReporte) => setTipoReporte(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="balance_general">Balance General</SelectItem><SelectItem value="estado_resultados">Estado de Resultados</SelectItem><SelectItem value="libro_diario">Libro Diario</SelectItem></SelectContent></Select></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Fecha Inicio</Label><Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>
                            <div><Label>Fecha Fin</Label><Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} /></div>
                        </div>
                        <Button className="w-full" onClick={() => generarReporte(tipoReporte, fechaInicio, fechaFin)} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BarChart2 className="mr-2 h-4 w-4"/>}
                            Generar Reporte
                        </Button>
                    </CardContent>
                </Card>
            </div>
             <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                         <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Vista Previa del Reporte</CardTitle>
                                {reporteActual && <CardDescription>Reporte de {reporteActual.tipo.replace('_', ' ')} generado el {new Date(reporteActual.fechaGeneracion).toLocaleString()}</CardDescription>}
                            </div>
                            {reporteActual && <div className="flex gap-2"><Button variant="outline" size="sm"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button><Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4"/>Descargar</Button></div>}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : reporteActual ? (
                            <ReportViewer reporte={reporteActual} />
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                                <BookOpen className="h-12 w-12 mb-4"/>
                                <h3 className="font-semibold">Selecciona los parámetros y genera un reporte para visualizarlo aquí.</h3>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
