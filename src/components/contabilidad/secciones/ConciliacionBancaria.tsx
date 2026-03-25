'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useConciliacion } from '@/hooks/useConciliacion';
import { Link, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export default function ConciliacionBancaria() {
    const { movimientosLibro, extractoBancario, conciliarPartida } = useConciliacion();
    const [selectedLibro, setSelectedLibro] = useState<string | null>(null);
    const [selectedExtracto, setSelectedExtracto] = useState<string | null>(null);
    const { toast } = useToast();

    const handleConciliar = () => {
        if (selectedLibro && selectedExtracto) {
            conciliarPartida(selectedLibro, selectedExtracto);
            toast({ title: 'Partida Conciliada', description: 'El movimiento ha sido marcado como conciliado.' });
            setSelectedLibro(null);
            setSelectedExtracto(null);
        } else {
            toast({ variant: 'destructive', title: 'Selección incompleta', description: 'Debes seleccionar un movimiento de libros y uno del extracto.' });
        }
    };
    
    const saldoLibros = movimientosLibro.reduce((acc, mov) => acc + mov.debito - mov.credito, 0);
    const saldoExtracto = extractoBancario.reduce((acc, mov) => acc + mov.monto, 0);
    const diferencia = saldoLibros - saldoExtracto;

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                {/* Libros Contables */}
                <Card>
                    <CardHeader><CardTitle>Movimientos en Libros</CardTitle></CardHeader>
                    <CardContent>
                        <div className="rounded-md border h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[20px]"></TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movimientosLibro.map(mov => (
                                        <TableRow key={mov.id} className={cn(mov.esConciliado && "bg-green-50 text-muted-foreground", selectedLibro === mov.id && "bg-blue-50")}>
                                            <TableCell>
                                                <Checkbox checked={selectedLibro === mov.id} onCheckedChange={() => setSelectedLibro(prev => prev === mov.id ? null : mov.id)} disabled={mov.esConciliado}/>
                                            </TableCell>
                                            <TableCell>{mov.descripcion}</TableCell>
                                            <TableCell className={cn("text-right", mov.debito > 0 ? 'text-green-600' : 'text-red-600')}>
                                                {formatCurrency(mov.debito > 0 ? mov.debito : -mov.credito)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Extracto Bancario */}
                <Card>
                    <CardHeader><CardTitle>Extracto Bancario</CardTitle></CardHeader>
                    <CardContent>
                        <div className="rounded-md border h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[20px]"></TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {extractoBancario.map(mov => (
                                        <TableRow key={mov.id} className={cn(mov.esConciliado && "bg-green-50 text-muted-foreground", selectedExtracto === mov.id && "bg-blue-50")}>
                                            <TableCell>
                                                <Checkbox checked={selectedExtracto === mov.id} onCheckedChange={() => setSelectedExtracto(prev => prev === mov.id ? null : mov.id)} disabled={mov.esConciliado}/>
                                            </TableCell>
                                            <TableCell>{mov.descripcion}</TableCell>
                                            <TableCell className={cn("text-right", mov.monto > 0 ? 'text-green-600' : 'text-red-600')}>
                                                {formatCurrency(mov.monto)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Acciones de Conciliación</CardTitle>
                    <Button onClick={handleConciliar} disabled={!selectedLibro || !selectedExtracto}><Link className="mr-2 h-4 w-4"/>Conciliar Seleccionados</Button>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                     <Card>
                        <CardHeader><CardTitle className="text-base">Saldo en Libros</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{formatCurrency(saldoLibros)}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-base">Saldo en Extracto</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{formatCurrency(saldoExtracto)}</p></CardContent>
                    </Card>
                     <Card className={cn(diferencia !== 0 && "border-destructive")}>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2">Diferencia {diferencia !== 0 && <AlertCircle className="text-destructive"/>}</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{formatCurrency(diferencia)}</p></CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}
