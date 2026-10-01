'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  obtenerCopilotoPedidos,
  consultarJevPedidos,
  registrarNotificacionPedidoCopiada,
  CopilotoPedidosOutput,
  BorradorNotificacionPedido,
} from './jevEnginePedidos';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  X,
  Copy,
  Check,
  Package,
  Sparkles,
  Clock,
  Send,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Info,
  DollarSign,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JevWidgetPedidosProps {
  businessId?: string;
}

export function JevCopilotWidgetPedidos({ businessId }: JevWidgetPedidosProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<CopilotoPedidosOutput | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();
  const [chatPregunta, setChatPregunta] = useState('');
  const [chatRespuesta, setChatRespuesta] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const { toast } = useToast();

  const cargarCopiloto = () => {
    if (!businessId) return;
    startTransition(async () => {
      try {
        const resultado = await obtenerCopilotoPedidos(businessId);
        setData(resultado);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error JEV Pedidos',
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

  const handleCopiarNotificacion = async (borrador: BorradorNotificacionPedido) => {
    if (!businessId) return;

    try {
      await navigator.clipboard.writeText(borrador.borradorMensaje);
      setCopiedId(borrador.id);

      // Registrar en jev_memory (Regla 6)
      await registrarNotificacionPedidoCopiada({
        businessId,
        pedidoId: borrador.pedidoId,
        cliente: borrador.cliente,
        borrador: borrador.borradorMensaje,
        metricasAntes: {
          minutosTranscurridos: 0,
          total: borrador.total,
          estado: borrador.estadoActual,
        },
      });

      toast({
        title: '📋 Notificación copiada al portapapeles',
        description: 'Pégala en WhatsApp o envíala al cliente. Acción guardada en memoria JEV.',
      });

      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error al copiar',
        description: 'No se pudo copiar el texto.',
      });
    }
  };

  const handlePreguntarChat = async (preguntaTexto?: string) => {
    const q = preguntaTexto || chatPregunta;
    if (!businessId || !q.trim()) return;

    setIsAnswering(true);
    setChatRespuesta(null);
    try {
      const r = await consultarJevPedidos(businessId, q);
      setChatRespuesta(r);
      if (!preguntaTexto) setChatPregunta('');
    } catch (e: any) {
      setChatRespuesta('No se pudo procesar la consulta.');
    } finally {
      setIsAnswering(false);
    }
  };

  if (!businessId) return null;

  return (
    <>
      {/* Botón Flotante JEV Copilot (Regla 5: Composición sin tocar la UI original) */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-12 px-4 shadow-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 border-2 border-white/80 animate-in fade-in"
        >
          <Bot className="w-5 h-5" />
          <span>JEV Pedidos</span>
          {data && data.totalUrgentes > 0 && (
            <span className="bg-amber-400 text-amber-950 text-xs px-1.5 py-0.5 rounded-full font-black">
              {data.totalUrgentes}
            </span>
          )}
        </Button>
      </div>

      {/* Drawer / Panel Deslizante de JEV Copilot */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl border-l flex flex-col animate-in slide-in-from-right duration-300">
          {/* Cabecera */}
          <div className="p-4 border-b bg-emerald-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-900 leading-tight">JEV Copilot — Pedidos</h3>
                <p className="text-[11px] text-muted-foreground">Monitoreo de cuellos de botella y despacho</p>
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
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
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

          {/* Contenido con scroll */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs font-medium">JEV está analizando los pedidos en curso...</span>
              </div>
            ) : data ? (
              <>
                {/* Diagnóstico rápido */}
                <Card className="border-emerald-200 bg-emerald-50/40">
                  <CardContent className="p-3 text-xs leading-relaxed text-emerald-950 font-medium flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{data.diagnostico}</span>
                  </CardContent>
                </Card>

                {/* Pestañas del Copiloto */}
                <Tabs defaultValue="urgentes" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full h-8 text-[11px]">
                    <TabsTrigger value="urgentes">Urgentes</TabsTrigger>
                    <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
                    <TabsTrigger value="chat">Preguntas</TabsTrigger>
                  </TabsList>

                  {/* Pestaña 1: Urgentes */}
                  <TabsContent value="urgentes" className="space-y-3 pt-2">
                    {data.pedidosUrgentes.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground space-y-1">
                        <Package className="w-8 h-8 mx-auto text-emerald-500 opacity-40" />
                        <p className="font-semibold text-xs text-gray-800">Cero pedidos pendientes o retrasados</p>
                        <p className="text-[11px]">La operación de despachos marcha con total fluidez.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.pedidosUrgentes.map((p) => (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl border border-gray-200 bg-white hover:border-emerald-200 transition-all space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-gray-900">
                                #{p.id.slice(-7).toUpperCase()} — {p.clienteNombre}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-bold uppercase ${
                                  p.nivelUrgencia === 'critico'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {p.estado}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                              {p.motivoUrgencia}
                            </p>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-0.5">
                              <span>Total: <strong className="text-gray-800">${p.total.toLocaleString('es-CO')}</strong></span>
                              <span>Hace {Math.round(p.minutosTranscurridos)} min</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Pestaña 2: Borradores de Notificación (Regla 3: Solo propone) */}
                  <TabsContent value="notificaciones" className="space-y-3 pt-2">
                    {data.borradoresNotificacion.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground space-y-1">
                        <Sparkles className="w-8 h-8 mx-auto text-emerald-500 opacity-40" />
                        <p className="font-semibold text-xs text-gray-800">No hay borradores pendientes</p>
                        <p className="text-[11px]">No se requiere notificar clientes en este momento.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.borradoresNotificacion.map((borrador) => (
                          <Card key={borrador.id} className="border border-gray-200 hover:border-emerald-200 transition-all">
                            <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
                              <div>
                                <CardTitle className="text-xs font-bold text-gray-900">
                                  #{borrador.pedidoId.slice(-7).toUpperCase()} — {borrador.cliente}
                                </CardTitle>
                                <p className="text-[10px] text-muted-foreground">{borrador.telefono}</p>
                              </div>
                              <Badge variant="outline" className="text-[9px] font-bold">
                                ${borrador.total.toLocaleString('es-CO')}
                              </Badge>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 space-y-2">
                              <p className="text-[10px] text-muted-foreground italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                                {borrador.motivoUrgencia}
                              </p>

                              <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs text-gray-800 leading-snug">
                                {borrador.borradorMensaje}
                              </div>

                              {/* Botón Copiar (Regla 3: El operador copia y envía) */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopiarNotificacion(borrador)}
                                className="w-full text-xs font-bold gap-1.5 h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                              >
                                {copiedId === borrador.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>¡Copiada y Guardada en Memoria!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copiar Notificación</span>
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Pestaña 3: Preguntas a JEV */}
                  <TabsContent value="chat" className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Consultas Rápidas:</p>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePreguntarChat('¿Hay pedidos retrasados?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          ⏱️ ¿Hay pedidos retrasados?
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreguntarChat('¿Cuál es el pedido más valioso pendiente?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          💎 ¿Cuál es el pedido más valioso pendiente?
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreguntarChat('¿Cómo va la operación de despachos?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          📊 ¿Cómo va la operación de despachos?
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Input
                        placeholder="Pregunta sobre los pedidos activos..."
                        value={chatPregunta}
                        onChange={(e) => setChatPregunta(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePreguntarChat()}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handlePreguntarChat()}
                        disabled={isAnswering || !chatPregunta.trim()}
                        className="h-8 w-8 text-emerald-600"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {isAnswering ? (
                      <div className="p-3 bg-muted/30 rounded-lg text-xs flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>Analizando pedidos...</span>
                      </div>
                    ) : chatRespuesta ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs leading-relaxed text-emerald-950">
                        {chatRespuesta}
                      </div>
                    ) : null}
                  </TabsContent>
                </Tabs>

                {/* Memoria y Aprendizaje (Regla 9) */}
                {data.patronesAprendidos.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                      Memoria JEV
                    </p>
                    {data.patronesAprendidos.map((patron, i) => (
                      <p key={i} className="text-[11px] text-gray-500 italic">
                        • {patron}
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
