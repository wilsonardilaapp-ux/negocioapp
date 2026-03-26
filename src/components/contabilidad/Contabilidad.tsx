'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventarioKardex from './InventarioKardex';
import PlanDeCuentas from './secciones/PlanDeCuentas';
import AsientosContables from './secciones/AsientosContables';
import Impuestos from './secciones/Impuestos';
import Reportes from './secciones/Reportes';
import ConciliacionBancaria from './secciones/ConciliacionBancaria';
import { useInventarioKardex } from '@/hooks/useInventarioKardex';
import ActivosFijos from './secciones/ActivosFijos';

const PlaceholderSection = ({ title }: { title: string }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Esta sección está en construcción.</CardDescription>
        </CardHeader>
        <CardContent>
            <p>El contenido para "{title}" estará disponible próximamente.</p>
        </CardContent>
    </Card>
);

const sections = [
  { id: 'asientos', label: 'Asientos' },
  { id: 'cuentas', label: 'Cuentas' },
  { id: 'inventario_kardex', label: 'Inventario' },
  { id: 'activos_fijos', label: 'Activos Fijos' },
  { id: 'impuestos', label: 'Impuestos' },
  { id: 'conciliacion', label: 'Conciliación' },
  { id: 'reportes', label: 'Reportes' },
];

export default function Contabilidad() {
  const kardexData = useInventarioKardex();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Módulo de Contabilidad</CardTitle>
          <CardDescription>
            Gestiona la contabilidad de tu negocio de forma integral.
          </CardDescription>
        </CardHeader>
      </Card>
      <Tabs defaultValue="asientos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-7">
          {sections.map(section => (
            <TabsTrigger key={section.id} value={section.id}>
                {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="asientos"><AsientosContables /></TabsContent>
        <TabsContent value="cuentas"><PlanDeCuentas /></TabsContent>
        <TabsContent value="inventario_kardex"><InventarioKardex kardexData={kardexData} /></TabsContent>
        <TabsContent value="activos_fijos"><ActivosFijos /></TabsContent>
        <TabsContent value="impuestos"><Impuestos /></TabsContent>
        <TabsContent value="conciliacion"><ConciliacionBancaria /></TabsContent>
        <TabsContent value="reportes"><Reportes /></TabsContent>
      </Tabs>
    </div>
  );
}
