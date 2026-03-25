
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ConfiguracionKardex, MetodoValuacion, Bodega } from "@/types/inventario.types";
import { useState } from 'react';

interface KardexConfiguracionProps {
    config: ConfiguracionKardex;
    setConfig: React.Dispatch<React.SetStateAction<ConfiguracionKardex>>;
}

const mockBodegas: Bodega[] = [
    { id: 'b-01', nombre: 'Bodega Principal', totalProductos: 150, valorTotal: 15000000 },
    { id: 'b-02', nombre: 'Punto de Venta A', totalProductos: 75, valorTotal: 8500000 },
];

export default function KardexConfiguracion({ config, setConfig }: KardexConfiguracionProps) {
    const [bodegas, setBodegas] = useState<Bodega[]>(mockBodegas);

    const handleConfigChange = (field: keyof ConfiguracionKardex, value: any) => {
        setConfig(prev => ({...prev, [field]: value}));
    };
    
    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configuración General del Kardex</CardTitle>
                    <CardDescription>Define el comportamiento de tu sistema de inventario.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label>Método de Valuación de Inventario</Label>
                        <RadioGroup
                            value={config.metodoValuacion}
                            onValueChange={(value: MetodoValuacion) => handleConfigChange('metodoValuacion', value)}
                            className="mt-2"
                        >
                            <div className="flex items-center space-x-2"><RadioGroupItem value="promedio" id="promedio" /><Label htmlFor="promedio">Costo Promedio Ponderado</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="peps" id="peps" /><Label htmlFor="peps">PEPS (Primeras en Entrar, Primeras en Salir)</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="ueps" id="ueps" /><Label htmlFor="ueps">UEPS (Últimas en Entrar, Primeras en Salir)</Label></div>
                        </RadioGroup>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <Label htmlFor="asiento-auto" className="flex flex-col space-y-1">
                            <span>Generar Asiento Contable Automático</span>
                            <span className="font-normal leading-snug text-muted-foreground">Al guardar una venta, se creará el asiento de costo de ventas.</span>
                        </Label>
                        <Switch id="asiento-auto" checked={config.generarAsientoAutomatico} onCheckedChange={(val) => handleConfigChange('generarAsientoAutomatico', val)} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><Label>Cuenta de Inventario (PUC)</Label><Input value={config.cuentaInventario} onChange={(e) => handleConfigChange('cuentaInventario', e.target.value)} /></div>
                        <div><Label>Cuenta de Costo de Ventas (PUC)</Label><Input value={config.cuentaCostoVentas} onChange={(e) => handleConfigChange('cuentaCostoVentas', e.target.value)} /></div>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Switch id="alertas-stock" checked={config.alertasStockMinimo} onCheckedChange={(val) => handleConfigChange('alertasStockMinimo', val)} />
                        <Label htmlFor="alertas-stock">Activar alertas de stock mínimo</Label>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Gestión de Bodegas</CardTitle>
                    <CardDescription>Administra las ubicaciones de tu inventario.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow><TableHead>Nombre</TableHead><TableHead>Acciones</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {bodegas.map(bodega => (
                                <TableRow key={bodega.id}>
                                    <TableCell>{bodega.nombre}</TableCell>
                                    <TableCell><Button variant="outline" size="sm">Editar</Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
