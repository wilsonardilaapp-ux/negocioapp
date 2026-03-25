
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ConfiguracionKardex, MetodoValuacion, Bodega } from '@/types/kardex.types';

interface KardexConfiguracionProps {
    config: ConfiguracionKardex;
    setConfig: (config: ConfiguracionKardex) => void;
    bodegas: Bodega[];
}

export default function KardexConfiguracion({ config, setConfig, bodegas }: KardexConfiguracionProps) {

    const handleConfigChange = (field: keyof ConfiguracionKardex, value: any) => {
        setConfig({...config, [field]: value});
    };
    
    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle>Configuración General del Kardex</CardTitle><CardDescription>Define el comportamiento de tu sistema de inventario.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <div><Label>Método de Valuación de Inventario</Label><RadioGroup value={config.metodoValuacion} onValueChange={(value: MetodoValuacion) => handleConfigChange('metodoValuacion', value)} className="mt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="promedio_ponderado" id="promedio_ponderado" /><Label htmlFor="promedio_ponderado">Costo Promedio Ponderado</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="peps" id="peps" /><Label htmlFor="peps">PEPS (Primeras en Entrar, Primeras en Salir)</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="ueps" id="ueps" /><Label htmlFor="ueps">UEPS (Últimas en Entrar, Primeras en Salir)</Label></div>
                    </RadioGroup></div>
                    <div className="flex items-center justify-between rounded-lg border p-4"><Label htmlFor="asiento-auto" className="flex flex-col space-y-1"><span>Generar Asiento Contable Automático</span><span className="font-normal leading-snug text-muted-foreground">Al guardar una venta, se creará el asiento de costo de ventas.</span></Label><Switch id="asiento-auto" checked={config.generarAsientoAutomatico} onCheckedChange={(val) => handleConfigChange('generarAsientoAutomatico', val)} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Cuenta de Inventario (PUC)</Label><Input value={config.cuentaInventarioPUC} onChange={(e) => handleConfigChange('cuentaInventarioPUC', e.target.value)} /></div>
                        <div><Label>Cuenta de Costo de Ventas (PUC)</Label><Input value={config.cuentaCostoVentasPUC} onChange={(e) => handleConfigChange('cuentaCostoVentasPUC', e.target.value)} /></div>
                    </div>
                    <div className="flex items-center space-x-2"><Switch id="alertas-stock" checked={config.alertasStockMinimo} onCheckedChange={(val) => handleConfigChange('alertasStockMinimo', val)} /><Label htmlFor="alertas-stock">Activar alertas de stock mínimo</Label></div>
                    <div className="flex items-center space-x-2"><Switch id="stock-negativo" checked={config.permitirStockNegativo} onCheckedChange={(val) => handleConfigChange('permitirStockNegativo', val)} /><Label htmlFor="stock-negativo">Permitir stock negativo</Label></div>
                    <Button className="w-full">Guardar Configuración</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Gestión de Bodegas</CardTitle><CardDescription>Administra las ubicaciones de tu inventario.</CardDescription></CardHeader>
                <CardContent><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>
                    {bodegas.map(bodega => (<TableRow key={bodega.id}><TableCell>{bodega.nombre}</TableCell><TableCell>{bodega.descripcion}</TableCell><TableCell><Button variant="outline" size="sm">Editar</Button></TableCell></TableRow>))}
                </TableBody></Table></CardContent>
            </Card>
        </div>
    );
}
