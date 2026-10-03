'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface JevModalEliminarClientesProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  count: number;
  isDeleting: boolean;
}

export function JevModalEliminarClientes({
  isOpen,
  onClose,
  onConfirm,
  count,
  isDeleting,
}: JevModalEliminarClientesProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-white shadow-2xl border-0">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-2">
            <Trash2 className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-black text-gray-900">
            ¿Eliminar {count} contacto(s)?
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-600">
            ¿Estás seguro de eliminar <span className="font-bold text-gray-900">{count}</span> contacto(s)? Esta acción no se puede deshacer y se borrarán permanentemente de tu base de clientes.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isDeleting} className="text-xs font-bold">
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Sí, eliminar definitivamente</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
