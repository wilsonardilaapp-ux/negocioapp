'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  obtenerCopilotoInventario,
  consultarJevInventario,
  registrarOrdenCompraCopiada,
  CopilotoInventarioOutput,
  BorradorOrdenCompraItem,
} from './jevEngineInventario';
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
  AlertTriangle,
  Clock,
  Sparkles,
  Package,
  ShoppingCart,
  Send,
  Loader2,
  RefreshCw,
  TrendingDown,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JevWidgetInventarioProps {
  businessId?: string;
}

export function JevCopilotWidgetInventario({ businessId }: JevWidgetInventarioProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<CopilotoInventarioOutput | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const [chatPregunta, setChatPregunta] = useState('');
  const [chatRespuesta, setChatRespuesta] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const { toast } = useToast();

  const cargarCopiloto = () => {
    if (!businessId) return;
    startTransition(async () => {
      try {
        const resultado = await obtenerCopilotoInventario(businessId);
        setData(resultado);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error JEV Inventario',
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

  const handleCopiarOrdenCompra = async () => {
    if (!businessId || !data || (data?.borradorOrdenCompra || []).length === 0) return;

    try {
      const lineas = (data?.borradorOrdenCompra || []).map(
        (item) => `• ${item.nombre}: ${item.cantidadSugerida} unids (Stock actual: ${item.stockActual})`
      );
      const textoCompleto = `ORDEN DE COMPRA SUGERIDA (JEV AI)\nFecha: ${new Date().toLocaleDateString('es-CO')}\n\n${lineas.join(
        '\n'
      )}\n\nInversión Estimada: $${data.inversionTotalEstimada.toLocaleString('es-CO')}`;

      await navigator.clipboard.writeText(textoCompleto);
      setIsCopied(true);

      // Registrar en jev_memory (Regla 6)
      await registrarOrdenCompraCopiada({
        businessId,
        items: data.borradorOrdenCompra,
        inversionEstimada: data.inversionTotalEstimada,
      });

      toast({
        title: '📋 Lista de compra copiada',
        description: 'La orden sugerida fue copiada y registrada en la memoria JEV.',
      });

      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error al copiar',
        description: 'No se pudo copiar la lista.',
      });
    }
  };

  const handlePreguntarChat = async (preguntaTexto?: string) => {
    const q = preguntaTexto || chatPregunta;
    if (!businessId || !q.trim()) return;

    setIsAnswering(true);
    setChatRespuesta(null);
    try {
      const r = await consultarJevInventario(businessId, q);
      setChatRespuesta(r);
      if (!preguntaTexto) setChatPregunta('');
    } catch (e: any) {
      setChatRespuesta('No se pudo procesar la pregunta.');
    } finally {
      setIsAnswering(false);
    }
  };

  if (!businessId) return null;

  const totalAlertas = (data?.productosCriticos.length || 0) + (data?.productosAlerta.length || 0);

  return (
    <>
      {/* Botón Flotante JEV Copilot (Regla 5: Composición sin tocar la UI original) */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-12 px-4 shadow-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 border-2 border-white/80 animate-in fade-in"
        >
          <Bot className="w-5 h-5" />
          <span>JEV Inventario</span>
          {totalAlertas > 0 && (
            <span className="bg-amber-400 text-amber-950 text-xs px-1.5 py-0.5 rounded-full font-black">
              {totalAlertas}
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
                <h3 className="font-black text-sm text-gray-900 leading-tight">JEV Copilot — Inventario</h3>
                <p className="text-[11px] text-muted-foreground">Predicción de quiebres y compras</p>
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
                <span className="text-xs font-medium">JEV está analizando rotación y stock de inventario...</span>
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
                <Tabs defaultValue="quiebre" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full h-8 text-[11px]">
                    <TabsTrigger value="quiebre">Quiebres</TabsTrigger>
                    <TabsTrigger value="compras">Orden Compra</TabsTrigger>
                    <TabsTrigger value="chat">Preguntas</TabsTrigger>
                  </TabsList>

                  {/* Pestaña 1: Riesgo de Quiebre */}
                  <TabsContent value="quiebre" className="space-y-3 pt-2">
                    {(data?.productosCriticos || []).length === 0 && (data?.productosAlerta || []).length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground space-y-1">
                        <Package className="w-8 h-8 mx-auto text-emerald-500 opacity-40" />
                        <p className="font-semibold text-xs text-gray-800">Cero quiebres proyectados</p>
                        <p className="text-[11px]">Todos tus productos tienen stock suficiente para los próximos 15 días.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...data.productosCriticos, ...data.productosAlerta].map((prod) => (
                          <div
                            key={prod.id}
                            className="p-3 rounded-xl border border-gray-200 bg-white hover:border-emerald-200 transition-all space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-gray-900">{prod.nombre}</span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-bold uppercase ${
                                  prod.nivelRiesgo === 'critico'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {prod.stockActual <= 0
                                  ? 'Agotado'
                                  : prod.diasStockRestante <= 7
                                  ? `Crítico: ${prod.diasStockRestante}d`
                                  : `Alerta: ${prod.diasStockRestante}d`}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 text-[10px] text-muted-foreground bg-gray-50 p-2 rounded-lg gap-1">
                              <div>Stock Actual: <strong className="text-gray-800">{prod.stockActual}</strong> unids</div>
                              <div>Ventas 30d: <strong className="text-gray-800">{prod.unidadesVendidas30d}</strong> unids</div>
                              <div className="col-span-2 text-emerald-700 font-medium">
                                Rotación: ~{prod.velocidadDiaria} unids/día
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Pestaña 2: Borrador de Orden de Compra (Regla 3: Solo propone) */}
                  <TabsContent value="compras" className="space-y-3 pt-2">
                    {(data?.borradorOrdenCompra || []).length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground space-y-1">
                        <ShoppingCart className="w-8 h-8 mx-auto text-emerald-500 opacity-40" />
                        <p className="font-semibold text-xs text-gray-800">No se requieren compras inmediatas</p>
                        <p className="text-[11px]">Tu inventario tiene cobertura para el mes en curso.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-baseline px-1 text-xs">
                          <span className="text-muted-foreground">Inversión Estimada:</span>
                          <span className="font-black text-sm text-emerald-700">
                            ${data.inversionTotalEstimada.toLocaleString('es-CO')}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {(data?.borradorOrdenCompra || []).map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-lg border border-gray-100 bg-gray-50/70 text-xs flex justify-between items-center"
                            >
                              <div className="space-y-0.5">
                                <p className="font-bold text-gray-900">{item.nombre}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  Stock: {item.stockActual} • Sugerido: +{item.cantidadSugerida} unids
                                </p>
                              </div>
                              <span className="font-semibold text-gray-800">
                                ${item.inversionSubtotal.toLocaleString('es-CO')}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Botón Copiar (Regla 3: El usuario copia y aplica en su flujo habitual) */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopiarOrdenCompra}
                          className="w-full text-xs font-bold gap-1.5 h-9 border-emerald-300 text-emerald-800 hover:bg-emerald-50 shadow-xs"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>¡Lista Copiada y Guardada en Memoria!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>📋 Copiar Lista de Compra</span>
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </TabsContent>

                  {/* Pestaña 3: Preguntas a JEV */}
                  <TabsContent value="chat" className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Consultas Rápidas:</p>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePreguntarChat('¿Qué producto se agotará primero?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          ❓ ¿Qué producto se agotará primero?
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreguntarChat('¿Qué producto vende lento y sobra stock?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          📉 ¿Qué producto vende lento y sobra stock?
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreguntarChat('¿Cuál es la inversión estimada para reabastecer?')}
                          className="text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-700 transition"
                        >
                          💰 ¿Cuál es la inversión estimada para reabastecer?
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Input
                        placeholder="Pregunta algo sobre tu stock..."
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
                        <span>Analizando inventario...</span>
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
    </>
  );
}
