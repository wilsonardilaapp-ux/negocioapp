'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  obtenerCopilotoPagos,
  consultarJevPagos,
  registrarRecordatorioPagoEnviado,
  CopilotoPagosOutput,
  SugerenciaCobroJev,
} from './jevEnginePagos';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  X,
  Send,
  Check,
  CreditCard,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Info,
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JevWidgetPagosProps {
  businessId?: string;
}

const formatPhoneForWhatsApp = (phone: string): string => {
  let clean = (phone || '').replace(/\D/g, '');
  if (!clean || clean.length < 7) return '';
  if (clean.length === 10 && clean.startsWith('3')) {
    return `57${clean}`;
  }
  if (clean.length === 12 && clean.startsWith('57')) {
    return clean;
  }
  if (clean.length === 10) {
    return `57${clean}`;
  }
  return clean;
};

export function JevCopilotWidgetPagos({ businessId }: JevWidgetPagosProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<CopilotoPagosOutput | null>(null);
  const [sugerenciaModal, setSugerenciaModal] = useState<SugerenciaCobroJev | null>(null);
  const [mensajeEditado, setMensajeEditado] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [enviadosMap, setEnviadosMap] = useState<Record<string, boolean>>({});

  const [isLoading, startTransition] = useTransition();
  const [chatPregunta, setChatPregunta] = useState('');
  const [chatRespuesta, setChatRespuesta] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const { toast } = useToast();

  const cargarCopiloto = () => {
    if (!businessId) return;
    startTransition(async () => {
      try {
        const resultado = await obtenerCopilotoPagos(businessId);
        setData(resultado);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error JEV Pagos',
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

  const handleAbrirConfirmacion = (sug: SugerenciaCobroJev) => {
    setSugerenciaModal(sug);
    setMensajeEditado(sug.borradorMensaje);
  };

  const handleConfirmarEnvioWhatsApp = async () => {
    if (!businessId || !sugerenciaModal) return;
    const cleanPhone = formatPhoneForWhatsApp(sugerenciaModal.telefono);

    if (!cleanPhone) {
      toast({
        variant: 'destructive',
        title: 'Sin teléfono válido',
        description: `El cliente ${sugerenciaModal.cliente} no tiene número de WhatsApp registrado.`,
      });
      return;
    }

    setIsSending(true);

    try {
      await registrarRecordatorioPagoEnviado({
        businessId,
        orderId: sugerenciaModal.orderId,
        cliente: sugerenciaModal.cliente,
        monto: sugerenciaModal.monto,
        borrador: mensajeEditado,
      });

      setEnviadosMap((prev) => ({ ...prev, [sugerenciaModal.id]: true }));

      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensajeEditado)}`;
      window.open(url, '_blank');

      toast({
        title: '🚀 WhatsApp abierto y registrado en Memoria JEV',
        description: `Recordatorio enviado a ${sugerenciaModal.cliente}.`,
      });

      setSugerenciaModal(null);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error al enviar',
        description: e.message || 'No se pudo procesar el recordatorio.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handlePreguntarChat = async (preguntaTexto?: string) => {
    const q = preguntaTexto || chatPregunta;
    if (!businessId || !q.trim()) return;

    setIsAnswering(true);
    setChatRespuesta(null);
    try {
      const r = await consultarJevPagos(businessId, q);
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
          <span>JEV Pagos</span>
          {data && data.pagosVencidosCount > 0 && (
            <span className="bg-amber-400 text-amber-950 text-xs px-1.5 py-0.5 rounded-full font-black animate-pulse">
              {data.pagosVencidosCount}
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
                <h3 className="font-black text-sm text-gray-900 leading-tight">JEV Copilot — Pagos</h3>
                <p className="text-[11px] text-muted-foreground">Diagnóstico de cobros, cartera y pasarelas</p>
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
                <span className="text-xs font-medium">JEV está auditando cartera y métodos de pago...</span>
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
                <Tabs defaultValue="diagnostico" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full h-8 text-[11px]">
                    <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
                    <TabsTrigger value="sugerencias">Sugerencias</TabsTrigger>
                    <TabsTrigger value="chat">Preguntas</TabsTrigger>
                  </TabsList>

                  {/* Pestaña 1: Diagnóstico (Cartera y Métricas) */}
                  <TabsContent value="diagnostico" className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl border bg-gray-50 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Cobrado Mes</span>
                        <p className="font-bold text-emerald-700 text-sm">${data.totalCobradoMes.toLocaleString('es-CO')}</p>
                      </div>
                      <div className="p-2.5 rounded-xl border bg-gray-50 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Por Cobrar</span>
                        <p className="font-bold text-amber-700 text-sm">${data.totalPendienteCobro.toLocaleString('es-CO')}</p>
                      </div>
                    </div>

                    {(data?.metodosMasUsados || []).length > 0 && (
                      <div className="p-3 rounded-xl border bg-white space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Métodos Más Utilizados</span>
                        <div className="space-y-1">
                          {data.metodosMasUsados.slice(0, 3).map((m, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-700">
                              <span className="capitalize">{m.metodo}</span>
                              <span className="font-bold">{m.cantidad} pedidos</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(data?.deudoresPendientes || []).length === 0 ? (
                      <div className="py-6 text-center text-muted-foreground space-y-1">
                        <Check className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
                        <p className="font-semibold text-xs text-gray-800">Cero cartera pendiente</p>
                        <p className="text-[11px]">Todos los pedidos recibidos están completamente pagados.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase">Saldos Pendientes ({data.deudoresCount})</p>
                        {data.deudoresPendientes.slice(0, 5).map((d) => (
                          <div key={d.orderId} className="p-2.5 rounded-xl border bg-white text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-900">{d.cliente}</span>
                              <Badge variant={d.esVencido ? 'destructive' : 'outline'} className="text-[9px]">
                                {d.diasPendiente}d pendiente
                              </Badge>
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Monto: <strong className="text-gray-900">${d.monto.toLocaleString('es-CO')}</strong></span>
                              <span className="capitalize">{d.metodoPago}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Pestaña 2: Sugerencias (Recordatorios WhatsApp con confirmación) */}
                  <TabsContent value="sugerencias" className="space-y-3 pt-2">
                    {(data?.sugerencias || []).length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-xs">
                        Sin sugerencias por ahora — cartera al día.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(data?.sugerencias || []).map((sug) => {
                          const isDone = enviadosMap[sug.id];

                          return (
                            <Card key={sug.id} className="border border-gray-200 hover:border-emerald-200 transition-all">
                              <CardHeader className="p-3 pb-1">
                                <CardTitle className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                  🎯 {sug.titulo}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-3 pt-1 space-y-2 text-xs">
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                  📝 {sug.justificacion}
                                </p>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isDone}
                                  onClick={() => handleAbrirConfirmacion(sug)}
                                  className={`w-full text-xs font-bold gap-1.5 h-8 ${
                                    isDone
                                      ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                                      : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                                  }`}
                                >
                                  {isDone ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>✓ Recordatorio Enviado y Guardado</span>
                                    </>
                                  ) : (
                                    <>
                                      <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                                      <span>⚡ Enviar Recordatorio por WhatsApp</span>
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
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
                          onClick={() => handlePreguntarChat('¿Quién me debe dinero?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          👥 ¿Quién me debe dinero?
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreguntarChat('¿Cuánto cobré este mes?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          💰 ¿Cuánto cobré este mes?
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreguntarChat('¿Cuál es el método de pago más usado?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          💳 ¿Cuál es el método de pago más usado?
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Input
                        placeholder="Pregunta sobre pagos o cartera..."
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
                        <span>Auditando transacciones de pago...</span>
                      </div>
                    ) : chatRespuesta ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs leading-relaxed text-emerald-950">
                        {chatRespuesta}
                      </div>
                    ) : null}
                  </TabsContent>
                </Tabs>

                {/* Memoria y Aprendizaje (Regla 9) */}
                {(data?.patronesAprendidos || []).length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                      Memoria JEV
                    </p>
                    {(data?.patronesAprendidos || []).map((patron, i) => (
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

      {/* Modal de Confirmación Previa para Recordatorio de Cobro */}
      {sugerenciaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-600" />
                Confirmar Recordatorio de Pago
              </h4>
              <button onClick={() => setSugerenciaModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-gray-50 rounded-xl border space-y-0.5">
                <p className="font-bold text-gray-900">Destinatario: {sugerenciaModal.cliente}</p>
                <p className="text-muted-foreground font-mono">
                  Teléfono: {sugerenciaModal.telefono} (para: +{formatPhoneForWhatsApp(sugerenciaModal.telefono)})
                </p>
                <p className="text-muted-foreground font-bold text-emerald-700">Monto: ${sugerenciaModal.monto.toLocaleString('es-CO')}</p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-[10px] uppercase text-muted-foreground">Mensaje que se enviará:</span>
                <Textarea
                  rows={4}
                  value={mensajeEditado}
                  onChange={(e) => setMensajeEditado(e.target.value)}
                  className="text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setSugerenciaModal(null)} className="text-xs font-bold">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmarEnvioWhatsApp}
                disabled={isSending}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold gap-1.5"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Confirmar y Abrir WhatsApp</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
