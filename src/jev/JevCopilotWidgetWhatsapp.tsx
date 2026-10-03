'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  obtenerCopilotoWhatsapp, 
  registrarBorradorCopiadoWhatsapp, 
  CopilotoWhatsappOutput 
} from './jevEngineWhatsapp';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  X, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  MessageSquare, 
  Loader2,
  RefreshCw 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JevWidgetProps {
  businessId?: string;
}

export function JevCopilotWidgetWhatsapp({ businessId }: JevWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<CopilotoWhatsappOutput | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();
  const { toast } = useToast();

  const cargarCopiloto = () => {
    if (!businessId) return;
    startTransition(async () => {
      try {
        const resultado = await obtenerCopilotoWhatsapp(businessId);
        setData(resultado);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error JEV Copilot',
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

  const handleCopiarBorrador = async (sug: any) => {
    if (!businessId) return;
    try {
      await navigator.clipboard.writeText(sug.borradorRespuesta);
      setCopiedId(sug.id);

      // Registrar en jev_memory (Regla 6)
      await registrarBorradorCopiadoWhatsapp({
        businessId,
        chatId: sug.chatId,
        cliente: sug.cliente,
        borrador: sug.borradorRespuesta,
        minutosEspera: sug.minutosEspera,
      });

      toast({
        title: '📋 Borrador copiado al portapapeles',
        description: 'Pégalo en el chat de WhatsApp del cliente para enviar tu respuesta.',
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
          <span>JEV Copilot</span>
          {data && data.totalPendientes > 0 && (
            <span className="bg-amber-400 text-amber-950 text-xs px-1.5 py-0.5 rounded-full font-black">
              {data.totalPendientes}
            </span>
          )}
        </Button>
      </div>

      {/* Drawer / Panel Deslizante de JEV Copilot */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl border-l flex flex-col animate-in slide-in-from-right duration-300">
          {/* Cabecera */}
          <div className="p-4 border-b bg-emerald-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-900 leading-tight">JEV Copilot — WhatsApp</h3>
                <p className="text-[11px] text-muted-foreground">Priorización y borradores de respuesta</p>
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
                <span className="text-xs font-medium">JEV está analizando los chats de WhatsApp...</span>
              </div>
            ) : data ? (
              <>
                {/* Diagnóstico rápido */}
                <Card className="border-emerald-200 bg-emerald-50/40">
                  <CardContent className="p-3 text-xs leading-relaxed text-emerald-950 font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{data.diagnostico}</span>
                  </CardContent>
                </Card>

                {/* Lista de sugerencias priorizadas */}
                {(data?.sugerencias || []).length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <MessageSquare className="w-10 h-10 mx-auto text-emerald-500 opacity-40" />
                    <p className="font-semibold text-xs text-gray-800">No hay respuestas pendientes</p>
                    <p className="text-[11px]">Tu negocio está al día en la atención por WhatsApp.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Borradores Sugeridos ({(data?.sugerencias || []).length})
                    </p>

                    {(data?.sugerencias || []).map((sug) => (
                      <Card key={sug.id} className="border border-gray-200 hover:border-emerald-200 transition-all">
                        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
                          <div>
                            <CardTitle className="text-xs font-bold text-gray-900">{sug.cliente}</CardTitle>
                            <p className="text-[10px] text-muted-foreground">{sug.telefono}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold uppercase ${
                              sug.urgencia === 'alta'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : sug.urgencia === 'media'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5 mr-1" />
                            {sug.minutosEspera}m de espera
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-2">
                          <p className="text-[10px] text-muted-foreground italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                            {sug.motivo}
                          </p>

                          <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs text-gray-800 leading-snug">
                            {sug.borradorRespuesta}
                          </div>

                          {/* Botón Copiar (Regla 3: JEV solo propone, el usuario copia y aplica) */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopiarBorrador(sug)}
                            className="w-full text-xs font-bold gap-1.5 h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                          >
                            {copiedId === sug.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>¡Copiado y Registrado en Memoria!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Borrador</span>
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Memoria y Aprendizaje (Regla 9) */}
                {(data?.patronesAprendidos || []).length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
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
