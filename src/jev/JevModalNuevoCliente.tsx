'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Loader2, AlertTriangle } from 'lucide-react';
import { guardarClienteManual } from './jevEngineClientesNuevos';
import { useToast } from '@/hooks/use-toast';

interface JevModalNuevoClienteProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  onSuccess: () => void;
}

export function JevModalNuevoCliente({ isOpen, onClose, businessId, onSuccess }: JevModalNuevoClienteProps) {
  const { toast } = useToast();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const isValid = nombre.trim().length > 0 && telefono.trim().length >= 7;

  const handleGuardar = async (forzar = false) => {
    if (!businessId || !isValid) return;
    setIsSubmitting(true);
    setDuplicateWarning(null);

    try {
      const res = await guardarClienteManual({
        businessId,
        nombre,
        telefono,
        email,
        notas,
        forzarGuardado: forzar,
      });

      if (res.duplicate && !forzar) {
        setDuplicateWarning(res.message || 'Teléfono duplicado.');
        setIsSubmitting(false);
        return;
      }

      toast({
        title: '✅ Cliente registrado',
        description: `Se dio de alta a ${nombre.trim()} correctamente.`,
      });

      setNombre('');
      setTelefono('');
      setEmail('');
      setNotas('');
      onSuccess();
      onClose();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: e.message || 'No se pudo registrar el cliente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-white shadow-2xl border-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Nuevo Cliente (Alta Manual)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Registra un nuevo contacto para incorporarlo a tus campañas de WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-xs">
          <div className="space-y-1">
            <Label className="font-bold uppercase text-[10px] text-muted-foreground">Nombre *</Label>
            <Input
              placeholder="Ej. Ana María Gómez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="font-bold uppercase text-[10px] text-muted-foreground">Teléfono / WhatsApp *</Label>
            <Input
              placeholder="Ej. 3001234567"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="font-bold uppercase text-[10px] text-muted-foreground">Correo Electrónico (Opcional)</Label>
            <Input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="font-bold uppercase text-[10px] text-muted-foreground">Notas (Opcional)</Label>
            <Textarea
              rows={2}
              placeholder="Preferencias o detalles del cliente..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="text-xs"
            />
          </div>

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Teléfono duplicado detectado</span>
              </div>
              <p className="text-[11px]">{duplicateWarning}</p>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setDuplicateWarning(null)} className="h-7 text-xs font-bold">
                  Cancelar
                </Button>
                <Button size="sm" onClick={() => handleGuardar(true)} className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white">
                  Guardar de todos modos
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          {!duplicateWarning && (
            <Button
              onClick={() => handleGuardar(false)}
              disabled={isSubmitting || !isValid}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Guardar Cliente</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
