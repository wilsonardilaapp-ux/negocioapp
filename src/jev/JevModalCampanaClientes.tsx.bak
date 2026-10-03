'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Sparkles, Loader2, X, Tag, Link as LinkIcon, Gift } from 'lucide-react';
import { registrarCampanaClientesEnviada } from './jevEngineClientesNuevos';
import { useToast } from '@/hooks/use-toast';
import type { ContactoJev } from './contextAggregatorClientesNuevos';

interface JevModalCampanaProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  clientes: ContactoJev[];
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

export function JevModalCampanaClientes({
  isOpen,
  onClose,
  businessId,
  clientes,
  onRemoveCliente,
}: JevModalCampanaProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const menuLink = typeof window !== 'undefined' ? `${window.location.origin}/catalog/${businessId}?ref=whatsapp` : '';

  const plantillaOferta = '¡Hola {nombre}! Tenemos una oferta especial disponible por tiempo limitado en nuestro catálogo. ¡No te la pierdas! Descúbrela aquí: {{link_menu}}';
  const plantillaCupon = '¡Hola {nombre}! Queremos regalarte un cupón exclusivo de descuento para tu próxima compra en nuestro negocio. Visita nuestro catálogo: {{link_menu}}';
  const plantillaMenu = '¡Hola {nombre}! Te invitamos a conocer nuestro menú digital actualizado con todos nuestros productos y especialidades: {{link_menu}}';

  const [mensajePlantilla, setMensajePlantilla] = useState(plantillaOferta);
  const [plantillaActiva, setPlantillaActiva] = useState<'oferta' | 'cupon' | 'menu'>('oferta');

  const clientePreview = clientes[0] || { nombre: 'Cliente Ejemplo', telefono: '3000000000' };
  const mensajePreview = mensajePlantilla
    .replace(/{nombre}/g, clientePreview.nombre)
    .replace(/{{link_menu}}/g, menuLink);

  const handleSeleccionarPlantilla = (tipo: 'oferta' | 'cupon' | 'menu') => {
    setPlantillaActiva(tipo);
    if (tipo === 'oferta') setMensajePlantilla(plantillaOferta);
    else if (tipo === 'cupon') setMensajePlantilla(plantillaCupon);
    else if (tipo === 'menu') setMensajePlantilla(plantillaMenu);
  };

  const handleEnviarCampana = async () => {
    if (!businessId || clientes.length === 0) return;
    setIsSubmitting(true);

    try {
      let enviadosCount = 0;

      for (const cliente of clientes) {
        if (!cliente.tieneWhatsApp) continue;

        const textoFinal = mensajePlantilla
          .replace(/{nombre}/g, cliente.nombre)
          .replace(/{{link_menu}}/g, menuLink);

        const cleanPhone = formatPhoneForWhatsApp(cliente.telefono);
        if (cleanPhone) {
          const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textoFinal)}`;
          window.open(url, '_blank');
          enviadosCount++;
        }
      }

      // Registrar en jev_memory (Regla 6)
      await registrarCampanaClientesEnviada({
        businessId,
        destinatariosCount: enviadosCount,
        plantillaUsada: plantillaActiva,
      });

      toast({
        title: '🚀 Campaña de WhatsApp procesada',
        description: `Se abrieron los chats para ${enviadosCount} contacto(s) con la infraestructura JEV.`,
      });

      onClose();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error en el envío',
        description: e.message || 'No se pudo procesar la campaña.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar solo los que tienen WhatsApp para el contador del botón
  const validosCount = clientes.filter(c => c.tieneWhatsApp).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-6 rounded-3xl bg-white shadow-2xl border-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Campaña WhatsApp — Clientes Nuevos
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Envío asistido con plantillas y enlace automático al Menú Público.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Destinatarios */}
          <div className="space-y-1.5">
            <Label className="font-bold uppercase text-[10px] text-muted-foreground">
              Destinatarios Válidos ({validosCount} de {clientes.length} seleccionados)
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-xl border">
              {clientes.map((c) => (
                <Badge key={c.id} variant="secondary" className={`gap-1 pl-2.5 pr-1 py-1 bg-white border shadow-2xs ${!c.tieneWhatsApp ? 'opacity-50 line-through' : ''}`}>
                  <span>{c.nombre}</span>
                  <span className="text-[10px] text-muted-foreground">({c.telefono})</span>
                  {!c.tieneWhatsApp && <span className="text-amber-700 text-[9px] font-bold">⚠️ Sin WhatsApp</span>}
                  <button
                    type="button"
                    onClick={() => onRemoveCliente(c.id)}
                    className="rounded-full hover:bg-gray-200 p-0.5 ml-1 text-gray-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Plantillas rápidas */}
          <div className="space-y-1.5">
            <Label className="font-bold uppercase text-[10px] text-muted-foreground">Plantillas Rápidas</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={plantillaActiva === 'oferta' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSeleccionarPlantilla('oferta')}
                className="text-xs font-bold gap-1 h-9"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Oferta</span>
              </Button>
              <Button
                type="button"
                variant={plantillaActiva === 'cupon' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSeleccionarPlantilla('cupon')}
                className="text-xs font-bold gap-1 h-9"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Cupón</span>
              </Button>
              <Button
                type="button"
                variant={plantillaActiva === 'menu' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSeleccionarPlantilla('menu')}
                className="text-xs font-bold gap-1 h-9"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Menú Público</span>
              </Button>
            </div>
          </div>

          {/* Editor de mensaje con variables */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-bold uppercase text-[10px] text-muted-foreground">Mensaje Editable</Label>
              <span className="text-[10px] text-muted-foreground italic">Variables: &#123;nombre&#125; y &#123;&#123;link_menu&#125;&#125;</span>
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
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleEnviarCampana}
            disabled={isSubmitting || validosCount === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Confirmar Envío a {validosCount} contacto(s)</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
