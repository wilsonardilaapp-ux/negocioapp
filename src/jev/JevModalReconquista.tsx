'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MessageSquare, Clock, Send, X, Loader2, Phone } from 'lucide-react';
import { registrarAccionJev } from './jevMemory';
import { useToast } from '@/hooks/use-toast';
import type { ClienteRetencionJev } from './contextAggregatorRetencion';

interface JevModalReconquistaProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  clientes: ClienteRetencionJev[];
  onRemoveCliente: (id: string) => void;
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

export function JevModalReconquista({
  isOpen,
  onClose,
  businessId,
  clientes,
  onRemoveCliente,
}: JevModalReconquistaProps) {
  const { toast } = useToast();
  const [modoEnvio, setModoEnvio] = useState<'ahora' | 'programar'>('ahora');
  const [fechaProg, setFechaProg] = useState('');
  const [horaProg, setHoraProg] = useState('10:00');
  const [mensajePlantilla, setMensajePlantilla] = useState(
    '¡Hola {nombre}! Te extrañamos en nuestro negocio. Han pasado {dias_sin_comprar} días desde tu última visita y preparamos un detalle especial para ti. ¿Te gustaría conocerlo?'
  );
  
  // Estado para teléfonos editados/añadidos en caso de "Sin WhatsApp"
  const [telefonosEditados, setTelefonoseditados] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientePreview = clientes[0] || { nombre: 'Cliente Ejemplo', diasSinComprar: 25, telefono: '3000000000' };
  const mensajePreview = mensajePlantilla
    .replace(/{nombre}/g, clientePreview.nombre)
    .replace(/{dias_sin_comprar}/g, String(clientePreview.diasSinComprar || 15));

  const handleTelefonoChange = (id: string, val: string) => {
    setTelefonoseditados(prev => ({ ...prev, [id]: val }));
  };

  const handleConfirmar = async () => {
    if (!businessId || clientes.length === 0) return;
    setIsSubmitting(true);

    try {
      if (modoEnvio === 'ahora') {
        let enviadosCount = 0;

        for (const cliente of clientes) {
          const telFinal = telefonosEditados[cliente.id] || (cliente.telefono === 'Sin WhatsApp' ? '' : cliente.telefono);
          const cleanPhone = formatPhoneForWhatsApp(telFinal);

          if (!cleanPhone) {
            toast({
              variant: 'destructive',
              title: `Falta teléfono para ${cliente.nombre}`,
              description: 'Por favor ingresa un número válido de WhatsApp antes de enviar.',
            });
            setIsSubmitting(false);
            return;
          }

          const textoPersonalizado = mensajePlantilla
            .replace(/{nombre}/g, cliente.nombre)
            .replace(/{dias_sin_comprar}/g, String(cliente.diasSinComprar || 15));

          // Registrar en jev_memory (Regla 6)
          await registrarAccionJev({
            tipo: 'retencion',
            accion: `Campaña WhatsApp de reconquista enviada a ${cliente.nombre}`,
            datos: {
              referenciaId: cliente.id,
              cliente: cliente.nombre,
              telefono: cleanPhone,
              canal: 'whatsapp',
              mensaje: textoPersonalizado,
              resultado: 'enviada',
            },
            origen: 'JevModalReconquista',
            usuario: businessId,
          });

          const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textoPersonalizado)}`;
          window.open(url, '_blank');
          enviadosCount++;
        }

        toast({
          title: '🚀 Campaña de WhatsApp procesada',
          description: `Se abrieron los chats para ${enviadosCount} cliente(s) y se registró en memoria JEV.`,
        });
      } else {
        const fechaHoraProgramada = `${fechaProg}T${horaProg}:00`;

        for (const cliente of clientes) {
          const telFinal = telefonosEditados[cliente.id] || (cliente.telefono === 'Sin WhatsApp' ? '' : cliente.telefono);
          
          await registrarAccionJev({
            tipo: 'retencion',
            accion: `Campaña WhatsApp programada para ${cliente.nombre} (${fechaHoraProgramada})`,
            datos: {
              referenciaId: cliente.id,
              cliente: cliente.nombre,
              telefono: telFinal,
              canal: 'whatsapp',
              mensaje: mensajePlantilla,
              estadoProgramacion: 'programada',
              fechaProgramada: fechaHoraProgramada,
              resultado: 'programada',
            },
            origen: 'JevModalReconquista',
            usuario: businessId,
          });
        }

        toast({
          title: '📅 Campaña programada con éxito',
          description: `Se programó el envío para ${clientes.length} cliente(s) el ${fechaProg} a las ${horaProg}.`,
        });
      }

      onClose();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error en el envío',
        description: e.message || 'No se pudo completar la acción.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-6 rounded-3xl bg-white shadow-2xl border-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Envío de Reconquista por WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Campaña automatizada asistida por JEV AI para recuperar clientes inactivos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* a) Lista de Destinatarios y soporte para completar teléfonos "Sin WhatsApp" */}
          <div className="space-y-2">
            <Label className="font-bold uppercase text-[10px] text-muted-foreground">
              Destinatarios Seleccionados ({clientes.length})
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-2xl border">
              {clientes.map((c) => {
                const necesitaTelefono = c.telefono === 'Sin WhatsApp';
                const currentTelVal = telefonosEditados[c.id] !== undefined ? telefonosEditados[c.id] : (necesitaTelefono ? '' : c.telefono);

                return (
                  <div key={c.id} className="p-2.5 bg-white rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-gray-900 block">{c.nombre}</span>
                      <span className="text-[10px] text-muted-foreground">Gasto: ${c.gastoHistorico.toLocaleString('es-CO')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {necesitaTelefono ? (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                          <Input
                            placeholder="Ingresar WhatsApp (ej. 3001234567)"
                            value={currentTelVal}
                            onChange={(e) => handleTelefonoChange(c.id, e.target.value)}
                            className="h-8 text-xs w-48 font-mono"
                          />
                        </div>
                      ) : (
                        <Badge variant="outline" className="font-mono text-[10px] bg-emerald-50 text-emerald-800">
                          {c.telefono}
                        </Badge>
                      )}

                      <button
                        type="button"
                        onClick={() => onRemoveCliente(c.id)}
                        className="rounded-full hover:bg-gray-100 p-1 text-gray-400 hover:text-red-600"
                        title="Quitar destinatario"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* b) Canal (Fijo WhatsApp) */}
          <div className="space-y-1.5">
            <Label className="font-bold uppercase text-[10px] text-muted-foreground">Canal de Envío</Label>
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 font-bold">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Directo / API</span>
            </div>
          </div>

          {/* c) Editor de mensaje con variables */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-bold uppercase text-[10px] text-muted-foreground">Mensaje Personalizado</Label>
              <span className="text-[10px] text-muted-foreground italic">Usa &#123;nombre&#125; y &#123;dias_sin_comprar&#125;</span>
            </div>
            <Textarea
              rows={4}
              value={mensajePlantilla}
              onChange={(e) => setMensajePlantilla(e.target.value)}
              className="text-xs leading-relaxed"
            />
            {/* Vista previa en vivo */}
            <div className="p-3 bg-gray-50 border rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Vista previa para {clientePreview.nombre}:</span>
              <p className="text-gray-800 italic leading-snug">&quot;{mensajePreview}&quot;</p>
            </div>
          </div>

          {/* d) Modo de envío */}
          <div className="space-y-2 pt-1 border-t">
            <Label className="font-bold uppercase text-[10px] text-muted-foreground">Modo de Envío</Label>
            <RadioGroup value={modoEnvio} onValueChange={(v: any) => setModoEnvio(v)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ahora" id="r-ahora" />
                <Label htmlFor="r-ahora" className="font-medium cursor-pointer">Enviar ahora</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="programar" id="r-prog" />
                <Label htmlFor="r-prog" className="font-medium cursor-pointer">Programar envío</Label>
              </div>
            </RadioGroup>

            {modoEnvio === 'programar' && (
              <div className="grid grid-cols-2 gap-3 pt-2 animate-in fade-in">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fecha</Label>
                  <Input
                    type="date"
                    value={fechaProg}
                    onChange={(e) => setFechaProg(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Hora</Label>
                  <Input
                    type="time"
                    value={horaProg}
                    onChange={(e) => setHoraProg(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleConfirmar}
            disabled={isSubmitting || clientes.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{modoEnvio === 'ahora' ? `Enviar a seleccionados (${clientes.length})` : 'Confirmar Programación'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
