'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventarioKardex from './InventarioKardex';
import KardexResumen from './secciones/KardexResumen';
import { useInventarioKardex } from '@/hooks/useInventarioKardex';

// Placeholder para las secciones existentes
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
  { id: 'resumen', label: 'Resumen' },
  { id: 'cuentas', label: 'Cuentas' },
  { id: 'asientos', label: 'Asientos' },
  { id: 'impuestos', label: 'Impuestos' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'conciliacion', label: 'Conciliación' },
  { id: 'activos_fijos', label: 'Activos Fijos' },
  { id: 'inventario_kardex', label: 'Inventario Kardex' },
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
      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8">
          {sections.map(section => (
            <TabsTrigger key={section.id} value={section.id}>
                {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map(section => (
            <TabsContent key={section.id} value={section.id}>
                {section.id === 'inventario_kardex' ? (
                    <InventarioKardex />
                ) : section.id === 'resumen' ? (
                    <KardexResumen resumen={kardexData.resumen} />
                ) : (
                    <PlaceholderSection title={section.label} />
                )}
            </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
