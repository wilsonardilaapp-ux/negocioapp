'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  obtenerCopilotoSuggestions,
  consultarJevSuggestions,
  registrarAccionSuggestions,
  CopilotoSuggestionsOutput,
  SugerenciaMotorJev,
} from './jevEngineSuggestions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  X,
  Check,
  Lightbulb,
  Sparkles,
  Send,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Info,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JevWidgetSuggestionsProps {
  businessId?: string;
}

export function JevCopilotWidgetSuggestions({ businessId }: JevWidgetSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<CopilotoSuggestionsOutput | null>(null);
  const [sugerenciaModal, setSugerenciaModal] = useState<SugerenciaMotorJev | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [aplicadasMap, setAplicadasMap] = useState<Record<string, boolean>>({});

  const [isLoading, startTransition] = useTransition();
  const [chatPregunta, setChatPregunta] = useState('');
  const [chatRespuesta, setChatRespuesta] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const { toast } = useToast();

  const cargarCopiloto = () => {
    if (!businessId) return;
    startTransition(async () => {
      try {
        const resultado = await obtenerCopilotoSuggestions(businessId);
        setData(resultado);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error JEV Sugerencias',
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

  const handleConfirmarSugerencia = async () => {
    if (!businessId || !sugerenciaModal) return;
    setIsApplying(true);

    try {
      await registrarAccionSuggestions({
        businessId,
        reglaId: sugerenciaModal.reglaId,
        titulo: sugerenciaModal.titulo,
        justificacion: sugerenciaModal.justificacion,
      });

      setAplicadasMap((prev) => ({ ...prev, [sugerenciaModal.id]: true }));
      toast({
        title: '✅ Acción registrada en Memoria JEV',
        description: `Se guardó el seguimiento para: "${sugerenciaModal.titulo}".`,
      });
      setSugerenciaModal(null);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar',
        description: e.message || 'No se pudo procesar la acción.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handlePreguntarChat = async (preguntaTexto?: string) => {
    const q = preguntaTexto || chatPregunta;
    if (!businessId || !q.trim()) return;

    setIsAnswering(true);
    setChatRespuesta(null);
    try {
      const r = await consultarJevSuggestions(businessId, q);
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
          <span>JEV Sugerencias</span>
          {data && data.reglas.filter(r => r.esSinResultados).length > 0 && (
            <span className="bg-amber-400 text-amber-950 text-xs px-1.5 py-0.5 rounded-full font-black animate-pulse">
              {data.reglas.filter(r => r.esSinResultados).length}
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
                <h3 className="font-black text-sm text-gray-900 leading-tight">JEV Copilot — Sugerencias</h3>
                <p className="text-[11px] text-muted-foreground">Diagnóstico de cross-sell y conversión</p>
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
                <span className="text-xs font-medium">JEV está analizando el rendimiento del motor de IA...</span>
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

                  {/* Pestaña 1: Diagnóstico */}
                  <TabsContent value="diagnostico" className="space-y-3 pt-2">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl border bg-gray-50">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Reglas</span>
                        <p className="font-black text-gray-900 text-base">{data.totalReglas}</p>
                      </div>
                      <div className="p-2 rounded-xl border bg-green-50/50">
                        <span className="text-[10px] uppercase font-bold text-green-700">Conversión</span>
                        <p className="font-black text-green-900 text-base">{data.tasaConversionGlobal}%</p>
                      </div>
                      <div className="p-2 rounded-xl border bg-blue-50/50">
                        <span className="text-[10px] uppercase font-bold text-blue-700">Ingresos</span>
                        <p className="font-black text-blue-900 text-xs mt-1">${data.ingresosAtribuidosTotal.toLocaleString('es-CO')}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase">Rendimiento por Regla</p>
                      {(data?.reglas || []).length === 0 ? (
                        <div className="py-6 text-center text-muted-foreground text-xs">
                          Sin reglas configuradas en el motor.
                        </div>
                      ) : (
                        (data?.reglas || []).map((r) => (
                          <div key={r.id} className="p-2.5 rounded-xl border bg-white text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-900 flex items-center gap-1 font-mono">
                                <Lightbulb className="w-3 h-3 text-emerald-600" />
                                Regla #{r.id.slice(-4)}
                              </span>
                              <Badge
                                variant={!r.active ? 'secondary' : r.esSinResultados ? 'destructive' : 'outline'}
                                className={`text-[9px] uppercase ${
                                  !r.esSinResultados && r.active ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : ''
                                }`}
                              >
                                {!r.active ? 'Pausada' : `${r.tasaConversion}% conv.`}
                              </Badge>
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Mostradas: {r.shownCount} | Aceptadas: {r.acceptedCount}</span>
                              <span className="font-bold text-emerald-700">${r.revenueAttributed.toLocaleString('es-CO')}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* Pestaña 2: Sugerencias */}
                  <TabsContent value="sugerencias" className="space-y-3 pt-2">
                    {(data?.sugerencias || []).length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-xs">
                        Sin sugerencias por ahora — motor optimizado.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(data?.sugerencias || []).map((sug) => {
                          const isDone = aplicadasMap[sug.id];

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
                                  onClick={() => setSugerenciaModal(sug)}
                                  className={`w-full text-xs font-bold gap-1.5 h-8 ${
                                    isDone
                                      ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                                      : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                                  }`}
                                >
                                  {isDone ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>✓ Acción Registrada en Memoria</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                                      <span>⚡ {sug.accionTexto}</span>
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
                          onClick={() => handlePreguntarChat('¿Cuántas sugerencias se aceptaron?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          📈 ¿Cuántas sugerencias se aceptaron?
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreguntarChat('¿Qué regla convierte más?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          🏆 ¿Qué regla convierte más?
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreguntarChat('¿Qué producto me conviene sugerir como upsell?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          💡 ¿Qué producto me conviene sugerir como upsell?
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Input
                        placeholder="Pregunta sobre las sugerencias..."
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
                        <span>Analizando conversiones de cross-sell...</span>
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

      {/* Modal de Confirmación Previa para Sugerencias */}
      {sugerenciaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-emerald-600" />
                Confirmar Acción de Sugerencia
              </h4>
              <button onClick={() => setSugerenciaModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-gray-900">{sugerenciaModal.titulo}</p>
              <div className="p-3 bg-gray-50 rounded-xl border text-muted-foreground leading-relaxed">
                {sugerenciaModal.justificacion}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Al confirmar, se guardará el registro formal en `jev_memory` para seguimiento en el Resumen Ejecutivo.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setSugerenciaModal(null)} className="text-xs font-bold">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmarSugerencia}
                disabled={isApplying}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
              >
                {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirmar y Guardar en Memoria</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
