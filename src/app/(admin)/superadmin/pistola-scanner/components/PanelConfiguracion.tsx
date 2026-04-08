// src/app/(admin)/superadmin/pistola-scanner/components/PanelConfiguracion.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { PistolaScanner, ConfiguracionScanner, SufijoTrama } from '@/models/pistolaScanner';
import { Power, Trash2, TestTube2, Save } from 'lucide-react';
import { BadgeEstado } from './BadgeEstado';

interface PanelConfiguracionProps {
  pistola: PistolaScanner;
  onGuardar: (id: string, config: ConfiguracionScanner) => void;
  onDesconectar: (id: string) => void;
  onEliminar: (id: string) => void;
  onSimularLectura: (id: string) => void;
  ultimaLecturaSimulada: string | null;
}

const sufijos: SufijoTrama[] = ['Enter (CR)', 'Tab', 'Ninguno', 'CR + LF'];

export default function PanelConfiguracion({ pistola, onGuardar, onDesconectar, onEliminar, onSimularLectura, ultimaLecturaSimulada }: PanelConfiguracionProps) {
  const [config, setConfig] = useState<ConfiguracionScanner>(pistola.configuracion);

  const handleToggle = (field: keyof ConfiguracionScanner, value: boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: keyof ConfiguracionScanner, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader><CardTitle>Tipos de Código Soportados</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            {Object.keys(config).filter(k => typeof config[k as keyof typeof config] === 'boolean' && k.startsWith('codigo')).map(key => (
              <div key={key} className="flex items-center space-x-2"><Switch id={key} checked={config[key as keyof typeof config] as boolean} onCheckedChange={v => handleToggle(key as keyof ConfiguracionScanner, v)} /><Label htmlFor={key}>{key}</Label></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Comportamiento POS</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2"><Switch id="autoAgregar" checked={config.autoAgregarProducto} onCheckedChange={v => handleToggle('autoAgregarProducto', v)} /><Label htmlFor="autoAgregar">Auto agregar producto</Label></div>
            <div className="flex items-center space-x-2"><Switch id="sonido" checked={config.sonidoConfirmacion} onCheckedChange={v => handleToggle('sonidoConfirmacion', v)} /><Label htmlFor="sonido">Sonido de confirmación</Label></div>
            <div className="flex items-center space-x-2"><Switch id="vibracion" checked={config.vibracion} onCheckedChange={v => handleToggle('vibracion', v)} /><Label htmlFor="vibracion">Vibración</Label></div>
            <div className="flex items-center space-x-2"><Switch id="modoInventario" checked={config.modoInventarioContinuo} onCheckedChange={v => handleToggle('modoInventarioContinuo', v)} /><Label htmlFor="modoInventario">Modo inventario continuo</Label></div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Formato de Trama</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
                <div><Label htmlFor="prefijo">Prefijo</Label><Input id="prefijo" value={config.prefijo} onChange={e => handleInputChange('prefijo', e.target.value)} /></div>
                <div><Label htmlFor="sufijo">Sufijo</Label><Select value={config.sufijo} onValueChange={(v: SufijoTrama) => handleInputChange('sufijo', v)}><SelectTrigger id="sufijo"><SelectValue/></SelectTrigger><SelectContent>{sufijos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </CardContent>
        </Card>
      </div>
      <div className="md:col-span-1 space-y-6">
        <Card>
          <CardHeader><CardTitle>Información</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Marca:</strong> {pistola.marca}</p>
            <p><strong>Modelo:</strong> {pistola.modelo}</p>
            <p><strong>Firmware:</strong> {pistola.firmware}</p>
            <p><strong>Batería:</strong> {pistola.bateria !== null ? `${pistola.bateria}%` : 'N/A'}</p>
            <Separator className="my-2" />
            <div className="flex justify-between items-center"><p><strong>Estado:</strong></p> <BadgeEstado estado={pistola.estado} /></div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Prueba de Lectura</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <Button className="w-full" onClick={() => onSimularLectura(pistola.id)}><TestTube2 className="mr-2 h-4 w-4" /> Simular Lectura</Button>
                <div className="p-3 bg-muted rounded-md text-center">
                    <Label>Última lectura simulada</Label>
                    <p className="font-mono text-lg">{ultimaLecturaSimulada || '---'}</p>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle className="text-destructive">Zona de Peligro</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                 <Button variant="outline" className="w-full" onClick={() => onGuardar(pistola.id, config)}>
                    <Save className="mr-2 h-4 w-4" /> Guardar Configuración
                </Button>
                <Button variant="outline" className="w-full" onClick={() => onDesconectar(pistola.id)}><Power className="mr-2 h-4 w-4" /> Forzar Desconexión</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" className="w-full"><Trash2 className="mr-2 h-4 w-4" /> Eliminar Dispositivo</Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Esta acción eliminará permanentemente la pistola "{pistola.nombre}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onEliminar(pistola.id)}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
