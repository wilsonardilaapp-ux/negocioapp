const fs = require('fs');

// 1. Crear src/jev/JevCopilotWidgetClientesNuevos.tsx
const widgetCode = `'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  obtenerCopilotoClientesNuevos,
  consultarJevClientesNuevos,
  registrarSugerenciaClientesEjecutada,
  CopilotoClientesNuevosOutput,
  SugerenciaCliente,
} from './jevEngineClientesNuevos';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Bot,
  X,
  Sparkles,
  Users,
  MessageSquare,
  AlertTriangle,
  Upload,
  Send,
  Loader2,
  RefreshCw,
  History,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JevCopilotWidgetClientesNuevosProps {
  businessId?: string;
  onAbrirCampanaConIds?: (ids: string[]) => void;
  onAbrirImportar?: () => void;
}

export function JevCopilotWidgetClientesNuevos({
  businessId,
  onAbrirCampanaConIds,
  onAbrirImportar,
}: JevCopilotWidgetClientesNuevosProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<CopilotoClientesNuevosOutput | null>(null);
  const [isLoading, startTransition] = useTransition();

  // Chat Preguntas
  const [chatPregunta, setChatPregunta] = useState('');
  const [chatRespuesta, setChatRespuesta] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);

  // Modal Confirmación Sugerencia
  const [sugerenciaPendiente, setSugerenciaPendiente] = useState<SugerenciaCliente | null>(null);
  const [isExecutingSugerencia, setIsExecutingSugerencia] = useState(false);

  const { toast } = useToast();

  const cargarCopiloto = () => {
    if (!businessId) return;
    startTransition(async () => {
      try {
        const resultado = await obtenerCopilotoClientesNuevos(businessId);
        setData(resultado);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error JEV Copiloto',
          description: e.message || 'No se pudo cargar el análisis.',
        });
      }
    });
  };

  useEffect(() => {
    if (isOpen && !data && businessId) {
      cargarCopiloto();
    }
  }, [isOpen, businessId]);

  const handlePreguntarChat = async (preguntaTexto?: string) => {
    const q = preguntaTexto || chatPregunta;
    if (!businessId || !q.trim()) return;

    setIsAnswering(true);
    setChatRespuesta(null);
    try {
      const r = await consultarJevClientesNuevos(businessId, q);
      setChatRespuesta(r);
      if (!preguntaTexto) setChatPregunta('');
    } catch (e: any) {
      setChatRespuesta('No se pudo procesar la pregunta.');
    } finally {
      setIsAnswering(false);
    }
  };

  const handleConfirmarSugerencia = async () => {
    if (!sugerenciaPendiente || !businessId) return;
    setIsExecutingSugerencia(true);

    try {
      await registrarSugerenciaClientesEjecutada({
        businessId,
        sugerenciaId: sugerenciaPendiente.id,
        detalle: sugerenciaPendiente.titulo,
      });

      if (sugerenciaPendiente.accionTipo === 'campana_bienvenida' && onAbrirCampanaConIds) {
        onAbrirCampanaConIds(sugerenciaPendiente.destinatariosSugeridosIds || []);
      } else if (sugerenciaPendiente.accionTipo === 'importar_mas' && onAbrirImportar) {
        onAbrirImportar();
      }

      toast({
        title: '✅ Sugerencia aplicada',
        description: 'La acción fue abierta y registrada en la memoria JEV.',
      });

      setSugerenciaPendiente(null);
      setIsOpen(false);
      cargarCopiloto();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo aplicar la sugerencia.',
      });
    } finally {
      setIsExecutingSugerencia(false);
    }
  };

  if (!businessId) return null;

  const totalAlertas = data?.alertas?.length || 0;

  return (
    <>
      {/* Botón Flotante JEV Copilot */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-12 px-4 shadow-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 border-2 border-white/80 animate-in fade-in"
        >
          <Bot className="w-5 h-5" />
          <span>JEV Clientes Nuevos</span>
          {totalAlertas > 0 && (
            <span className="bg-amber-400 text-amber-950 text-xs px-1.5 py-0.5 rounded-full font-black">
              {totalAlertas}
            </span>
          )}
        </Button>
      </div>

      {/* Drawer Lateral Deslizante */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white shadow-2xl border-l flex flex-col animate-in slide-in-from-right duration-300">
          {/* Cabecera */}
          <div className="p-4 border-b bg-emerald-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-900 leading-tight">JEV Copilot — Clientes Nuevos</h3>
                <p className="text-[11px] text-muted-foreground">Diagnóstico, activación y memoria</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={cargarCopiloto}
                disabled={isLoading}
                className="h-8 w-8 text-gray-500 hover:text-gray-900"
              >
                <RefreshCw className={`w-3.5 h-3.5 \${isLoading ? 'animate-spin' : ''}\`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Contenido con Scroll */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs font-medium">JEV está analizando el estado de tus contactos...</span>
              </div>
            ) : data ? (
              <Tabs defaultValue="quieres" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="quieres" className="text-xs font-bold">
                    Quiéres
                  </TabsTrigger>
                  <TabsTrigger value="sugerencias" className="text-xs font-bold relative">
                    Sugerencias
                    {data.sugerencias.length > 0 && (
                      <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                        {data.sugerencias.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="preguntas" className="text-xs font-bold">
                    Preguntas
                  </TabsTrigger>
                </TabsList>

                {/* 1. PESTAÑA: QUIÉRES (Diagnóstico y Alertas) */}
                <TabsContent value="quieres" className="space-y-3">
                  <Card className="border-emerald-100 bg-emerald-50/30">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Resumen de Contactos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-white rounded-xl border">
                          <span className="text-[10px] text-muted-foreground block">Total Clientes</span>
                          <span className="text-base font-black text-gray-900">{data.totalContactos}</span>
                        </div>
                        <div className="p-2 bg-white rounded-xl border">
                          <span className="text-[10px] text-muted-foreground block">Sin Campaña</span>
                          <span className="text-base font-black text-amber-600">{data.sinCampanaCount}</span>
                        </div>
                        <div className="p-2 bg-white rounded-xl border">
                          <span className="text-[10px] text-muted-foreground block">Origen CSV</span>
                          <span className="text-xs font-bold text-gray-800">{data.totalCsv}</span>
                        </div>
                        <div className="p-2 bg-white rounded-xl border">
                          <span className="text-[10px] text-muted-foreground block">Origen Manual</span>
                          <span className="text-xs font-bold text-gray-800">{data.totalManual}</span>
                        </div>
                      </div>

                      {data.sinWhatsAppCount > 0 && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{data.sinWhatsAppCount} contacto(s) no tienen número de WhatsApp válido.</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Alertas Accionables */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Alertas Accionables</h4>
                    {data.alertas.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 bg-gray-50 rounded-xl">
                        Todo al día. No hay alertas críticas de clientes nuevos.
                      </p>
                    ) : (
                      data.alertas.map((alerta, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-xl border border-gray-200 flex items-start gap-2 shadow-2xs"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs font-medium text-gray-800 leading-snug">{alerta}</p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* 2. PESTAÑA: SUGERENCIAS */}
                <TabsContent value="sugerencias" className="space-y-3">
                  {data.sugerencias.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-4 bg-gray-50 rounded-2xl text-center">
                      No hay sugerencias pendientes en este momento.
                    </p>
                  ) : (
                    data.sugerencias.map((sug) => (
                      <Card key={sug.id} className="border-gray-200 shadow-2xs">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-bold text-xs text-gray-900">{sug.titulo}</h5>
                            <Badge variant="outline" className="text-[9px] font-bold uppercase shrink-0">
                              {sug.impactoEstimado}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{sug.descripcion}</p>
                          <p className="text-[10px] text-emerald-700 font-mono bg-emerald-50/60 p-1.5 rounded-lg">
                            📊 {sug.datosRespaldo}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setSugerenciaPendiente(sug)}
                            className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white mt-1 h-8"
                          >
                            <span>Aplicar Sugerencia</span>
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* 3. PESTAÑA: PREGUNTAS (Chat) */}
                <TabsContent value="preguntas" className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground font-medium">Preguntas frecuentes rápidas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreguntarChat('¿cuántos clientes nuevos tengo?')}
                        className="text-[11px] h-7 px-2 font-medium"
                      >
                        ¿cuántos clientes nuevos tengo?
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreguntarChat('¿a quiénes no les he enviado campaña?')}
                        className="text-[11px] h-7 px-2 font-medium"
                      >
                        ¿a quiénes no les he enviado campaña?
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreguntarChat('¿cuántos clientes llegaron este mes?')}
                        className="text-[11px] h-7 px-2 font-medium"
                      >
                        ¿cuántos clientes llegaron este mes?
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Input
                      placeholder="Escribe tu pregunta sobre clientes..."
                      value={chatPregunta}
                      onChange={(e) => setChatPregunta(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePreguntarChat()}
                      className="h-9 text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => handlePreguntarChat()}
                      disabled={isAnswering || !chatPregunta.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-3"
                    >
                      {isAnswering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>

                  {chatRespuesta && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-1 text-gray-800">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Respuesta JEV:</span>
                      </div>
                      <p className="whitespace-pre-wrap">{chatRespuesta}</p>
                    </div>
                  )}
                </TabsContent>

                {/* SECCIÓN MEMORIA JEV AL FINAL */}
                <div className="pt-4 border-t mt-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <History className="w-3.5 h-3.5 text-emerald-600" />
                    <span>MEMORIA JEV (Aprendizaje y Hallazgos)</span>
                  </div>
                  {data.patronesAprendidos.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">
                      Sin historial de hallazgos previos en memoria.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {data.patronesAprendidos.map((pat, i) => (
                        <p key={i} className="text-[11px] text-gray-700 bg-gray-50 p-2 rounded-xl border">
                          💡 {pat}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </Tabs>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Sugerencia */}
      <Dialog open={!!sugerenciaPendiente} onOpenChange={() => setSugerenciaPendiente(null)}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-white shadow-2xl border-0">
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-black text-gray-900">
              Confirmar Acción de Copiloto
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 pt-1">
              ¿Deseas aplicar la sugerencia: <strong className="text-gray-900">{sugerenciaPendiente?.titulo}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground">
            Al confirmar, se abrirá el modal correspondiente pre-configurado y la acción quedará registrada en la memoria de JEV.
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSugerenciaPendiente(null)}
              disabled={isExecutingSugerencia}
              className="text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarSugerencia}
              disabled={isExecutingSugerencia}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              {isExecutingSugerencia && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Sí, continuar</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
`;
fs.writeFileSync('src/jev/JevCopilotWidgetClientesNuevos.tsx', widgetCode, 'utf8');
console.log('✅ Archivo nuevo creado: src/jev/JevCopilotWidgetClientesNuevos.tsx');

// 2. Modificar src/jev/jevEngineClientesNuevos.ts (agregar lógica del copiloto)
const enginePath = 'src/jev/jevEngineClientesNuevos.ts';
if (fs.existsSync(enginePath)) {
  let engine = fs.readFileSync(enginePath, 'utf8');
  if (!fs.existsSync(enginePath + '.bak2')) {
    fs.writeFileSync(enginePath + '.bak2', engine, 'utf8');
  }

  if (!engine.includes('obtenerCopilotoClientesNuevos')) {
    const importHook = "import { getClientesNuevosContext, ContextoClientesNuevos, ContactoJev } from './contextAggregatorClientesNuevos';\n";
    if (!engine.includes('getClientesNuevosContext')) {
      engine = importHook + engine;
    }

    const copilotSnippet = `
export interface SugerenciaCliente {
  id: string;
  titulo: string;
  descripcion: string;
  accionTipo: 'campana_bienvenida' | 'importar_mas' | 'revisar_sin_whatsapp';
  impactoEstimado: string;
  datosRespaldo: string;
  destinatariosSugeridosIds?: string[];
}

export interface CopilotoClientesNuevosOutput {
  diagnostico: string;
  totalContactos: number;
  totalCsv: number;
  totalManual: number;
  sinCampanaCount: number;
  sinWhatsAppCount: number;
  inactivosMasDe15DiasCount: number;
  alertas: string[];
  sugerencias: SugerenciaCliente[];
  patronesAprendidos: string[];
  historialMemoria: any[];
  fechaGeneracion: string;
}

/**
 * Motor del Copiloto de Clientes Nuevos (Regla: Solo lee agregador existente, cero Firestore directo).
 */
export async function obtenerCopilotoClientesNuevos(businessId: string): Promise<CopilotoClientesNuevosOutput> {
  const contexto = await getClientesNuevosContext(businessId);
  const contactos = contexto.contactos || [];

  const totalCsv = contactos.filter((c) => c.origen === 'Importado CSV').length;
  const totalManual = contactos.filter((c) => c.origen === 'Manual').length;
  const sinCampana = contactos.filter((c) => !c.campanaEnviada);
  const sinWhatsApp = contactos.filter((c) => !c.tieneWhatsApp);

  const ahora = Date.now();
  const inactivosMasDe15Dias = sinCampana.filter((c) => {
    if (!c.createdAt) return false;
    const diffDias = (ahora - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return diffDias > 15;
  });

  const alertas: string[] = [];
  if (sinCampana.length > 0) {
    alertas.push(\`\${sinCampana.length} de \${contactos.length} clientes nunca recibieron una campaña.\`);
  }
  if (inactivosMasDe15Dias.length > 0) {
    alertas.push(\`\${inactivosMasDe15Dias.length} clientes importados hace más de 15 días siguen sin contacto.\`);
  }
  if (sinWhatsApp.length > 0) {
    alertas.push(\`\${sinWhatsApp.length} cliente(s) registrados no tienen número de WhatsApp válido.\`);
  }

  const sugerencias: SugerenciaCliente[] = [];
  if (sinCampana.length > 0) {
    sugerencias.push({
      id: 'sug-bienvenida',
      titulo: \`Enviar campaña de bienvenida a los \${sinCampana.length} clientes sin contacto\`,
      descripcion: 'Pre-selecciona a todos los contactos que aún no han recibido campañas y abre el envío masivo.',
      accionTipo: 'campana_bienvenida',
      impactoEstimado: 'Alto impacto',
      datosRespaldo: \`\${sinCampana.length} contactos pendientes de bienvenida\`,
      destinatariosSugeridosIds: sinCampana.map((c) => c.id),
    });
  }

  if (sinWhatsApp.length > 0) {
    sugerencias.push({
      id: 'sug-sin-whatsapp',
      titulo: 'Reintentar o validar clientes Sin WhatsApp',
      descripcion: 'Completa o corrige el número telefónico para incorporarlos al canal de ventas por WhatsApp.',
      accionTipo: 'revisar_sin_whatsapp',
      impactoEstimado: 'Recuperación',
      datosRespaldo: \`\${sinWhatsApp.length} contacto(s) descartados por número corto\`,
    });
  }

  sugerencias.push({
    id: 'sug-importar',
    titulo: 'Importar más contactos (CSV)',
    descripcion: 'Aumenta tu base de clientes subiendo listas de pedidos o clientes anteriores.',
    accionTipo: 'importar_mas',
    impactoEstimado: 'Crecimiento',
    datosRespaldo: \`Base actual: \${contactos.length} contactos totales\`,
  });

  const patronesAprendidos: string[] = [];
  if (contexto.historialMemoria && contexto.historialMemoria.length > 0) {
    patronesAprendidos.push(
      \`JEV recuerda \${contexto.historialMemoria.length} acción(es) registrada(s) en este módulo.\`
    );
  } else {
    patronesAprendidos.push('Sin historial de hallazgos previos en memoria.');
  }

  return {
    diagnostico: \`Base de \${contactos.length} clientes analizada.\`,
    totalContactos: contactos.length,
    totalCsv,
    totalManual,
    sinCampanaCount: sinCampana.length,
    sinWhatsAppCount: sinWhatsApp.length,
    inactivosMasDe15DiasCount: inactivosMasDe15Dias.length,
    alertas,
    sugerencias,
    patronesAprendidos,
    historialMemoria: contexto.historialMemoria || [],
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Chat interactivo del copiloto de clientes.
 */
export async function consultarJevClientesNuevos(businessId: string, pregunta: string): Promise<string> {
  const contexto = await getClientesNuevosContext(businessId);
  const contactos = contexto.contactos || [];
  const q = pregunta.toLowerCase();

  if (q.includes('cuántos') || q.includes('cuantos') || q.includes('total')) {
    const csv = contactos.filter((c) => c.origen === 'Importado CSV').length;
    const manual = contactos.filter((c) => c.origen === 'Manual').length;
    return \`Tienes \${contactos.length} clientes registrados en total: \${csv} importados por CSV y \${manual} dados de alta manualmente.\`;
  }

  if (q.includes('campaña') || q.includes('campana') || q.includes('enviado') || q.includes('quiénes')) {
    const sinCampana = contactos.filter((c) => !c.campanaEnviada);
    return \`Hay \${sinCampana.length} cliente(s) que aún no han recibido ninguna campaña de WhatsApp.\`;
  }

  if (q.includes('mes') || q.includes('fecha') || q.includes('llegaron')) {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anoActual = ahora.getFullYear();
    const delMes = contactos.filter((c) => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d.getMonth() === mesActual && d.getFullYear() === anoActual;
    }).length;
    return \`Durante este mes se han incorporado \${delMes} cliente(s) a tu base de datos.\`;
  }

  return \`Tu base tiene \${contactos.length} contactos. Pregúntame sobre el total de clientes, a quiénes les falta campaña o cuántos llegaron este mes.\`;
}

/**
 * Registra sugerencia ejecutada en jev_memory.
 */
export async function registrarSugerenciaClientesEjecutada({
  businessId,
  sugerenciaId,
  detalle,
}: {
  businessId: string;
  sugerenciaId: string;
  detalle: string;
}) {
  return registrarAccionJev({
    tipo: 'clientes-nuevos',
    accion: \`Sugerencia Copiloto aplicada: \${detalle}\`,
    datos: { sugerenciaId, detalle },
    origen: 'JevCopilotWidgetClientesNuevos',
    usuario: businessId,
  });
}
`;
    fs.writeFileSync(enginePath, engine.trim() + '\n' + copilotSnippet, 'utf8');
    console.log('✅ Funciones del Copiloto agregadas a: ' + enginePath);
  }
}

// 3. Modificar src/jev/JevSeccionClientesNuevos.tsx (agregar widget flotante)
const seccionPath = 'src/jev/JevSeccionClientesNuevos.tsx';
if (fs.existsSync(seccionPath)) {
  let seccion = fs.readFileSync(seccionPath, 'utf8');
  if (!fs.existsSync(seccionPath + '.bak2')) {
    fs.writeFileSync(seccionPath + '.bak2', seccion, 'utf8');
  }

  if (!seccion.includes('JevCopilotWidgetClientesNuevos')) {
    // Agregar import
    seccion = "import { JevCopilotWidgetClientesNuevos } from './JevCopilotWidgetClientesNuevos';\n" + seccion;

    // Agregar handlers para sugerencias
    const handlersSnippet = `
  const handleAbrirCampanaConIds = (ids: string[]) => {
    const seleccionados = todosLosContactos.filter((c) => ids.includes(c.id));
    setClientesCampana(seleccionados.length > 0 ? seleccionados : todosLosContactos);
    setIsCampanaModalOpen(true);
  };
`;
    seccion = seccion.replace('const handleDescargarPlantillaCSV = () => {', handlersSnippet + '\n  const handleDescargarPlantillaCSV = () => {');

    // Agregar widget antes de cerrar el último </div>
    const widgetPlacement = `
      {/* JEV Copiloto — Clientes Nuevos */}
      <JevCopilotWidgetClientesNuevos
        businessId={businessId}
        onAbrirCampanaConIds={handleAbrirCampanaConIds}
        onAbrirImportar={() => setIsImportModalOpen(true)}
      />
    </div>
  );
}`;
    seccion = seccion.replace(/<\/div>\s*\);\s*}\s*$/, widgetPlacement);

    fs.writeFileSync(seccionPath, seccion, 'utf8');
    console.log('✅ Widget del Copiloto integrado a: ' + seccionPath);
  }
}

console.log('\n🎉 ¡JEV Copiloto — Clientes Nuevos instalado con éxito!');
