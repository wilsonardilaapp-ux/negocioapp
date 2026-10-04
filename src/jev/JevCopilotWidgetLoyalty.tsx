'use client';

import React, { useState, useTransition } from 'react';
import {
  obtenerCopilotoLoyalty,
  consultarJevLoyalty,
  CopilotoLoyaltyOutput,
} from './jevEngineLoyalty';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  X,
  Crown,
  Sparkles,
  Users,
  Send,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Info,
  DollarSign,
  Star,
  Brain,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JevWidgetLoyaltyProps {
  businessId?: string;
}

export function JevCopilotWidgetLoyalty({ businessId }: JevWidgetLoyaltyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<CopilotoLoyaltyOutput | null>(null);
  const [isLoading, startTransition] = useTransition();
  const [chatPregunta, setChatPregunta] = useState('');
  const [chatRespuesta, setChatRespuesta] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const { toast } = useToast();

  const cargarCopiloto = () => {
    if (!businessId) return;
    startTransition(async () => {
      try {
        const resultado = await obtenerCopilotoLoyalty(businessId);
        setData(resultado);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error JEV Fidelización',
          description: e.message || 'No se pudo cargar el análisis.',
        });
      }
    });
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!data) {
      cargarCopiloto();
    }
  };

  const handleConsultar = async (e?: React.FormEvent, preguntaFija?: string) => {
    if (e) e.preventDefault();
    const query = preguntaFija || chatPregunta;
    if (!query.trim() || !businessId) return;

    setIsAnswering(true);
    setChatRespuesta(null);
    try {
      const resp = await consultarJevLoyalty(businessId, query);
      setChatRespuesta(resp);
      if (!preguntaFija) setChatPregunta('');
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error de consulta',
        description: e.message || 'No se pudo obtener respuesta.',
      });
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <>
      {/* Botón flotante para abrir el panel */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleOpen}
            className="rounded-full shadow-2xl h-14 w-14 p-0 bg-primary hover:bg-primary/95 text-primary-foreground border-2 border-primary-foreground/20 hover:scale-105 transition-all"
            title="Abrir JEV Copiloto"
          >
            <Bot className="h-7 w-7 animate-pulse" />
          </Button>
        </div>
      )}

      {/* Panel Lateral Flotante */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[95vw] shadow-2xl rounded-2xl overflow-hidden border border-border bg-background animate-in slide-in-from-bottom-5">
          <Card className="border-0 shadow-none rounded-none">
            <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-foreground/10 rounded-lg">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-1.5 text-primary-foreground">
                    JEV Copiloto
                    <Badge variant="secondary" className="text-[10px] uppercase font-black px-1.5 py-0">
                      Fidelización
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] text-primary-foreground/80">Inteligencia de Clientes y Churn</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cargarCopiloto}
                  disabled={isLoading}
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {isLoading && !data ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground font-medium">Analizando inteligencia de fidelización...</p>
                </div>
              ) : (
                <>
                  {/* Banner de diagnóstico */}
                  {data?.diagnostico && (
                    <div className="p-3 bg-muted/60 rounded-xl border border-border text-xs flex gap-2.5 items-start">
                      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="leading-relaxed text-foreground">{data.diagnostico}</p>
                    </div>
                  )}

                  {/* Resumen Métricas Clave */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/40 p-2 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Clientes VIP</p>
                      <p className="text-base font-black text-primary">{data?.totalVip || 0}</p>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">En Riesgo</p>
                      <p className="text-base font-black text-destructive">{data?.totalEnRiesgo || 0}</p>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Reseñas</p>
                      <p className="text-base font-black text-amber-500 flex items-center justify-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-500" />
                        {data?.promedioResenas || '5.0'}
                      </p>
                    </div>
                  </div>

                  {/* Pestañas Preguntas / Memoria JEV */}
                  <Tabs defaultValue="preguntas" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full h-8 text-[11px]">
                      <TabsTrigger value="preguntas">Preguntas</TabsTrigger>
                      <TabsTrigger value="memoria">Memoria JEV</TabsTrigger>
                    </TabsList>

                    {/* PESTAÑA 1: PREGUNTAS (CHAT IA) */}
                    <TabsContent value="preguntas" className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-muted-foreground">Consultas sugeridas:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            '¿Quiénes son los clientes VIP en riesgo?',
                            '¿Cuánto revenue ha recuperado la IA?',
                            '¿Cómo están las calificaciones y reseñas?',
                            '¿Cuál es el valor configurado de puntos?',
                          ].map((query, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleConsultar(undefined, query)}
                              disabled={isAnswering}
                              className="text-[11px] bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2.5 py-1 rounded-md text-left transition-colors"
                            >
                              {query}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Caja de respuesta */}
                      {isAnswering && (
                        <div className="p-3 bg-muted/40 rounded-lg border border-border flex items-center gap-2 text-xs">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span>JEV está analizando los datos...</span>
                        </div>
                      )}

                      {chatRespuesta && !isAnswering && (
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs space-y-1">
                          <p className="font-bold text-primary flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Respuesta de JEV:
                          </p>
                          <p className="text-foreground leading-relaxed">{chatRespuesta}</p>
                        </div>
                      )}

                      {/* Formulario de Pregunta */}
                      <form onSubmit={handleConsultar} className="flex gap-2 pt-1">
                        <Input
                          placeholder="Pregúntale a JEV sobre fidelización..."
                          value={chatPregunta}
                          onChange={(e) => setChatPregunta(e.target.value)}
                          disabled={isAnswering}
                          className="text-xs h-9"
                        />
                        <Button type="submit" size="sm" disabled={isAnswering || !chatPregunta.trim()} className="h-9 px-3">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </TabsContent>

                    {/* PESTAÑA 2: MEMORIA JEV */}
                    <TabsContent value="memoria" className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Brain className="h-4 w-4 text-primary" />
                          <span>Aprendizaje y Memoria Histórica</span>
                        </div>
                        {data?.patronesAprendidos && data.patronesAprendidos.length > 0 ? (
                          <div className="space-y-2">
                            {data.patronesAprendidos.map((patron, i) => (
                              <div key={i} className="p-2.5 bg-muted/40 border border-border rounded-lg text-xs flex gap-2">
                                <span className="text-primary font-bold">✓</span>
                                <span className="text-foreground">{patron}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-4 text-center">
                            Sin historial de aprendizajes previos en memoria.
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
