// src/app/(admin)/superadmin/pistola-scanner/components/TarjetaDispositivo.tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BadgeEstado } from './BadgeEstado';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PistolaScanner } from '@/models/pistolaScanner';
import { ScanLine, Settings, TestTube2 } from 'lucide-react';

interface TarjetaDispositivoProps {
  pistola: PistolaScanner;
  onConfigurar: (id: string) => void;
  onProbar: (id: string) => void;
}

export default function TarjetaDispositivo({ pistola, onConfigurar, onProbar }: TarjetaDispositivoProps) {
  const ultimaLecturaFormateada = pistola.ultimaLectura
    ? formatDistanceToNow(pistola.ultimaLectura, { addSuffix: true, locale: es })
    : 'Nunca';

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            {pistola.nombre}
          </CardTitle>
          <BadgeEstado estado={pistola.estado} />
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm">
        <p className="text-muted-foreground">{pistola.modelo}</p>
        <p><span className="font-semibold">N/S:</span> {pistola.numeroSerie}</p>
        <p><span className="font-semibold">Conexión:</span> {pistola.tipoConexion} ({pistola.puerto})</p>
        <p><span className="font-semibold">Terminal:</span> {pistola.terminalAsignada}</p>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <p><span className="font-semibold">Lecturas hoy:</span> {pistola.lecturasHoy}</p>
          <p><span className="font-semibold">Errores hoy:</span> {pistola.erroresHoy}</p>
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t">Última lectura: {ultimaLecturaFormateada}</p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="w-full" onClick={() => onConfigurar(pistola.id)}>
            <Settings className="mr-2 h-4 w-4" /> Configurar
        </Button>
        <Button className="w-full" onClick={() => onProbar(pistola.id)}>
            <TestTube2 className="mr-2 h-4 w-4" /> Probar
        </Button>
      </CardFooter>
    </Card>
  );
}
