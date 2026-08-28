
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileBarChart, Lock, Info, Search } from 'lucide-react';

/**
 * @fileOverview Página de Informe de Diagnóstico Comercial - Fase 0 (Andamiaje).
 * Este módulo opera estrictamente en modo lectura para análisis estratégico.
 */
export default function DiagnosticoComercialPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Banner de Seguridad - Modo Solo Lectura */}
      <Alert className="bg-muted/50 border-primary/20 shadow-sm rounded-2xl border-2">
        <Lock className="h-4 w-4 text-primary" />
        <AlertTitle className="text-xs font-black uppercase tracking-widest text-primary">Modo de Seguridad</AlertTitle>
        <AlertDescription className="text-sm font-medium">
          🔒 Módulo en modo lectura — no modifica ni afecta tu operación comercial.
        </AlertDescription>
      </Alert>

      {/* Encabezado Principal y Contador de Fuentes */}
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
              <FileBarChart className="h-9 w-9 text-primary" />
              Informe de Diagnóstico Comercial
            </h1>
            <p className="text-muted-foreground font-medium italic">
              Análisis ejecutivo de la salud de tu negocio basado en datos históricos y operativos.
            </p>
          </div>
          <Badge variant="outline" className="h-10 px-6 rounded-xl border-2 font-black text-primary bg-white flex items-center gap-2 shadow-sm">
            <Search className="h-4 w-4" />
            Informe basado en [0] de 15 fuentes revisadas
          </Badge>
        </CardHeader>
      </Card>

      {/* Contenedor Base - Marcador de posición para las siguientes fases */}
      <Card className="border-2 border-dashed bg-muted/20 min-h-[400px] flex items-center justify-center rounded-[2rem]">
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-white rounded-3xl shadow-sm border w-fit mx-auto">
            <Info className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tighter">Preparando Diagnóstico Maestro</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Estamos configurando el motor de auditoría inteligente para procesar tu información de ventas, clientes y productos. Pronto verás aquí tus resultados estratégicos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer Informativo de la Fase 0 */}
      <footer className="pt-4 text-center">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
          Markix Intelligence Engine — Fase 0 (Andamiaje)
        </p>
      </footer>
    </div>
  );
}
